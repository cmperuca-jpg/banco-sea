const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("FusionDesktop", Object.freeze({
  desktop: true,
  plataforma: process.platform,
  versaoElectron: process.versions.electron
}));
