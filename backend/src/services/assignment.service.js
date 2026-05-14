/**
 * PROJECT-X — Assignment Service
 *
 * Smart auto-assignment algorithm:
 * 1. Find distributor for the hostel's zone
 * 2. Find least-busy available delivery dude in that zone
 * 3. Assign and notify via Socket.io
 */

const Order = require('../models/Order');
const User = require('../models/User');
const { Zone } = require('../models/index');
const { notifyUser } = require('../socket');
const { createNotification } = require('./notification.service');
const logger = require('../utils/logger');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildExactMatchRegex = (value) => {
  const normalized = escapeRegex(String(value || '').trim()).replace(/\\\./g, '.?');
  return new RegExp(`^${normalized}$`, 'i');
};

/**
 * Auto-assign distributor and schedule delivery dude
 */
const autoAssignDelivery = async (order) => {
  try {
    const hostelName = order.deliveryAddress.hostelName;
    const locality = order.deliveryAddress.locality;
    const district = order.deliveryAddress.district;

    const conditions = [];
    if (hostelName) conditions.push({ hostels: { $regex: buildExactMatchRegex(hostelName) } });
    if (locality) conditions.push({ localities: { $regex: buildExactMatchRegex(locality) } });
    if (district) conditions.push({ districts: { $regex: buildExactMatchRegex(district) } });

    const zone = conditions.length
      ? await Zone.findOne({ isActive: true, $or: conditions })
      : null;

    if (!zone) {
      logger.warn(`No zone found for hostel/locality/district: ${hostelName || locality || district}`);
      return;
    }

    // 2. Assign distributor for the zone
    if (zone.distributor) {
      order.distributor = zone.distributor;
      order.zone = zone._id;
      order.distributorAssignedAt = new Date();
      order.statusHistory.push({
        status: order.status,
        updatedBy: zone.distributor,
        updatedByRole: 'system',
        note: `Auto-assigned to distributor for zone: ${zone.name}`,
      });

      await order.save();

      // Notify distributor
      await createNotification({
        recipient: zone.distributor,
        type: 'order_confirmed',
        title: '📦 New Order Assigned!',
        body: `Order #${order.orderNumber} from ${hostelName}. ₹${order.pricing.totalAmount}`,
        data: { orderId: order._id },
      });

      notifyUser(zone.distributor.toString(), 'order:new_assignment', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        hostelName,
        amount: order.pricing.totalAmount,
      });

      // 3. Find least-busy delivery dude
      await assignDeliveryDude(order, zone);
    }

  } catch (err) {
    logger.error('Auto-assign failed:', err);
  }
};

/**
 * Find the least-busy available delivery dude in the zone
 */
const assignDeliveryDude = async (order, zone) => {
  // Get active orders count for each delivery dude in this zone
  const deliveryDudeWorkloads = await Order.aggregate([
    {
      $match: {
        deliveryDude: { $in: zone.deliveryDudes },
        status: { $in: ['picked_up', 'out_for_delivery', 'distributor_ordered'] },
      },
    },
    {
      $group: {
        _id: '$deliveryDude',
        activeOrders: { $sum: 1 },
      },
    },
  ]);

  const workloadMap = {};
  deliveryDudeWorkloads.forEach((w) => {
    workloadMap[w._id.toString()] = w.activeOrders;
  });

  // Find the dude with least active orders
  let bestDude = null;
  let minWorkload = Infinity;

  for (const dudeId of zone.deliveryDudes) {
    const workload = workloadMap[dudeId.toString()] || 0;
    const dude = await User.findOne({ _id: dudeId, isActive: true, role: 'delivery' });

    if (dude && !dude.suspension?.isSuspended && workload < minWorkload) {
      minWorkload = workload;
      bestDude = dude;
    }
  }

  if (bestDude) {
    order.deliveryDude = bestDude._id;
    await order.save();

    notifyUser(bestDude._id.toString(), 'order:assigned_to_you', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      hostelName: order.deliveryAddress.hostelName,
      roomNumber: order.deliveryAddress.roomNumber,
    });

    await createNotification({
      recipient: bestDude._id,
      type: 'order_assigned',
      title: '🛵 New Delivery Assigned!',
      body: `Deliver to ${order.deliveryAddress.hostelName}, Room ${order.deliveryAddress.roomNumber}`,
      data: { orderId: order._id },
    });
  }
};

module.exports = { autoAssignDelivery, assignDeliveryDude };
