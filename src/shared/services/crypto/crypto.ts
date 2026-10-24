import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import AppDataSource from '../../../data-source';
import { AdminService } from '~/modules/admin/application/admin.service';
import config from '~/config';
import { DecryptionFailedError, DomainErrorCodes as e, NotEncryptedValueError } from '~/shared/errors';

export const API_KEY_PREFIX = 'mbk_';
export const API_KEY_HEADER = 'x-api-key';

const API_KEY_BYTES = 32;
const API_KEY_PATTERN = /^mbk_[A-Za-z0-9_-]{43}$/;
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const ENCRYPTION_KEY_BYTES = 32;
const ENCRYPTED_VALUE_PATTERN = /^[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]*={0,2}$/;

/* 1. METBOT AUTH **/
export const hashApiKey = (apiKey: string): string => createHash('sha256').update(apiKey).digest('hex');
export const isApiKey = (value: unknown): value is string => typeof value === 'string' && API_KEY_PATTERN.test(value);

export const generateApiKey = (): { apiKey: string; apiKeyHash: string } => {
  const apiKey = `${API_KEY_PREFIX}${randomBytes(API_KEY_BYTES).toString('base64url')}`;
  return { apiKey, apiKeyHash: hashApiKey(apiKey) };
};

/* 2. CREDENTIAL CRYPTOGRAPHY **/
const encryptionKey = (): Buffer => {
  const key = Buffer.from(config.app.encryptionKey, 'base64');
  if (key.length !== ENCRYPTION_KEY_BYTES)
    throw new Error(
      `CREDS_KEY must be ${ENCRYPTION_KEY_BYTES} bytes in base64 (it has ${key.length}). Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
    );
  return key;
};

export const encryptValue = (value: string): string => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
};

export const decryptValue = (payload: unknown, label = 'value'): string => {
  if (typeof payload !== 'string' || !ENCRYPTED_VALUE_PATTERN.test(payload))
    throw new NotEncryptedValueError(`The ${label} is not an encrypted value (iv:authTag:data in base64)`, e.NOT_ENCRYPTED_VALUE_ERROR);
  const [ivEncoded, tagEncoded, encryptedEncoded] = payload.split(':') as [string, string, string];

  try {
    const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivEncoded, 'base64'));
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, 'base64')), decipher.final()]).toString('utf8');
  } catch (error: unknown) {
    throw new DecryptionFailedError(
      `The ${label} could not be decrypted with CREDS_KEY: ${error instanceof Error ? error.message : String(error)}`,
      e.DECRYPTION_FAILED_ERROR
    );
  }
};

/** 1. ROTATE API KEYS */
const rotate = async (clientId: string | undefined): Promise<void> => {
  if (!clientId) {
    process.stderr.write('Usage: crypto rotate <clientId>\n');
    process.exitCode = 1;
    return;
  }

  await AppDataSource.initialize();
  try {
    const apiKey = await new AdminService(AppDataSource).rotateClientApiKey(clientId);
    process.stdout.write(`\nAPI key for client ${clientId} (store it now, it is not shown again):\n\n${apiKey}\n\n`);
  } finally {
    await AppDataSource.destroy();
  }
};
/* 2. ENCRYPT CREDS **/
const promptHidden = (question: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY) return reject(new Error('there is no terminal to type the value: pass it as an argument'));
    let value = '';
    const finish = () => {
      input.removeListener('data', onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') return (finish(), resolve(value));
        if (char === '\u0003') return (finish(), reject(new Error('cancelled')));
        value = char === '\u007f' || char === '\b' ? value.slice(0, -1) : value + char;
      }
    };
    process.stdout.write(question);
    input.setRawMode(true);
    input.setEncoding('utf8');
    input.on('data', onData);
    input.resume();
  });

const encrypt = async (argument: string | undefined): Promise<void> => {
  const value = argument ?? (await promptHidden('Value to encrypt (hidden): '));
  if (!value) {
    process.stderr.write('Usage: crypto encrypt [value] (without a value, it asks for it hidden)\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`\nEncrypted value (store it where the server reads it):\n\n${encryptValue(value)}\n\n`);
};

/** COMMANDS: crypto rotate <clientId> | crypto encrypt [value] */
const COMMANDS: Record<string, (argument: string | undefined) => Promise<void>> = { rotate, encrypt };

if (require.main === module) {
  const [name, argument] = process.argv.slice(2);
  const command = name ? COMMANDS[name] : undefined;
  if (!command) {
    process.stderr.write(`Usage: crypto <${Object.keys(COMMANDS).join(' | ')}> <argument>\n`);
    process.exitCode = 1;
  } else
    command(argument).catch((error: unknown) => {
      process.stderr.write(`crypto ${name} failed: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
