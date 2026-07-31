import fs from "node:fs/promises";
import path from "node:path";

const raiz = process.cwd();
const origem = path.join(raiz, ".env.fusion-novo.example");
const destino = path.join(raiz, ".env");

try {
  await fs.access(origem);
} catch {
  console.error("Arquivo .env.fusion-novo.example não encontrado.");
  process.exit(1);
}

try {
  await fs.access(destino);
  console.error("O arquivo .env já existe. Nenhuma configuração foi substituída.");
  process.exit(1);
} catch {}

await fs.copyFile(origem, destino);
console.log("Configuração criada em .env.");
console.log("Execute npm install e depois npm run dev.");
