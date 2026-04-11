const mongoose = require('mongoose');
const env = require('../config/env');

async function fixPlayerUserIdIndex() {
  await mongoose.connect(env.mongoUri);

  const db = mongoose.connection.db;
  const collection = db.collection('players');

  try {
    await collection.dropIndex('userId_1');
    console.log('Dropped old userId_1 index on players');
  } catch {
    console.log('Index userId_1 not found or already dropped on players');
  }

  await collection.createIndex(
    { userId: 1 },
    {
      unique: true,
      partialFilterExpression: { userId: { $type: 'objectId' } },
    },
  );
  console.log('Created partial unique index on players.userId');

  await mongoose.disconnect();
}

fixPlayerUserIdIndex().catch((error) => {
  console.error('Failed to fix players.userId index', error);
  process.exit(1);
});
