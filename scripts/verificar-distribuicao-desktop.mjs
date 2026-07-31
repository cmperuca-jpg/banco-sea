import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resources = path.join(root, "release", "win-unpacked", "resources");
const obrigatorios = [
  "public/pages/login/index.html",
  "public/pages/dashboard/index.html",
  "public/assets/css/fusion-app.css",
  "public/assets/css/fusion-menu-global.css",
  "public/assets/css/fusion-premium-final.css",
  "public/assets/js/fusion-auth.js",
  "public/assets/js/fusion-layout.js"
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

if (ausentes.length) {
  console.error("Falha: o pacote desktop está incompleto.");
  ausentes.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  mensagem: "Instalador e recursos visuais validados.",
  recursos: obrigatorios.length,
  instalador
}, null, 2));
