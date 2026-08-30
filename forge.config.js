const path = require("node:path");

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
module.exports = {
  outDir: "out-forge",
  packagerConfig: {
    asar: true,
    icon: path.join(__dirname, "public", "zynalo-studio.ico"),
    extraResource: [
      path.join(__dirname, "out"),
      path.join(__dirname, "public", "zynalo-studio.ico"),
    ],
    executableName: "zynalo-studio",
    // The renderer is a static export in resources/out. The packaged Node app
    // only needs the compiled Electron entry points; web dependencies are
    // build-time inputs and would otherwise add hundreds of megabytes.
    ignore: [/^\/(?!dist-electron(?:\/|$)|package\.json$)/],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "zynalo_studio",
        setupExe: "Zynalo-Studio-Setup.exe",
        setupIcon: path.join(__dirname, "public", "zynalo-studio.ico"),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
  ],
};
