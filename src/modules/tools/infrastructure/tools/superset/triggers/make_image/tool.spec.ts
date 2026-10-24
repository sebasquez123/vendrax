import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyAssetToken } from '~/shared/helpers/signed_assets';
import { showReferenceImages } from './tool';
import { MakeImageInputSchema } from './validator';

const SECRET = 'test-secret';
let imagesDir: string;

beforeAll(() => {
  imagesDir = mkdtempSync(join(tmpdir(), 'reference-images-'));
  writeFileSync(join(imagesDir, 'trendline.png'), 'png');
  writeFileSync(join(imagesDir, 'legend.webp'), 'webp');
  writeFileSync(join(imagesDir, 'chart_types_overview.jpg'), 'jpg');
  writeFileSync(join(imagesDir, 'chart_types_trend.jpg'), 'jpg');
});
afterAll(() => rmSync(imagesDir, { recursive: true, force: true }));

describe('make_image', () => {
  it('sends the images in the order asked, each with a signed link', () => {
    const onCustomEvent = jest.fn();
    const answer = showReferenceImages(['legend', 'trendline'], { onCustomEvent, imagesDir, secret: SECRET });
    expect(answer).toBe('Shown below your reply as examples, in this order: Leyenda, Línea de tendencia.');
    const [object, type, action, source] = onCustomEvent.mock.calls[0] as [{ images: { reference: string; src: string }[] }, string, string, string];
    expect([type, action, source]).toEqual(['rendering', 'make_image', 'SuperSet']);
    expect(object.images.map((image) => image.reference)).toEqual(['legend', 'trendline']);
    const token = new URL(object.images[0]!.src, 'http://server').searchParams.get('token');
    expect(verifyAssetToken(token, SECRET)).toMatchObject({ ok: true, file: expect.stringContaining(join('SUPERSET', 'legend.webp')) });
  });

  it('leaves out an image that does not exist yet and tells the agent it was not shown', () => {
    const onCustomEvent = jest.fn();
    const answer = showReferenceImages(['trendline', 'filters'], { onCustomEvent, imagesDir, secret: SECRET });
    expect(answer).toContain('Shown below your reply as examples, in this order: Línea de tendencia.');
    expect(answer).toContain("NOT SHOWN: there is no example of 'Filtros' yet");
    expect((onCustomEvent.mock.calls[0]![0] as { images: unknown[] }).images).toHaveLength(1);
  });

  it('sends no event when none of the images exists, or when links cannot be signed', () => {
    const onCustomEvent = jest.fn();
    expect(showReferenceImages(['filters'], { onCustomEvent, imagesDir, secret: SECRET })).toMatch(/^NOT SHOWN/);
    expect(showReferenceImages(['trendline'], { onCustomEvent, imagesDir, secret: '' })).toMatch(/^NOT SHOWN: images are not available/);
    expect(onCustomEvent).not.toHaveBeenCalled();
  });

  it('shows both chart type images whenever either one is asked for, the families first and each once', () => {
    const shown = (references: Parameters<typeof showReferenceImages>[0]) => {
      const onCustomEvent = jest.fn();
      showReferenceImages(references, { onCustomEvent, imagesDir, secret: SECRET });
      return (onCustomEvent.mock.calls[0]![0] as { images: { reference: string }[] }).images.map((image) => image.reference);
    };
    expect(shown(['chart_types_trend'])).toEqual(['chart_types_overview', 'chart_types_trend']);
    expect(shown(['chart_types_overview', 'chart_types_trend'])).toEqual(['chart_types_overview', 'chart_types_trend']);
    expect(shown(['legend', 'chart_types_overview'])).toEqual(['legend', 'chart_types_overview', 'chart_types_trend']);
  });

  it('takes 1 or 2 references from the catalog only', () => {
    expect(MakeImageInputSchema.safeParse({ references: ['trendline', 'legend'] }).success).toBe(true);
    expect(MakeImageInputSchema.safeParse({ references: ['trendline', 'legend', 'filters'] }).success).toBe(false);
    expect(MakeImageInputSchema.safeParse({ references: ['sankey'] }).success).toBe(false);
    expect(MakeImageInputSchema.safeParse({ references: [] }).success).toBe(false);
  });
});
