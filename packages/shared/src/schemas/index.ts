import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const splitItemSchema = z.object({
  participantId: z.string().min(1, 'Participant ID is required'),
  shareMinor: z.number().int().nonnegative('Share must be a non-negative integer paise'),
  percentageBps: z.number().int().min(0).max(10000).optional(),
});

export const createTransactionSchema = z
  .object({
    clientId: z.string().uuid('Invalid client UUID'),
    type: z.enum(['personal', 'split', 'i_paid_for_someone', 'someone_paid_for_me']),
    payerType: z.enum(['me', 'person']),
    payerPersonId: z.string().uuid().optional().nullable(),
    totalMinor: z.number().int().positive('Amount must be greater than 0 paise'),
    currency: z.string().length(3).default('INR'),
    categoryId: z.string().min(1, 'Category is required'),
    paymentMethod: z.enum(['cash', 'upi', 'card', 'transfer']),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    note: z.string().max(500, 'Note must not exceed 500 characters').optional().nullable(),
    splitMode: z.enum(['equal', 'exact', 'percentage']).optional().nullable(),
    splits: z.array(splitItemSchema).min(1, 'At least one participant split is required'),
  })
  .refine(
    (data) => {
      const sumSplits = data.splits.reduce((acc, s) => acc + s.shareMinor, 0);
      return sumSplits === data.totalMinor;
    },
    {
      message: 'The sum of all splits must exactly equal the total amount',
      path: ['splits'],
    }
  );

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const createPersonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters').trim(),
  phone: z.string().max(20).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;

export const createSettlementSchema = z.object({
  clientId: z.string().uuid('Invalid client UUID'),
  personId: z.string().uuid('Invalid person UUID'),
  direction: z.enum(['they_paid_me', 'i_paid_them']),
  amountMinor: z.number().int().positive('Settlement amount must be positive paise'),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'transfer']),
  settledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  note: z.string().max(500).optional().nullable(),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;

export const setBudgetSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  limitMinor: z.number().int().positive('Budget limit must be a positive integer in paise'),
});

export type SetBudgetInput = z.infer<typeof setBudgetSchema>;

export const updateSettingsSchema = z.object({
  language: z.enum(['en', 'hi', 'hinglish']).optional(),
  currency: z.string().length(3).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  reminderEnabled: z.boolean().optional(),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits').optional().nullable(),
  pinEnabled: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
