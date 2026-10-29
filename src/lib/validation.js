import { z } from 'zod';

// const allowedText = /^[\p{L}\p{M}\p{N} .,'’()&+\\-/!?\n\r]*$/u;
const allowedText = /^[\p{L}\p{M}\p{N} .,'’()&+\/!?\n\r-]*$/u;
const safe = (max) => z.string().trim().max(max).refine(
  value => allowedText.test(value),
  'Use ordinary text without markup or special characters.'
);
const required = max => safe(max).refine(v => v.length >= 2, 'At least 2 characters required.');

export const waitlistSchema = z.object({
  full_name: required(100),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  company_name: required(120),
  industry: z.enum(['Healthcare', 'Education & Childcare', 'Transportation', 'Other']),
  role: safe(100).default(''),
  company_size: z.enum(['1-50', '51-200', '201-1000', '1000+']),
  message: safe(1000).default(''),
  website: z.string().max(200).default('')
}).strict();
