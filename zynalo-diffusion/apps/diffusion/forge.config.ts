import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'zynalo-diffusion',
    extraResource: ['apps/diffusion/dist/python-host/zynalo_sdxl_spike', 'apps/diffusion/dist/tag-catalog'],
    ignore: [
      /^[\\/](?:\.git|\.tools|\.test-output|coverage|docs|node_modules|out|packages|resources|scripts|spikes|tests)(?:[\\/]|$)/,
      /^[\\/]apps[\\/]diffusion[\\/]src(?:[\\/]|$)/,
      /^[\\/]apps[\\/]diffusion[\\/]dist[\\/]python-host(?:[\\/]|$)/,
      /^[\\/]apps[\\/]diffusion[\\/]dist[\\/]tag-catalog(?:[\\/]|$)/,
      /^[\\/]apps[\\/]diffusion[\\/](?:forge\.config\.ts|package\.json)$/,
      /^[\\/](?:\.gitignore|eslint\.config\.mjs|package-lock\.json|README\.md|tsconfig(?:\.base)?\.json)$/,
    ],
  },
  rebuildConfig: {},
  makers: [new MakerZIP({}, ['win32'])],
};

export default config;
