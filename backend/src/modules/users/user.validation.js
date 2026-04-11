const { z } = require('zod');
const { ROLES } = require('../../common/constants/roles');

const roleSchema = z.enum([ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN]);

const listUsersSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    role: roleSchema.optional(),
    status: z.enum(['active', 'inactive', 'blocked']).optional(),
    keyword: z.string().optional(),
  }).passthrough(),
});

const userIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120).optional(),
    role: roleSchema.optional(),
    status: z.enum(['active', 'inactive', 'blocked']).optional(),
    phone: z.string().min(8).max(20).optional().nullable(),
    managedTournamentIds: z.array(z.string()).optional(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const updateMeSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120).optional(),
    phone: z.string().min(8).max(20).optional().nullable(),
  }).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const requestTournamentAdminSchema = z.object({
  body: z.object({
    note: z.string().max(500).optional(),
  }).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const listTournamentAdminRequestsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    keyword: z.string().optional(),
  }).passthrough(),
});

const reviewTournamentAdminRequestSchema = z.object({
  body: z.object({
    action: z.enum(['approve', 'reject']),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(6),
    newPassword: z.string().min(6).max(128),
    confirmPassword: z.string().min(6).max(128),
  }).refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Confirm password does not match',
    path: ['confirmPassword'],
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const listMyMatchesSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    tournamentId: z.string().optional(),
    status: z.enum(['scheduled', 'ready', 'ongoing', 'completed', 'cancelled']).optional(),
  }).passthrough(),
});

module.exports = {
  listUsersSchema,
  userIdParamSchema,
  updateUserSchema,
  updateMeSchema,
  requestTournamentAdminSchema,
  listTournamentAdminRequestsSchema,
  reviewTournamentAdminRequestSchema,
  changePasswordSchema,
  listMyMatchesSchema,
};
