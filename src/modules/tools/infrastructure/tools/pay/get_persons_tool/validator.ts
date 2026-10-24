import { z } from 'zod';
const WhereFieldSchema = z.enum([
  'ID',
  'NAMES',
  'SURNAMES',
  'FULL_NAME',
  'IS_ACTIVE',
  'PERSON_PROFILE_NAME',
  'IDENTIFICATION_TYPE_NAME',
  'ID_NUMBER',
  'EMAIL',
  'PHONE_NUMBER',
  'USER_NAME',
  'CREATED_BY_NAME',
  'UPDATED_BY_NAME',
]);

const WhereSchema = z.array(
  z.object({
    field: WhereFieldSchema,
    operator: z.enum(['equal', 'notequal']),
    value: z.string(),
  })
);

const SortedSchema = z.array(
  z.object({
    field: WhereFieldSchema,
    direction: z.enum(['ascending', 'descending']),
  })
);

export const GetPersonsInputSchema = z.object({
  routeParamId: z.number(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  search: z.string().optional(),
  where: WhereSchema.optional(),
  sorted: SortedSchema.optional(),
});

const PersonSchema = z.object({
  CREATED_AT: z.string().nullable(),
  UPDATED_AT: z.string().nullable(),
  COUNTRY_CODE_PHONE: z.string().nullable(),
  ID: z.string().nullable(),
  NAMES: z.string().nullable(),
  SURNAMES: z.string().nullable(),
  FULL_NAME: z.string().nullable(),
  IS_ACTIVE: z.number().nullable(),
  PERSON_PROFILE_NAME: z.string().nullable(),
  IDENTIFICATION_TYPE_NAME: z.string().nullable(),
  ID_NUMBER: z.string().nullable(),
  EMAIL: z.string().nullable(),
  PHONE_NUMBER: z.string().nullable(),
  USER_NAME: z.string().nullable(),
  CREATED_BY_NAME: z.string().nullable(),
  UPDATED_BY_NAME: z.string().nullable(),
});

export const GetPersonsOutputSchema = z.object({
  data: z.object({
    rows: z.array(PersonSchema),
    count: z.number(),
  }),
  success: z.boolean(),
  message: z.string().nullable(),
});

export type GetPersonsInputType = z.infer<typeof GetPersonsInputSchema>;
