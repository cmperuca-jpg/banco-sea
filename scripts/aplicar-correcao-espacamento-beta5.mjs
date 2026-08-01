import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicRoot = path.join(root, "public");
const packagePath = path.join(root, "package.json");
const menuPath = path.join(publicRoot, "assets", "js", "fusion-top-menu-beta5.js");
const cssPath = path.join(publicRoot, "assets", "css", "fusion-menu-offset-beta5.css");

for (const arquivo of [packagePath, menuPath, cssPath]) {
  if (!fs.existsSync(arquivo)) throw new Error(`Arquivo obrigatório ausente: ${arquivo}`);
}

function listarHtml(dir) {
  const encontrados = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const absoluto = path.join(dir, item.name);
    if (item.isDirectory()) encontrados.push(...listarHtml(absoluto));
    else if (item.isFile() && /\.html?$/i.test(item.name)) encontrados.push(absoluto);
  }
  return encontrados;
}

const tagCss = '<link rel="stylesheet" href="/assets/css/fusion-menu-offset-beta5.css?v=20260731-beta5">';
const tagMenu = '<script src="/assets/js/fusion-top-menu-beta5.js?v=20260731-beta5"></script>';

let paginasAlteradas = 0;
let paginasComLayout = 0;

for (const arquivo of listarHtml(publicRoot)) {
  const original = fs.readFileSync(arquivo, "utf8");
  if (!original.includes("/assets/js/fusion-layout.js")) continue;
  paginasComLayout += 1;

  let html = original;

  // Remove referências das versões transitórias anteriores.
  html = html.replace(/\s*<link\b[^>]*href=(["'])\/assets\/css\/fusion-menu-offset-beta5\.css(?:\?[^"']*)?\1[^>]*>/gi, "");
  html = html.replace(/\s*<script\b[^>]*src=(["'])\/assets\/js\/fusion-top-menu-beta(?:4|5)\.js(?:\?[^"']*)?\1[^>]*><\/script>/gi, "");

  // Atualiza o cache-buster do layout e insere o menu beta5 logo depois.
  html = html.replace(
    /<script\b([^>]*?)src=(["'])\/assets\/js\/fusion-layout\.js(?:\?[^"']*)?\2([^>]*)><\/script>/gi,
    (_match, antes, _aspas, depois) =>
      `<script${antes}src="/assets/js/fusion-layout.js?v=20260731-beta5"${depois}></script>\n  ${tagMenu}`
  );

  // Carrega a correção depois das folhas já existentes.
  html = html.replace(/<\/head>/i, `  ${tagCss}\n</head>`);

  if (html !== original) {
    fs.writeFileSync(arquivo, html, "utf8");
    paginasAlteradas += 1;
  }
}

if (!paginasComLayout) throw new Error("Nenhuma página com fusion-layout.js foi encontrada.");

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.version = "3.0.0-beta.5";

if (Array.isArray(pkg.build?.publish) && pkg.build.publish[0]) {
  pkg.build.publish[0].owner = "cmperuca-jpg";
  pkg.build.publish[0].repo = "banco-sea";
}

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

// O verificador anterior tinha a versão beta fixa. Torna-o compatível com beta5.
const verificadorPath = path.join(root, "scripts", "verificar-distribuicao-desktop.mjs");
if (fs.existsSync(verificadorPath)) {
  let verificador = fs.readFileSync(verificadorPath, "utf8");
  verificador = verificador.replace(/3\.0\.0-beta\.\d+(?:\.\d+)?/g, "3.0.0-beta.5");
  fs.writeFileSync(verificadorPath, verificador, "utf8");
}

console.log(JSON.stringify({
  ok: true,
  versao: pkg.version,
  paginasComLayout,
  paginasAlteradas,
  css: path.relative(root, cssPath),
  menu: path.relative(root, menuPath)
}, null, 2));
