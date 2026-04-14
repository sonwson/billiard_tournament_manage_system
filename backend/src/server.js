const app = require('./app');
const cors = require('cors');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDatabase } = require('./config/db');
app.use(cors());
async function bootstrap() {
  try {
    await connectDatabase();
    app.listen(env.port, () => {
      logger.info(`${env.appName} listening on port ${env.port}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start application');
    process.exit(1);
  }
}

bootstrap();
