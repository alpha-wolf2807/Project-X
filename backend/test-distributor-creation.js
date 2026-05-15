/**
 * Test script to diagnose and fix distributor creation for Chennai district
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const { District, Zone } = require('./src/models/index');

async function main() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB\n');

    // 1. Check if Chennai district exists
    console.log('📍 Checking Chennai district...');
    const chennaiDistrict = await District.findOne({ name: /^chennai$/i });
    if (!chennaiDistrict) {
      console.log('❌ Chennai district not found. Creating it...');
      const newDistrict = await District.create({
        name: 'Chennai',
        code: 'CHN',
        description: 'Chennai Metropolitan Area'
      });
      console.log('✅ Created Chennai district:', newDistrict._id);
    } else {
      console.log('✅ Chennai district found:', chennaiDistrict._id, '- Name:', chennaiDistrict.name);
    }

    // 2. Check if there's a zone with Chennai
    console.log('\n🗺️  Checking zones with Chennai...');
    const zonesWithChennai = await Zone.find({
      isActive: true,
      districts: { $regex: '^Chennai$', $options: 'i' }
    });

    if (zonesWithChennai.length === 0) {
      console.log('❌ No active zones found with Chennai. Creating a zone...');
      const newZone = await Zone.create({
        name: 'Chennai Zone',
        code: 'CHZ',
        description: 'Chennai and surrounding areas',
        districts: ['Chennai'],
        localities: [],
        isActive: true
      });
      console.log('✅ Created zone:', newZone._id);
      console.log('   Zone name:', newZone.name);
      console.log('   Districts:', newZone.districts);
    } else {
      console.log(`✅ Found ${zonesWithChennai.length} active zone(s) with Chennai:`);
      zonesWithChennai.forEach(z => {
        console.log(`   - ${z.name} (ID: ${z._id})`);
        console.log(`     Districts: ${z.districts.join(', ')}`);
        console.log(`     Localities: ${z.localities.join(', ') || 'none'}`);
      });
    }

    // 3. Create a test distributor for Chennai
    console.log('\n👤 Creating test distributor for Chennai...');
    const existingDistrib = await User.findOne({ email: 'test.distributor@projectx.com' });
    if (existingDistrib) {
      console.log('⚠️  Test distributor already exists, skipping creation.');
    } else {
      const testDistributor = await User.create({
        name: 'Test Distributor',
        email: 'test.distributor@projectx.com',
        phone: '9876543210',
        password: 'TestPass@123', // This will be hashed by the model
        role: 'distributor',
        district: 'Chennai',
        isEmailVerified: true,
        isPhoneVerified: true
      });
      console.log('✅ Created test distributor:', testDistributor._id);
      console.log('   Name:', testDistributor.name);
      console.log('   Email:', testDistributor.email);
      console.log('   District:', testDistributor.district);
    }

    console.log('\n✨ Diagnostics complete! Distributor creation should now work.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
