const providerRequested = String(process.env.FUSION_DATABASE_PROVIDER || "auto").toLowerCase();
const desktopLocal = ["1", "true", "sim", "yes"].includes(String(process.env.FUSION_DESKTOP_LOCAL || "false").toLowerCase());
const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const provider = providerRequested === "auto" ? (hasSupabase ? "supabase" : "json") : providerRequested;
export const DATABASE_CONFIG = Object.freeze({
  provider,
  providerRequested,
  hasSupabase,
  supabaseUrl: process.env.SUPABASE_URL || "",
  serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  recordsTable: process.env.FUSION_SUPABASE_RECORDS_TABLE || "fusion_v3_records",
  writeMode: String(process.env.FUSION_PERSISTENCE_WRITE_MODE || "primary").toLowerCase(),
  jsonFallbackEnabled: String(process.env.FUSION_JSON_FALLBACK ?? (process.env.NODE_ENV === "production" ? "false" : "true")).toLowerCase() !== "false",
  desktopLocal,
  productionRule: "Na nuvem, Supabase é a fonte oficial. No aplicativo desktop, JSON local é a fonte operacional e o Supabase recebe sincronização incremental."
});
export function assertDatabaseConfiguration() {
  if (process.env.NODE_ENV === "production" && !DATABASE_CONFIG.desktopLocal && DATABASE_CONFIG.provider !== "supabase") throw new Error("Produção em nuvem exige FUSION_DATABASE_PROVIDER=supabase.");
  if (process.env.NODE_ENV === "production" && !DATABASE_CONFIG.desktopLocal && !DATABASE_CONFIG.hasSupabase) throw new Error("Supabase selecionado, mas SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não está configurado.");
  if (process.env.NODE_ENV === "production" && !DATABASE_CONFIG.desktopLocal && DATABASE_CONFIG.jsonFallbackEnabled) throw new Error("FUSION_JSON_FALLBACK deve ser false em produção na nuvem.");
  return DATABASE_CONFIG;
}
