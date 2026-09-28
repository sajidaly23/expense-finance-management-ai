import { z } from 'zod';
import { ASSET_TYPES, LIABILITY_TYPES, NETWORTH_KINDS } from './networth.model.js';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const createNetWorthSchema = z.object({
  kind: z.enum(NETWORTH_KINDS),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  value: z.coerce.number().positive(),
  asOfDate: dateString,
  notes: z.string().trim().max(400).optional(),
});

export const updateNetWorthSchema = createNetWorthSchema.partial();

export type CreateNetWorthInput = z.infer<typeof createNetWorthSchema>;
export type UpdateNetWorthInput = z.infer<typeof updateNetWorthSchema>;

export { ASSET_TYPES, LIABILITY_TYPES };
