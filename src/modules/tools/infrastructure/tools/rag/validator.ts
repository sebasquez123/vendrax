import { z } from 'zod';

const SearchKnowledgeResultSchema = z.object({
  rank: z.number(),
  content: z.string(),
  score: z.number().nullable().optional(),
  citation: z.string().nullable().optional(),
  signals: z.object({ strength: z.string().nullable().optional() }).nullable().optional(),
});

export const SearchKnowledgeOutputSchema = z.object({
  query: z.string().nullable().optional(),
  found: z.boolean(),
  verdict: z
    .object({ status: z.string(), reasons: z.array(z.unknown()).nullable().optional() })
    .nullable()
    .optional(),
  message: z.string().nullable().optional(),
  content_is_untrusted: z.boolean().nullable().optional(),
  results: z.array(SearchKnowledgeResultSchema).default([]),
});
export type SearchKnowledgeOutputType = z.infer<typeof SearchKnowledgeOutputSchema>;

export const SearchKnowledgeInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe('The question to look up, in natural language and in the user\'s own terms (e.g. "qué diferencia hay entre métrica y dimensión").'),
});
export type SearchKnowledgeInputType = z.infer<typeof SearchKnowledgeInputSchema>;
