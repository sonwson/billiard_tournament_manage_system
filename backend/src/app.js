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

// --- 1. Cấu hình CORS (Chỉ dùng 1 cái duy nhất và đặt lên đầu) ---
app.use(cors({
  origin: true, // Tự động cho phép mọi nguồn (rất tốt để test trên IP/AWS)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// --- 2. Cấu hình bảo mật và tối ưu ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Cho phép fetch từ origin khác
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// --- 3. Middlewares hỗ trợ ---
app.use(requestContextMiddleware);
app.use(pinoHttp({ logger }));
app.use(morgan('dev'));

// --- 4. Routes cơ bản ---
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

// --- 5. Đăng ký Routes chính (Prefix thường là /api/v1) ---
app.use(env.apiPrefix, routes);

// --- 6. Xử lý lỗi (Luôn đặt ở cuối cùng) ---
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;