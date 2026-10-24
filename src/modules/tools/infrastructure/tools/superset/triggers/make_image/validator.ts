import { z } from 'zod';
import { REFERENCE_IMAGES, REFERENCE_IMAGE_IDS } from './references';

const CATALOG = Object.entries(REFERENCE_IMAGES)
  .map(([id, { shows }]) => `'${id}': ${shows}`)
  .join('; ');

export const MakeImageInputSchema = z.object({
  references: z
    .array(z.enum(REFERENCE_IMAGE_IDS))
    .min(1)
    .max(2)
    .describe(`1 or 2 reference images, in the order you mention them in your reply. Each one shows: ${CATALOG}.`),
});

export type MakeImageInputType = z.infer<typeof MakeImageInputSchema>;
