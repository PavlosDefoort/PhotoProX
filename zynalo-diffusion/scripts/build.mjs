import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(projectRoot, 'apps', 'diffusion');
const sourceRoot = path.join(appRoot, 'src');
const aliases = {
  '@zynalo/diffusion-contracts': path.join(projectRoot, 'packages', 'diffusion-contracts', 'src', 'index.ts'),
  '@zynalo/diffusion-engine': path.join(projectRoot, 'packages', 'diffusion-engine', 'src', 'index.ts'),
  '@zynalo/prompt-language': path.join(projectRoot, 'packages', 'prompt-language', 'src', 'index.ts'),
};

await build({
  configFile: false,
  root: path.join(sourceRoot, 'renderer'),
  base: './',
  plugins: [react()],
  css: { postcss: { plugins: [] } },
  resolve: { alias: aliases },
  build: {
    outDir: path.join(appRoot, 'dist', 'renderer'),
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]',
        chunkFileNames: 'assets/[name].js',
        entryFileNames: 'assets/[name].js',
      },
    },
  },
});

for (const target of ['main', 'preload']) {
  await build({
    configFile: false,
    resolve: { alias: aliases },
    build: {
      emptyOutDir: false,
      outDir: path.join(appRoot, 'dist', target),
      sourcemap: false,
      lib: {
        entry: path.join(sourceRoot, target, 'index.ts'),
        formats: ['cjs'],
        fileName: () => 'index.cjs',
      },
      rollupOptions: {
        external: (id) => id === 'electron' || id.startsWith('node:'),
      },
    },
  });
}

const pythonSource = path.join(projectRoot, 'spikes', 'diffusers-sdxl', 'src', 'zynalo_sdxl_spike');
const pythonHostRoot = path.join(appRoot, 'dist', 'python-host');
const pythonDestination = path.join(pythonHostRoot, 'zynalo_sdxl_spike');
await rm(pythonHostRoot, { recursive: true, force: true });
await mkdir(pythonDestination, { recursive: true });
for (const entry of await readdir(pythonSource, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.py')) {
    await copyFile(path.join(pythonSource, entry.name), path.join(pythonDestination, entry.name));
  }
}

const tagCatalogSource = path.join(projectRoot, 'resources', 'tag-catalog');
const tagCatalogDestination = path.join(appRoot, 'dist', 'tag-catalog');
await rm(tagCatalogDestination, { recursive: true, force: true });
await mkdir(tagCatalogDestination, { recursive: true });
for (const filename of ['danbooru.csv', 'meta.json', 'UPSTREAM-LICENSE.txt']) {
  try {
    await access(path.join(tagCatalogSource, filename));
    await copyFile(path.join(tagCatalogSource, filename), path.join(tagCatalogDestination, filename));
  } catch {
    // The large upstream vocabulary is optional and is intentionally not part
    // of the public source checkout. The curated package remains usable.
  }
}
