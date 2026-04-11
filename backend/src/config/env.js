const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  appName: process.env.APP_NAME || 'Billiards Tournament API',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrl: process.env.CLIENT_URL || '*',
  mongoUri: process.env.MONGO_URI || 'mongodb+srv://sonctb23kh099_db_user:Tuanson1011@cluster0.heewn33.mongodb.net/Simple_Blog?retryWrites=true&w=majority&appName=Clusterr0',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@cuescore.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123456',
  adminName: process.env.ADMIN_NAME || 'CueScore Admin',
  mail: {
    from: process.env.MAIL_FROM || 'no-reply@billiardhub.local',
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

module.exports = env;
