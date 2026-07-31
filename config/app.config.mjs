import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), "..");
const RUNTIME_ROOT = path.resolve(process.env.FUSION_RUNTIME_ROOT || PROJECT_ROOT);

export const APP_CONFIG = Object.freeze({
  name: "Fusion ERP",
  version: "3.0.0-base",
  architectureVersion: 1,
  environment: process.env.NODE_ENV || "development",
  projectRoot: PROJECT_ROOT,
  publicDir: path.join(PROJECT_ROOT, "public"),
  dataDir: path.join(RUNTIME_ROOT, "data"),
  uploadsDir: path.join(RUNTIME_ROOT, "uploads"),
  docsDir: path.join(PROJECT_ROOT, "docs"),
  runtimeRoot: RUNTIME_ROOT,
  isProduction: (process.env.NODE_ENV || "development") === "production",
  isRender: Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL)
});
