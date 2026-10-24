import { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';

export function collectSemantics<TOutput>(output: TOutput, activeFields: string[], semantics: ISemantics): ISemantics {
  const collected: ISemantics = {};

  const traverse = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        traverse(item);
      }

      return;
    }

    if (value !== null && typeof value === 'object') {
      for (const [key, childValue] of Object.entries(value)) {
        if (childValue !== null && typeof childValue === 'object') {
          traverse(childValue);
          continue;
        }

        const semantic = semantics[key];

        if (semantic && activeFields.includes(key) && !(key in collected)) {
          collected[key] = semantic;
        }
      }
    }
  };

  traverse(output);

  return collected;
}
