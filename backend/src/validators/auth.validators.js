const { z } = require('zod');

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(9, 'Password must be more than 8 characters (minimum 9 characters)')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Invalid email address');

const fullNameSchema = z
  .string({ required_error: 'Full name is required' })
  .trim()
  .min(1, 'Full name cannot be empty');

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: fullNameSchema,
  // Client-supplied role is deliberately ignored; registration is ALWAYS customer
  role: z.any().optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const staffSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: fullNameSchema,
});

module.exports = {
  passwordSchema,
  emailSchema,
  fullNameSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  staffSchema,
};
