import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
import { LoggerService } from '~/shared/logging/main.logger';
import { ASSETS_DIR, signAssetUrl } from '~/shared/helpers/signed_assets';
import config from '~/config';
import { REFERENCE_IMAGES, ReferenceImageId, withTheirSets } from './references';
import { MakeImageInputSchema, MakeImageInputType } from './validator';

const logger = new LoggerService('MakeImage');

const FOLDER = 'images/SUPERSET';
const EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg', 'svg'];

type CustomEvent = (object: Record<string, unknown>, type: string, action: string, source: string) => void;

export const findReferenceImage = (reference: string, imagesDir: string): string | undefined =>
  EXTENSIONS.map((extension) => `${reference}.${extension}`).find((file) => existsSync(join(imagesDir, file)));

export const showReferenceImages = (
  references: readonly ReferenceImageId[],
  {
    onCustomEvent,
    imagesDir = join(ASSETS_DIR, FOLDER),
    secret = config.assets.signingSecret,
  }: { onCustomEvent?: CustomEvent; imagesDir?: string; secret?: string }
): string => {
  if (!secret) {
    logger.warn('REFERENCE_IMAGE_UNAVAILABLE: ASSETS_SIGNING_SECRET is not set, so no image link can be signed', { references });
    return 'NOT SHOWN: images are not available right now. Explain it in words; never say an image was shown.';
  }

  const images: { reference: string; title: string; src: string }[] = [];
  const missing: string[] = [];
  for (const reference of withTheirSets(references)) {
    const { title } = REFERENCE_IMAGES[reference];
    const file = findReferenceImage(reference, imagesDir);
    const src = file ? signAssetUrl(`${FOLDER}/${file}`, secret) : undefined;
    if (!src) {
      logger.warn('REFERENCE_IMAGE_MISSING: no image file for this reference yet', { reference, folder: `src/assets/${FOLDER}` });
      missing.push(title);
      continue;
    }
    images.push({ reference, title, src });
  }

  if (images.length) onCustomEvent?.({ images }, 'rendering', 'make_image', 'SuperSet');
  const shown = images.length ? `Shown below your reply as examples, in this order: ${images.map((image) => image.title).join(', ')}.` : '';
  const notShown = missing.length
    ? `NOT SHOWN: there is no example of ${missing.map((title) => `'${title}'`).join(' and ')} yet. Explain it in words; never say that example was shown.`
    : '';
  return [shown, notShown].filter(Boolean).join(' ');
};

export const make_image = ({ onCustomEvent }: MCPToolParams): DynamicStructuredTool => {
  const real_tool_Name = 'make_image';

  return tool(async ({ references }: MakeImageInputType) => showReferenceImages(references, { onCustomEvent }), {
    name: `${TOOL_PREFIX}${real_tool_Name}`,
    description: `
      Show the user 1 or 2 reference examples of a chart part or option (what a trendline or a legend looks like), to support what your reply explains or asks. These fixed examples are the only images there are: one per reference listed in 'references'.
      Asked which chart types there are, or to pick one: 'chart_types_overview'. It always comes with 'chart_types_trend', so the two show every type at once; present them in that order.
      They appear below your reply, only to illustrate it: write your explanation as usual and refer to them as examples ("abajo ves un ejemplo de…"), never as an image made for the user. Its answer says which ones were shown: mention only those.
      You do not create or draw images. When asked for one, show an example only if one of these fits, and say what it shows; for anything else (a picture of their own chart or data, a drawing, any other subject) say plainly that you do not create images and offer what you can do: explain it, show a fitting example, or build the chart itself on their dashboard.
      Call it only where your reply shapes say to; it changes nothing.
      `,
    schema: MakeImageInputSchema,
    responseFormat: 'content',
  });
};

export default { func: make_image, name: 'make_image' };
