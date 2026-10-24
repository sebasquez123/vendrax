import { config as loadDotenv } from 'dotenv';
import { join } from 'node:path';

loadDotenv({ path: join(__dirname, '..', '..', '.env'), quiet: true });
process.env['DOTENV_CONFIG_QUIET'] = 'true';
process.env['LOG_LEVEL'] = 'error';

const HANDSHAKE_FIELDS = {
  appClientId: 'CLIENT_TEST_APP_CLIENT_ID',
  userId: 'CLIENT_TEST_USER_ID',
  Authorization: 'CLIENT_TEST_AUTHORIZATION',
  scopes: 'CLIENT_TEST_SCOPES',
  subdomains: 'CLIENT_TEST_SUBDOMAINS',
  modes: 'CLIENT_TEST_MODES',
} as const;

export const MODEL_VARIABLE = 'CLIENT_TEST_MODEL';

export const TEST_MODEL = process.env[MODEL_VARIABLE]?.trim() ?? '';

export const TEST_PROVIDER: 'openai' | 'gemini' = /^(gpt|o\d|chatgpt)/i.test(TEST_MODEL) ? 'openai' : 'gemini';

export const TEST_PROVIDER_KEY = TEST_PROVIDER === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';

if (TEST_MODEL) process.env[TEST_PROVIDER === 'openai' ? 'OPENAI_MODEL' : 'GEMINI_MODEL'] = TEST_MODEL;
process.env[TEST_PROVIDER === 'openai' ? 'OPENAI_API_KEY_ENABLE' : 'GEMINI_API_KEY_ENABLE'] = 'true';

/**
 * Lectura del handshake
 * Indica qué campos del handshake están definidos y cuáles faltan, sin exponer nunca sus valores.
 */
export const readHandshake = (): { auth: Record<string, string>; sent: string[]; missing: string[] } => {
  const auth: Record<string, string> = {};
  for (const [field, variable] of Object.entries(HANDSHAKE_FIELDS)) {
    const value = process.env[variable]?.trim();
    if (value) auth[field] = value;
  }
  const fields = Object.keys(HANDSHAKE_FIELDS);
  return { auth, sent: fields.filter((field) => field in auth), missing: fields.filter((field) => !(field in auth)) };
};
