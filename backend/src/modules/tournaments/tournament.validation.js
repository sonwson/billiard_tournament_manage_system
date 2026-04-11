const { z } = require('zod');

const imageString = z.string().refine((value) => /^(https?:\/\/|data:image\/|\/)/.test(value), {
  message: 'Invalid image URL',
});

const prizeItem = z.object({
  position: z.number().int().positive(),
  label: z.string().min(1),
  rewardType: z.enum(['cash', 'gift', 'point']).optional(),
  payoutCount: z.number().int().min(1).optional(),
  amount: z.number().nonnegative().optional(),
  note: z.string().optional(),
});

const raceToRuleItem = z.object({
  roundNumber: z.number().int().min(1),
  raceTo: z.number().int().min(1).max(25),
});

const drawSizeValue = z.union([
  z.literal(128),
  z.literal(64),
  z.literal(32),
  z.literal(16),
  z.literal(8),
])

const bracketSettings = z.object({
  knockoutStartSize: drawSizeValue.optional().nullable(),
  drawSize: drawSizeValue.optional().nullable(),
}).transform((value) => ({
  knockoutStartSize: value.knockoutStartSize ?? value.drawSize ?? null,
}));

const tournamentBodyShape = {
  name: z.string().min(3).max(180),
  description: z.string().optional(),
  image: imageString.optional().nullable(),
  gameType: z.enum(['pool_8', 'pool_9', 'pool_10', 'carom', 'snooker']),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'group_knockout']).optional(),
  eventType: z.enum(['ranking', 'open', 'invitational', 'qualifier']).optional(),
  tier: z.enum(['local', 'monthly', 'major']).optional(),
  venue: z.object({
    name: z.string().min(2),
    address: z.string().optional(),
    city: z.string().optional(),
  }),
  entryFee: z.number().nonnegative().optional(),
  prizeFund: z.number().nonnegative().optional(),
  prizeStructure: z.array(prizeItem).optional(),
  raceToRules: z.array(raceToRuleItem).optional(),
  bracketSettings: bracketSettings.optional(),
  tableCount: z.number().int().min(0).optional(),
  tvTableCount: z.number().int().min(0).optional(),
  maxPlayers: z.number().int().min(2),
  registrationOpenAt: z.coerce.date(),
  registrationCloseAt: z.coerce.date(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
  status: z.enum(['draft', 'open_registration', 'closed_registration', 'ongoing', 'finished']).optional(),
  ownerAdminId: z.string().optional(),
  managerAdminIds: z.array(z.string()).optional(),
};

const createTournamentSchema = z.object({
  body: z.object(tournamentBodyShape),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const updateTournamentSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(180).optional(),
    description: z.string().optional(),
    image: imageString.optional().nullable(),
    gameType: z.enum(['pool_8', 'pool_9', 'pool_10', 'carom', 'snooker']).optional(),
    format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'group_knockout']).optional(),
    eventType: z.enum(['ranking', 'open', 'invitational', 'qualifier']).optional(),
    tier: z.enum(['local', 'monthly', 'major']).optional(),
    venue: z.object({
      name: z.string().min(2),
      address: z.string().optional(),
      city: z.string().optional(),
    }).optional(),
    entryFee: z.number().nonnegative().optional(),
    prizeFund: z.number().nonnegative().optional(),
    prizeStructure: z.array(prizeItem).optional(),
    raceToRules: z.array(raceToRuleItem).optional(),
    bracketSettings: bracketSettings.optional(),
    tableCount: z.number().int().min(0).optional(),
    tvTableCount: z.number().int().min(0).optional(),
    maxPlayers: z.number().int().min(2).optional(),
    registrationOpenAt: z.coerce.date().optional(),
    registrationCloseAt: z.coerce.date().optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional().nullable(),
    ownerAdminId: z.string().optional().nullable(),
    managerAdminIds: z.array(z.string()).optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const listTournamentsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    status: z.enum(['draft', 'open_registration', 'closed_registration', 'ongoing', 'finished']).optional(),
    gameType: z.enum(['pool_8', 'pool_9', 'pool_10', 'carom', 'snooker']).optional(),
    city: z.string().optional(),
    minPrizeFund: z.coerce.number().nonnegative().optional(),
    maxPrizeFund: z.coerce.number().nonnegative().optional(),
    minChampionPrize: z.coerce.number().nonnegative().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    keyword: z.string().optional(),
  }).passthrough(),
});

const tournamentIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const updateTournamentStatusSchema = z.object({
  body: z.object({
    status: z.enum(['draft', 'open_registration', 'closed_registration', 'ongoing', 'finished']),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const generateBracketSchema = z.object({
  body: z.object({
    seedingMode: z.enum(['ranking', 'random']).optional(),
    raceTo: z.number().int().min(1).max(25).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

module.exports = {
  createTournamentSchema,
  updateTournamentSchema,
  listTournamentsSchema,
  tournamentIdParamSchema,
  updateTournamentStatusSchema,
  generateBracketSchema,
};
