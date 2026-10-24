import { createHmac, timingSafeEqual } from 'node:crypto';
import { isAbsolute, join, normalize, relative } from 'node:path';
import config from '~/config';

export const ASSETS_DIR = join(__dirname, '..', '..', 'assets');
export const ASSETS_ROUTE = '/chat/assets';
export const ASSET_URL_TTL_SECONDS = 3600;

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

const insideAssets = (relativePath: string): string | undefined => {
  if (!relativePath || isAbsolute(relativePath)) return undefined;
  const absolute = normalize(join(ASSETS_DIR, relativePath));
  const back = relative(ASSETS_DIR, absolute);
  return back && !back.startsWith('..') && !isAbsolute(back) ? absolute : undefined;
};

export const signAssetUrl = (relativePath: string, secret: string = config.assets.signingSecret, now = Date.now()): string | undefined => {
  if (!secret || !insideAssets(relativePath)) return undefined;
  const payload = Buffer.from(JSON.stringify({ p: relativePath, e: Math.floor(now / 1000) + ASSET_URL_TTL_SECONDS })).toString('base64url');
  return `${ASSETS_ROUTE}?token=${payload}.${sign(payload, secret)}`;
};

export type AssetTokenCheck = { ok: true; file: string; expiresAt: number } | { ok: false; reason: string };

export const verifyAssetToken = (token: unknown, secret: string = config.assets.signingSecret, now = Date.now()): AssetTokenCheck => {
  if (!secret) return { ok: false, reason: 'asset signing is not configured' };
  if (typeof token !== 'string') return { ok: false, reason: 'no token' };
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length) return { ok: false, reason: 'malformed token' };

  const expected = Buffer.from(sign(payload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return { ok: false, reason: 'bad signature' };

  let claims: { p?: unknown; e?: unknown };
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { p?: unknown; e?: unknown };
  } catch {
    return { ok: false, reason: 'malformed token' };
  }
  if (typeof claims.e !== 'number' || claims.e * 1000 <= now) return { ok: false, reason: 'expired token' };
  const file = typeof claims.p === 'string' ? insideAssets(claims.p) : undefined;
  if (!file) return { ok: false, reason: 'path outside the assets folder' };
  return { ok: true, file, expiresAt: claims.e };
};
