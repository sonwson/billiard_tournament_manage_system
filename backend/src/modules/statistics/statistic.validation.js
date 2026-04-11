const { z } = require('zod');

const dashboardSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  }).passthrough(),
});

const detailSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

module.exports = {
  dashboardSchema,
  detailSchema,
};
