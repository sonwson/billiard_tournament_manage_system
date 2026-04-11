const mongoose = require('mongoose');
const env = require('../config/env');

async function fixPhoneIndex() {
  await mongoose.connect(env.mongoUri);

  const db = mongoose.connection.db;
  const collection = db.collection('users');

  // Drop the existing phone index
  try {
    await collection.dropIndex('phone_1');
    console.log('Dropped phone_1 index');
  } catch {
    console.log('Index phone_1 not found or already dropped');
  }

  // Create partial unique index on phone (only for string values)
  await collection.createIndex(
    { phone: 1 },
    {
      unique: true,
      partialFilterExpression: { phone: { $type: 'string' } }
    }
  );
  console.log('Created partial unique index on phone (only for strings)');

  await mongoose.disconnect();
}

fixPhoneIndex().catch(console.error);
