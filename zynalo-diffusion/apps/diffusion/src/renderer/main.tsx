import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createDevelopmentPromptLanguageService } from '@zynalo/prompt-language';
import { App } from './App';
import { ElectronDiffusionRuntime } from './runtime/DiffusionRuntime';
import { PromptWorkspaceService } from './promptWorkspace';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Renderer root element is missing.');

const runtime = new ElectronDiffusionRuntime(window.zynaloDiffusion);
const promptWorkspace = new PromptWorkspaceService(
  createDevelopmentPromptLanguageService(),
  window.localStorage,
  window.zynaloDiffusion.completeTags,
  window.zynaloDiffusion.getTagCatalogInfo,
  window.zynaloDiffusion.getTagReference,
);

createRoot(rootElement).render(
  <StrictMode>
    <App runtime={runtime} promptWorkspace={promptWorkspace} />
  </StrictMode>,
);
