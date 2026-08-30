import { PromptCatalog } from './catalog';
import { WAI_DEVELOPMENT_CATALOG } from './data/wai-development-v1';
import { BooruPromptLanguageService } from './service';

export * from './catalog';
export * from './profiles';
export * from './service';
export * from './types';
export { WAI_DEVELOPMENT_CATALOG, WAI_DEVELOPMENT_CATALOG_RECORD_COUNT } from './data/wai-development-v1';

export function createDevelopmentPromptLanguageService(): BooruPromptLanguageService {
  return new BooruPromptLanguageService(new PromptCatalog(WAI_DEVELOPMENT_CATALOG));
}
