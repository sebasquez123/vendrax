import { z } from 'zod';

export const MakeSuggestionsInputSchema = z.object({
  suggestions: z
    .array(z.string().describe('One short, concrete next step, phrased so the user can pick it directly (e.g. "Agregar el gráfico al dashboard").'))
    .min(1)
    .max(3)
    .describe('1 to 3 options shown to the user as choices.'),
});

export type MakeSuggestionsInputType = z.infer<typeof MakeSuggestionsInputSchema>;
