const { z } = require('zod');
const { SKILL_LEVELS } = require('../../common/constants/skillLevel');

const imageString = z.string().refine((value) => /^(https?:\/\/|data:image\/)/.test(value), {
  message: 'Invalid image URL',
});

const createPlayerSchema = z.object({
  body: z.object({
    userId: z.string().optional().nullable(),
    playerCode: z.string().min(3).max(40).optional(),
    displayName: z.string().min(2).max(120),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(8).max(20).optional().nullable(),
    avatarUrl: imageString.optional().nullable(),
    dateOfBirth: z.coerce.date().optional().nullable(),
    gender: z.enum(['male', 'female', 'other']).optional().nullable(),
    club: z.string().max(120).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    skillLevel: z.enum(SKILL_LEVELS).optional(),
    status: z.enum(['active', 'inactive', 'banned']).optional(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const bulkCreatePlayersSchema = z.object({
  body: z.object({
    players: z.array(z.object({
      displayName: z.string().min(2).max(120),
      email: z.string().email().optional().nullable(),
      phone: z.string().min(8).max(20).optional().nullable(),
      avatarUrl: imageString.optional().nullable(),
      gender: z.enum(['male', 'female', 'other']).optional().nullable(),
      club: z.string().max(120).optional().nullable(),
      city: z.string().max(120).optional().nullable(),
      skillLevel: z.enum(SKILL_LEVELS).optional(),
      status: z.enum(['active', 'inactive', 'banned']).optional(),
    })).min(1).max(200),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const listPlayersSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    keyword: z.string().optional(),
    club: z.string().optional(),
    city: z.string().optional(),
    status: z.enum(['active', 'inactive', 'banned']).optional(),
    participated: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
  }).passthrough(),
});

const playerIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const deletePlayerSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const updatePlayerSchema = z.object({
  body: z.object({
    displayName: z.string().min(2).max(120).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(8).max(20).optional().nullable(),
    avatarUrl: imageString.optional().nullable(),
    dateOfBirth: z.coerce.date().optional().nullable(),
    gender: z.enum(['male', 'female', 'other']).optional().nullable(),
    club: z.string().max(120).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    skillLevel: z.enum(SKILL_LEVELS).optional(),
    status: z.enum(['active', 'inactive', 'banned']).optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const updateMyPlayerSchema = z.object({
  body: z.object({
    displayName: z.string().min(2).max(120).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(8).max(20).optional().nullable(),
    avatarUrl: imageString.optional().nullable(),
    dateOfBirth: z.coerce.date().optional().nullable(),
    gender: z.enum(['male', 'female', 'other']).optional().nullable(),
    club: z.string().max(120).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    skillLevel: z.enum(SKILL_LEVELS).optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

module.exports = {
  createPlayerSchema,
  bulkCreatePlayersSchema,
  listPlayersSchema,
  playerIdParamSchema,
  deletePlayerSchema,
  updatePlayerSchema,
  updateMyPlayerSchema,
};
