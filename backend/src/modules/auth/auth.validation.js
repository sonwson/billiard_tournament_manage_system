const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().min(8).max(20).optional(),
    password: z.string().min(6).max(128),
    club: z.string().max(120).optional(),
    city: z.string().max(120).optional(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const loginSchema = z.object({
  body: z.object({
    emailOrPhone: z.string().min(3),
    password: z.string().min(6).max(128),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    verificationCode: z.string().length(6),
    newPassword: z.string().min(6).max(128),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  logoutSchema: refreshSchema,
};
