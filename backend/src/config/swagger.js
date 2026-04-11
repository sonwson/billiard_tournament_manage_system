const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: `${env.appName} Documentation`,
      version: '1.0.0',
      description: 'REST API documentation for the billiards tournament management backend.',
    },
    servers: [
      {
        url: `http://localhost:${env.port}${env.apiPrefix}`,
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: { type: 'object', nullable: true },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' },
                details: { type: 'object', nullable: true },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth' },
      { name: 'Tournaments' },
      { name: 'Registrations' },
      { name: 'Matches' },
      { name: 'Players' },
      { name: 'Rankings' },
      { name: 'Statistics' },
    ],
    paths: {
      '/auth/register': {
        post: {
          tags: ['Auth'],
          security: [],
          summary: 'Register a new user and player profile',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['fullName', 'email', 'password'],
                  properties: {
                    fullName: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string' },
                    password: { type: 'string' },
                    club: { type: 'string' },
                    city: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Registered successfully' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          security: [],
          summary: 'Login and receive JWT tokens',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['emailOrPhone', 'password'],
                  properties: {
                    emailOrPhone: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful' },
          },
        },
      },
      '/tournaments': {
        get: {
          tags: ['Tournaments'],
          security: [],
          summary: 'List tournaments',
          responses: { 200: { description: 'Tournament list' } },
        },
        post: {
          tags: ['Tournaments'],
          summary: 'Create tournament',
          responses: { 201: { description: 'Tournament created' } },
        },
      },
      '/tournaments/{id}': {
        get: {
          tags: ['Tournaments'],
          security: [],
          summary: 'Get tournament detail',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Tournament detail' } },
        },
        patch: {
          tags: ['Tournaments'],
          summary: 'Update tournament',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Updated tournament' } },
        },
      },
      '/tournaments/{id}/registrations': {
        get: {
          tags: ['Registrations'],
          summary: 'List registrations for a tournament',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Registrations list' } },
        },
        post: {
          tags: ['Registrations'],
          summary: 'Register player into tournament',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 201: { description: 'Registration created' } },
        },
      },
      '/tournaments/{id}/matches': {
        get: {
          tags: ['Matches'],
          security: [],
          summary: 'List matches by tournament',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Matches list' } },
        },
      },
      '/players': {
        get: {
          tags: ['Players'],
          security: [],
          summary: 'List players',
          responses: { 200: { description: 'Players list' } },
        },
      },
      '/rankings': {
        get: {
          tags: ['Rankings'],
          security: [],
          summary: 'List rankings',
          responses: { 200: { description: 'Rankings list' } },
        },
      },
      '/statistics/dashboard': {
        get: {
          tags: ['Statistics'],
          summary: 'Get admin dashboard summary',
          responses: { 200: { description: 'Dashboard metrics' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
