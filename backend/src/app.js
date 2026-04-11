const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const requestContextMiddleware = require('./middlewares/requestContext.middleware');
const notFoundMiddleware = require('./middlewares/notFound.middleware');
const errorMiddleware = require('./middlewares/error.middleware');
const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestContextMiddleware);
app.use(pinoHttp({ logger }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: env.appName,
      status: 'ok',
    },
  });
});

app.get('/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: `${env.appName} Docs`,
}));

app.use(env.apiPrefix, routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
