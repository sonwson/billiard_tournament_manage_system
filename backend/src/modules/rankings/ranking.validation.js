const { z } = require('zod');

const listRankingsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    seasonKey: z.string().optional(),
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
  }).passthrough(),
});

const rankingDetailSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    playerId: z.string().min(1),
  }),
  query: z.object({
    seasonKey: z.string().optional(),
  }).passthrough(),
});

const rankingHistorySchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    playerId: z.string().min(1),
    seasonKey: z.string().optional(),
  }).passthrough(),
});

module.exports = {
  listRankingsSchema,
  rankingDetailSchema,
  rankingHistorySchema,
};
