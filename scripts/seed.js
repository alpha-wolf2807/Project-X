/**
 * PROJECT-X — Database Seed Script
 *
 * Usage: node scripts/seed.js
 * Creates: admin user, sample categories, zones, sample products
 *
 * WARNING: Only run on empty DB or development!
 */

require('dotenv').config({ path: '../backend/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Minimal inline models for seeding
const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
};

const userSchema = new mongoose.Schema({
  name: String, email: String, phone: String, password: String,
  role: String, isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: true },
  isPhoneVerified: { type: Boolean, default: true },
  referralCode: String,
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  name: String, slug: String, icon: String,
  isActive: { type: Boolean, default: true }, sortOrder: Number, productCount: { type: Number, default: 0 },
}, { timestamps: true });

const zoneSchema = new mongoose.Schema({
  name: String, code: String, hostels: [String], isActive: { type: Boolean, default: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: String, slug: String, description: String, brand: String,
  mrp: Number, price: Number, costPrice: Number, stock: Number,
  category: mongoose.Schema.Types.ObjectId, isActive: { type: Boolean, default: true },
  images: [{ url: String, isPrimary: Boolean }],
  ratings: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
  analytics: { viewCount: Number, cartAddCount: Number, orderCount: Number, revenue: Number },
  isFeatured: Boolean, isNewArrival: Boolean,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Zone = mongoose.models.Zone || mongoose.model('Zone', zoneSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const seed = async () => {
  await connectDB();

  console.log('\n🌱 Starting database seed...\n');

  // ── Admin User ───────────────────────────────────────────────
  const existingAdmin = await User.findOne({ email: 'admin@projectx.com' });
  let adminUser;
  const adminPassword = 'Admin@1234';
  const adminPayload = {
    name: 'Super Admin',
    email: 'admin@projectx.com',
    phone: '9000000001',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    referralCode: 'ADMIN001',
  };

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    adminUser = await User.create({ ...adminPayload, password: hashedPassword });
    console.log('✅ Admin created: admin@projectx.com / Admin@1234');
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await User.updateOne(
      { _id: existingAdmin._id },
      { $set: { ...adminPayload, password: hashedPassword } }
    );
    adminUser = await User.findById(existingAdmin._id);
    console.log('✅ Admin exists — password reset to: admin@projectx.com / Admin@1234');
  }

  // ── Support User ─────────────────────────────────────────────
  const existingSupport = await User.findOne({ email: 'support@projectx.com' });
  if (!existingSupport) {
    const hashedPassword = await bcrypt.hash('Support@1234', 12);
    await User.create({
      name: 'Support Agent 1',
      email: 'support@projectx.com',
      phone: '9000000002',
      password: hashedPassword,
      role: 'support',
      referralCode: 'SUPP001',
    });
    console.log('✅ Support user created: support@projectx.com / Support@1234');
  }

  // ── Sample Distributor ────────────────────────────────────────
  const existingDist = await User.findOne({ email: 'distributor@projectx.com' });
  let distributor;
  if (!existingDist) {
    const hashedPassword = await bcrypt.hash('Distrib@1234', 12);
    distributor = await User.create({
      name: 'Ramesh Kumar (Distributor)',
      email: 'distributor@projectx.com',
      phone: '9000000003',
      password: hashedPassword,
      role: 'distributor',
      referralCode: 'DIST001',
    });
    console.log('✅ Distributor created: distributor@projectx.com / Distrib@1234');
  } else {
    distributor = existingDist;
  }

  // ── Sample Delivery Dude ──────────────────────────────────────
  const existingDelivery = await User.findOne({ email: 'delivery@projectx.com' });
  if (!existingDelivery) {
    const hashedPassword = await bcrypt.hash('Delivery@1234', 12);
    await User.create({
      name: 'Suresh Yadav (Delivery)',
      email: 'delivery@projectx.com',
      phone: '9000000004',
      password: hashedPassword,
      role: 'delivery',
      referralCode: 'DELV001',
    });
    console.log('✅ Delivery dude created: delivery@projectx.com / Delivery@1234');
  }

  // ── Sample Customer ───────────────────────────────────────────
  const existingCustomer = await User.findOne({ email: 'customer@projectx.com' });
  if (!existingCustomer) {
    const hashedPassword = await bcrypt.hash('Customer@1234', 12);
    await User.create({
      name: 'Arjun Sharma (Customer)',
      email: 'customer@projectx.com',
      phone: '9000000005',
      password: hashedPassword,
      role: 'customer',
      referralCode: 'CUST001',
    });
    console.log('✅ Customer created: customer@projectx.com / Customer@1234');
  }

  // ── Categories ────────────────────────────────────────────────
  const categoriesExist = await Category.countDocuments();
  let categoryMap = {};

  if (!categoriesExist) {
    const categories = [
      { name: 'Snacks', slug: 'snacks', icon: '🍿', sortOrder: 1 },
      { name: 'Beverages', slug: 'beverages', icon: '🥤', sortOrder: 2 },
      { name: 'Instant Food', slug: 'instant-food', icon: '🍜', sortOrder: 3 },
      { name: 'Personal Care', slug: 'personal-care', icon: '🧴', sortOrder: 4 },
      { name: 'Stationery', slug: 'stationery', icon: '✏️', sortOrder: 5 },
      { name: 'Groceries', slug: 'groceries', icon: '🛒', sortOrder: 6 },
      { name: 'Electronics', slug: 'electronics', icon: '🔌', sortOrder: 7 },
      { name: 'Medicine', slug: 'medicine', icon: '💊', sortOrder: 8 },
    ];

    const createdCats = await Category.insertMany(categories);
    createdCats.forEach(c => categoryMap[c.slug] = c._id);
    console.log(`✅ ${createdCats.length} categories created`);
  } else {
    const cats = await Category.find();
    cats.forEach(c => categoryMap[c.slug] = c._id);
    console.log(`⚠️  Categories already exist (${categoriesExist}) — skipping`);
  }

  // ── Zones ─────────────────────────────────────────────────────
  const zonesExist = await Zone.countDocuments();
  let zoneId;

  if (!zonesExist) {
    const zone = await Zone.create({
      name: 'Main Campus',
      code: 'MC',
      hostels: [
        'Boys Hostel Block A',
        'Boys Hostel Block B',
        'Girls Hostel Block A',
        'Girls Hostel Block B',
        'PG Hostel',
        'International Hostel',
      ],
      isActive: true,
    });
    zoneId = zone._id;

    // Assign distributor to zone
    await mongoose.model('Zone').findByIdAndUpdate(zoneId, { distributor: distributor._id }).catch(() => {});
    console.log('✅ Main Campus zone created with 6 hostels');
  } else {
    const zone = await Zone.findOne();
    zoneId = zone._id;
    console.log('⚠️  Zones already exist — skipping');
  }

  // ── Sample Products ───────────────────────────────────────────
  const productsExist = await Product.countDocuments();

  if (!productsExist && Object.keys(categoryMap).length > 0) {
    const products = [
      // Snacks
      {
        name: "Lay's Classic Salted Chips 26g",
        slug: 'lays-classic-salted-26g',
        description: "The original lightly salted potato chips. Crispy, crunchy and irresistible. Perfect hostel snack.",
        brand: "Lay's",
        mrp: 20, price: 18, costPrice: 14, stock: 100,
        category: categoryMap['snacks'],
        isFeatured: true, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=Lays', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      {
        name: "Kurkure Masala Munch 90g",
        slug: 'kurkure-masala-munch-90g',
        description: "Spicy and crunchy corn puffs with a tangy masala twist. A hostel favourite!",
        brand: "Kurkure",
        mrp: 25, price: 22, costPrice: 17, stock: 80,
        category: categoryMap['snacks'],
        isFeatured: true, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=Kurkure', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      {
        name: "Parle-G Original Biscuits 400g",
        slug: 'parle-g-original-400g',
        description: "India's most loved biscuit. Glucose-enriched, perfect with tea or milk.",
        brand: "Parle",
        mrp: 40, price: 36, costPrice: 28, stock: 150,
        category: categoryMap['snacks'],
        isFeatured: false, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=ParleG', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      // Beverages
      {
        name: "Thums Up 750ml",
        slug: 'thums-up-750ml',
        description: "Strong, bold taste. India's #1 cola. Chilled and refreshing.",
        brand: "Coca-Cola",
        mrp: 40, price: 36, costPrice: 28, stock: 60,
        category: categoryMap['beverages'],
        isFeatured: false, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=ThumsUp', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      {
        name: "Red Bull Energy Drink 250ml",
        slug: 'red-bull-250ml',
        description: "Red Bull gives you wings! Perfect for late-night study sessions.",
        brand: "Red Bull",
        mrp: 125, price: 110, costPrice: 90, stock: 40,
        category: categoryMap['beverages'],
        isFeatured: true, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=RedBull', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      // Instant Food
      {
        name: "Maggi 2-Minute Noodles (Pack of 8)",
        slug: 'maggi-2min-noodles-pack-8',
        description: "The original comfort food. 8 pack of Masala flavoured instant noodles. Ready in 2 minutes!",
        brand: "Nestlé",
        mrp: 100, price: 88, costPrice: 72, stock: 120,
        category: categoryMap['instant-food'],
        isFeatured: true, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=Maggi', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      {
        name: "Wai Wai Noodles Chicken Flavour 70g",
        slug: 'wai-wai-chicken-70g',
        description: "Crispy noodles you can eat dry or cook! Spicy chicken flavour.",
        brand: "Wai Wai",
        mrp: 15, price: 13, costPrice: 10, stock: 200,
        category: categoryMap['instant-food'],
        isFeatured: false, isNewArrival: true,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=WaiWai', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      // Personal Care
      {
        name: "Dove Men+Care Soap 100g",
        slug: 'dove-men-care-soap-100g',
        description: "Moisturising bath soap for men. Dermatologist-tested, gentle on skin.",
        brand: "Dove",
        mrp: 55, price: 48, costPrice: 38, stock: 75,
        category: categoryMap['personal-care'],
        isFeatured: false, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=Dove', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      {
        name: "Colgate Strong Teeth Toothpaste 300g",
        slug: 'colgate-strong-teeth-300g',
        description: "Daily fluoride toothpaste for strong teeth and fresh breath.",
        brand: "Colgate",
        mrp: 95, price: 84, costPrice: 66, stock: 90,
        category: categoryMap['personal-care'],
        isFeatured: false, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=Colgate', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      // Stationery
      {
        name: "Reynolds 045 Ball Pen (Set of 10)",
        slug: 'reynolds-045-set-10',
        description: "Smooth-writing blue ball point pens. The hostel essential for exams and notes.",
        brand: "Reynolds",
        mrp: 50, price: 44, costPrice: 34, stock: 200,
        category: categoryMap['stationery'],
        isFeatured: false, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=Reynolds', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      // Electronics
      {
        name: "Mi 20000mAh Power Bank",
        slug: 'mi-20000mah-power-bank',
        description: "High capacity dual USB port power bank. Fast charging support. Never run out of battery.",
        brand: "Xiaomi",
        mrp: 1299, price: 1149, costPrice: 950, stock: 25,
        category: categoryMap['electronics'],
        isFeatured: true, isNewArrival: true,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=PowerBank', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
      // Medicine
      {
        name: "Dolo 650 Tablets (Strip of 15)",
        slug: 'dolo-650-strip-15',
        description: "Paracetamol 650mg tablets for fever and mild pain relief.",
        brand: "Micro Labs",
        mrp: 30, price: 27, costPrice: 20, stock: 100,
        category: categoryMap['medicine'],
        isFeatured: false, isNewArrival: false,
        images: [{ url: 'https://via.placeholder.com/400x400/1a1a1a/f97316?text=Dolo650', isPrimary: true }],
        analytics: { viewCount: 0, cartAddCount: 0, orderCount: 0, revenue: 0 },
      },
    ];

    const created = await Product.insertMany(products);

    // Update category product counts
    for (const [slug, catId] of Object.entries(categoryMap)) {
      const count = products.filter(p => p.category?.toString() === catId?.toString()).length;
      if (count > 0) await Category.findByIdAndUpdate(catId, { productCount: count });
    }

    console.log(`✅ ${created.length} products created`);
  } else {
    console.log(`⚠️  Products already exist (${productsExist}) — skipping`);
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seed complete! Login credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:        admin@projectx.com     / Admin@1234');
  console.log('Support:      support@projectx.com   / Support@1234');
  console.log('Distributor:  distributor@projectx.com / Distrib@1234');
  console.log('Delivery:     delivery@projectx.com  / Delivery@1234');
  console.log('Customer:     customer@projectx.com  / Customer@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
