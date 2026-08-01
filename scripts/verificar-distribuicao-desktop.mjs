import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resources = path.join(root, "release", "win-unpacked", "resources");
const falhas = [];

const obrigatorios = [
  "public/pages/login/index.html",
  "public/pages/dashboard/index.html",
  "public/pages/instalar/index.html",
  "public/assets/css/fusion-app.css",
  "public/assets/css/fusion-theme.css",
  "public/assets/css/fusion-menu-global.css",
  "public/assets/css/fusion-menu-offset-beta5.css",
  "public/assets/js/fusion-auth.js",
  "public/assets/js/fusion-layout.js",
  "public/assets/js/fusion-top-menu-beta5.js",
  "public/assets/pwa/fusion-pwa-install.js",
  "public/fusion-sw-sistema.js"
];

for (const relativo of obrigatorios) {
  const arquivo = path.join(resources, ...relativo.split("/"));
  try {
    if (!fs.statSync(arquivo).isFile() || fs.statSync(arquivo).size === 0) {
      falhas.push(`${relativo}: vazio ou inválido`);
    }
  } catch {
    falhas.push(`${relativo}: ausente`);
  }
}

const instalador = path.join(root, "release", "FusionSistema-Setup.exe");
if (!fs.existsSync(instalador)) falhas.push("FusionSistema-Setup.exe: ausente");

const pacote = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pacote.version !== "3.0.0-beta.7") {
  falhas.push(`package.json version esperada 3.0.0-beta.7; encontrada ${pacote.version || "vazia"}`);
}

const publicacao = pacote.build?.publish?.[0];
if (publicacao?.owner !== "cmperuca-jpg" || publicacao?.repo !== "banco-sea") {
  falhas.push(`destino de atualização inválido: ${publicacao?.owner || "vazio"}/${publicacao?.repo || "vazio"}`);
}

const recursosExtras = Array.isArray(pacote.build?.extraResources) ? pacote.build.extraResources : [];
if (recursosExtras.some(item => ["data", "uploads"].includes(String(item?.from || "").replaceAll("\\", "/")))) {
  falhas.push("o instalador não pode incorporar data ou uploads de uma academia");
}

const menuJs = fs.readFileSync(path.join(root, "public", "assets", "js", "fusion-top-menu-beta5.js"), "utf8");
for (const trecho of [
  "fusionTopMenuSpacer",
  "fusion-page-root-integral",
  "corrigirSobreposicao",
  "garantirRetornoInstalacao",
  "__FUSION_NAVEGACAO_INTEGRAL_V1__"
]) {
  if (!menuJs.includes(trecho)) falhas.push(`menu integral sem recurso: ${trecho}`);
}

const menuCss = fs.readFileSync(path.join(root, "public", "assets", "css", "fusion-menu-offset-beta5.css"), "utf8");
for (const trecho of [
  "position:fixed!important",
  "#fusionTopMenuSpacer",
  ".fusion-page-root-integral",
  ".fusion-install-back"
]) {
  if (!menuCss.includes(trecho)) falhas.push(`CSS integral sem regra: ${trecho}`);
}

const instalarHtml = fs.readFileSync(path.join(root, "public", "pages", "instalar", "index.html"), "utf8");
for (const trecho of [
  "fusion-top-menu-beta5.js",
  "fusion-menu-offset-beta5.css",
  "data-fusion-voltar-sistema",
  "cmperuca-jpg/banco-sea/releases/latest/download/FusionSistema-Setup.exe"
]) {
  if (!instalarHtml.includes(trecho)) falhas.push(`página Instalar sem recurso: ${trecho}`);
}

if (falhas.length) {
  console.error("Falha: o pacote desktop está incompleto.");
  falhas.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  versao: pacote.version,
  mensagem: "Instalador e navegação integral validados estruturalmente.",
  recursos: obrigatorios.length,
  instalador
}, null, 2));
