import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicRoot = path.join(root, "public");
const fixPath = path.join(publicRoot, "assets", "js", "fusion-top-menu-beta4.js");
const packagePath = path.join(root, "package.json");

if (!fs.existsSync(packagePath)) {
  throw new Error(`package.json não encontrado em ${root}`);
}

if (!fs.existsSync(fixPath)) {
  throw new Error(`Correção visual não encontrada: ${fixPath}`);
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

const tagFix = '<script src="/assets/js/fusion-top-menu-beta4.js?v=20260731-beta4"></script>';
const regexLayout = /<script\b([^>]*?)src=(["'])\/assets\/js\/fusion-layout\.js(?:\?[^"']*)?\2([^>]*)><\/script>/gi;

let htmlAlterados = 0;
let referenciasLayout = 0;

for (const arquivo of listarHtml(publicRoot)) {
  const original = fs.readFileSync(arquivo, "utf8");
  if (!original.includes("/assets/js/fusion-layout.js")) continue;

  let conteudo = original
    .replace(/\s*<script\s+src=(["'])\/assets\/js\/fusion-top-menu-beta4\.js(?:\?[^"']*)?\1\s*><\/script>/gi, "")
    .replace(regexLayout, (_match, antes, _aspas, depois) => {
      referenciasLayout += 1;
      return `<script${antes}src="/assets/js/fusion-layout.js?v=20260731-beta4"${depois}></script>\n  ${tagFix}`;
    });

  if (conteudo !== original) {
    fs.writeFileSync(arquivo, conteudo, "utf8");
    htmlAlterados += 1;
  }
}

if (!referenciasLayout) {
  throw new Error("Nenhuma página com fusion-layout.js foi encontrada.");
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.version = "3.0.0-beta.4";

if (Array.isArray(pkg.build?.publish) && pkg.build.publish[0]) {
  pkg.build.publish[0].owner = "cmperuca-jpg";
  pkg.build.publish[0].repo = "banco-sea";
}

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  versao: pkg.version,
  paginasAlteradas: htmlAlterados,
  referenciasLayout,
  menu: path.relative(root, fixPath),
  repositorioAtualizacao: pkg.build?.publish?.[0]?.repo || null
}, null, 2));
