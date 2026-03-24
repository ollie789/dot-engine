import { importLogo } from '../logo/import.js';
import { mapPersonality } from './personality.js';
import { buildContextField } from './contexts.js';
import { buildDataField } from './data-field.js';
import type { BrandConfig, Brand, BrandContext, ContextOptions } from './types.js';

export async function defineBrand(config: BrandConfig): Promise<Brand> {
  const logo = await importLogo(config.logo);
  const params = mapPersonality(config.personality);

  const brand: Brand = {
    config,
    logo,
    field(context: BrandContext = 'logo', options?: ContextOptions) {
      if (context === 'data') {
        const dataPoints = options?.data ?? [];
        return buildDataField(brand, params, dataPoints, options);
      }
      return buildContextField(brand, context, params, options);
    },
  };

  return brand;
}
