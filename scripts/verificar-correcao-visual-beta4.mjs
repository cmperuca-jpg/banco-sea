import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resources = path.join(root, "release", "win-unpacked", "resources");
const arquivos = [
  "public/assets/js/fusion-top-menu-beta4.js",
  "public/assets/js/fusion-layout.js",
  "public/assets/css/fusion-theme.css",
  "public/assets/css/fusion-menu-global.css",
  "public/pages/dashboard/index.html"
];

const falhas = [];

for (const relativo of arquivos) {
  const arquivo = path.join(resources, ...relativo.split("/"));
  if (!fs.existsSync(arquivo) || !fs.statSync(arquivo).isFile() || fs.statSync(arquivo).size === 0) {
    falhas.push(`${relativo}: ausente`);
  }
}

const dashboard = path.join(resources, "public", "pages", "dashboard", "index.html");
if (fs.existsSync(dashboard)) {
  const html = fs.readFileSync(dashboard, "utf8");
  if (!html.includes("fusion-top-menu-beta4.js")) {
    falhas.push("Dashboard não referencia fusion-top-menu-beta4.js");
  }
  if (!html.includes("fusion-layout.js?v=20260731-beta4")) {
    falhas.push("Dashboard não usa a versão beta4 do layout");
  }
}

const menu = path.join(resources, "public", "assets", "js", "fusion-top-menu-beta4.js");
if (fs.existsSync(menu)) {
  const js = fs.readFileSync(menu, "utf8");
  for (const trecho of [
    "fusion-menu-superior-ativo",
    "fusion-layout-fullwidth",
    "fusionTopMenu",
    "Todos os módulos"
  ]) {
    if (!js.includes(trecho)) falhas.push(`Menu beta4 sem trecho obrigatório: ${trecho}`);
  }
}

const instalador = path.join(root, "release", "FusionSistema-Setup.exe");
if (!fs.existsSync(instalador)) falhas.push("FusionSistema-Setup.exe: ausente");

if (falhas.length) {
  console.error("Falha na validação visual beta4:");
  falhas.forEach(falha => console.error(`- ${falha}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  mensagem: "Menu superior e Dashboard beta4 validados no pacote desktop.",
  instalador
}, null, 2));
