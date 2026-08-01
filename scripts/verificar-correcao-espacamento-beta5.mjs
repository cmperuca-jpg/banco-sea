import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resources = path.join(root, "release", "win-unpacked", "resources");
const obrigatorios = [
  "public/assets/css/fusion-menu-offset-beta5.css",
  "public/assets/js/fusion-top-menu-beta5.js",
  "public/assets/css/fusion-menu-global.css",
  "public/pages/modalidades/index.html",
  "public/pages/dashboard/index.html"
];

const falhas = [];

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

for (const pagina of ["public/pages/modalidades/index.html", "public/pages/dashboard/index.html"]) {
  const arquivo = path.join(resources, ...pagina.split("/"));
  if (!fs.existsSync(arquivo)) continue;
  const html = fs.readFileSync(arquivo, "utf8");

  if (!html.includes("fusion-menu-offset-beta5.css?v=20260731-beta5")) {
    falhas.push(`${pagina}: não carrega o espaçamento beta5`);
  }
  if (!html.includes("fusion-top-menu-beta5.js?v=20260731-beta5")) {
    falhas.push(`${pagina}: não carrega o menu beta5`);
  }
}

const css = path.join(resources, "public", "assets", "css", "fusion-menu-offset-beta5.css");
if (fs.existsSync(css)) {
  const texto = fs.readFileSync(css, "utf8");
  for (const regra of [
    "--fusion-page-top-gap",
    "#fusionTopMenu + :is(",
    ".page-actions",
    "padding-top:var(--fusion-page-top-gap)"
  ]) {
    if (!texto.includes(regra)) falhas.push(`CSS beta5 sem regra obrigatória: ${regra}`);
  }
}

const instalador = path.join(root, "release", "FusionSistema-Setup.exe");
if (!fs.existsSync(instalador)) falhas.push("FusionSistema-Setup.exe: ausente");

if (falhas.length) {
  console.error("Falha na validação do espaçamento beta5:");
  falhas.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  mensagem: "Conteúdo abaixo do menu superior validado.",
  instalador
}, null, 2));
