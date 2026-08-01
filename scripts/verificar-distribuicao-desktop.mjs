import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resources = path.join(root, "release", "win-unpacked", "resources");
const obrigatorios = [
  "public/pages/login/index.html",
  "public/pages/login/style.css",
  "public/pages/dashboard/index.html",
  "public/pages/dashboard/index.js",
  "public/assets/css/fusion-app.css",
  "public/assets/css/fusion-theme.css",
  "public/assets/css/fusion-menu-global.css",
  "public/assets/css/fusion-premium-final.css",
  "public/assets/js/fusion-auth.js",
  "public/assets/js/fusion-layout.js",
  "public/assets/pwa/fusion-pwa-install.js",
  "public/fusion-sw-sistema.js"
];

const ausentes = obrigatorios.filter(relativo => {
  const arquivo = path.join(resources, ...relativo.split("/"));
  try {
    return !fs.statSync(arquivo).isFile() || fs.statSync(arquivo).size === 0;
  } catch {
    return true;
  }
});

const instalador = path.join(root, "release", "FusionSistema-Setup.exe");
if (!fs.existsSync(instalador)) ausentes.push("FusionSistema-Setup.exe");

const pacote = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pacote.version !== "3.0.0-beta.5") {
  ausentes.push(`package.json version esperada 3.0.0-beta.5; encontrada ${pacote.version || "vazia"}`);
}
const destinoAtualizacao = pacote.build?.publish?.[0]?.repo;
if (destinoAtualizacao !== "banco-sea") {
  ausentes.push(`repositÃ³rio de atualizaÃ§Ã£o esperado banco-sea; encontrado ${destinoAtualizacao || "vazio"}`);
}

const electronMain = fs.readFileSync(path.join(root, "desktop", "electron-main.cjs"), "utf8");
if (!electronMain.includes("clearStorageData") || !electronMain.includes("reloadIgnoringCache")) {
  ausentes.push("desktop/electron-main.cjs sem proteÃ§Ã£o de cache visual");
}

const pwaDesktop = fs.readFileSync(path.join(root, "public", "assets", "pwa", "fusion-pwa-install.js"), "utf8");
if (!pwaDesktop.includes("FusionDesktop") || !pwaDesktop.includes("getRegistrations")) {
  ausentes.push("fusion-pwa-install.js sem desativaÃ§Ã£o de Service Worker no desktop");
}

if (ausentes.length) {
  console.error("Falha: o pacote desktop estÃ¡ incompleto.");
  ausentes.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  versao: pacote.version,
  mensagem: "Instalador, recursos visuais, cache e atualizaÃ§Ã£o validados.",
  recursos: obrigatorios.length,
  instalador
}, null, 2));

