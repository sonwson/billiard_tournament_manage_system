const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

function assertMongoConfiguration() {
  const rawMongoUri = process.env.MONGO_URI || '';

  if (env.nodeEnv === 'production' && !rawMongoUri) {
    throw new Error('MONGO_URI is missing in production environment. Set it in Render Environment variables.');
  }

  if (env.nodeEnv === 'production' && env.mongoUri === 'mongodb://127.0.0.1:27017/billiards_tournament') {
    throw new Error('Production is still using the local MongoDB fallback URI. Add a real MongoDB Atlas MONGO_URI in Render.');
  }
}

async function connectDatabase() {
  mongoose.set('strictQuery', true);
  assertMongoConfiguration();
  await mongoose.connect(env.mongoUri);
  logger.info({ mongoHost: mongoose.connection.host, databaseName: mongoose.connection.name }, 'MongoDB connected');
}

module.exports = {
  connectDatabase,
  mongoose,
};