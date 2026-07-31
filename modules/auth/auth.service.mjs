import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { lerJsonDuravel, salvarJsonDuravel } from "../core/persistence/durable-json.mjs";

const SEGREDO_DESENVOLVIMENTO = "fusion-erp-dev-secret-trocar-em-producao";
const JWT_SECRET_CONFIGURADO = process.env.JWT_SECRET || process.env.FUSION_JWT_SECRET || "";
const JWT_SECRET = JWT_SECRET_CONFIGURADO || SEGREDO_DESENVOLVIMENTO;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const BCRYPT_ROUNDS = Math.min(Math.max(Number(process.env.FUSION_BCRYPT_ROUNDS || 12), 10), 14);

const AUTH_PROVIDER = String(process.env.FUSION_AUTH_PROVIDER || "local").trim().toLowerCase();
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim();
const SUPABASE_PUBLIC_KEY = String(
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ""
).trim();
const SUPABASE_AUTH_CACHE_MS = Math.min(
  Math.max(Number(process.env.FUSION_SUPABASE_AUTH_CACHE_MS || 30000), 5000),
  120000
);

let supabasePublicClient = null;
const supabaseSessionCache = new Map();

function supabaseAuthAtivo() {
  return AUTH_PROVIDER === "supabase";
}

function garantirSupabaseAuthConfigurado() {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw erro(
      "Supabase Auth não configurado. Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.",
      503
    );
  }
}

function criarClienteSupabase(accessToken = "") {
  garantirSupabaseAuthConfigurado();
  const opcoes = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  };

  if (accessToken) {
    opcoes.global = {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    };
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, opcoes);
}

function clienteSupabasePublico() {
  if (!supabasePublicClient) supabasePublicClient = criarClienteSupabase();
  return supabasePublicClient;
}

function perfilLegacyDoPapel(papel = "") {
  const normalizado = normalizar(papel);
  if (["proprietario", "administrador", "admin"].includes(normalizado)) return "Administrador";
  if (normalizado === "gerente") return "Gerente";
  if (normalizado === "recepcao") return "Recepcao";
  if (normalizado === "comercial") return "Comercial";
  if (normalizado === "professor") return "Professor";
  if (normalizado === "aluno") return "Aluno";
  return "Recepcao";
}

function permissoesDoVinculo(vinculo = {}, perfil = "Recepcao") {
  const papel = normalizar(vinculo.papel);
  if (["proprietario", "administrador", "admin"].includes(papel)) return ["*"];

  const configuradas = vinculo.permissoes;
  if (Array.isArray(configuradas)) return configuradas.map(texto).filter(Boolean);
  if (Array.isArray(configuradas?.modulos)) return configuradas.modulos.map(texto).filter(Boolean);
  if (configuradas?.acesso_total === true) return ["*"];

  return permissoesPorPerfil(perfil);
}

async function carregarUsuarioSupabase(authUser, accessToken) {
  if (!authUser?.id || !accessToken) throw erro("Sessão Supabase inválida.", 401);

  const cliente = criarClienteSupabase(accessToken);
  const [{ data: perfil, error: perfilErro }, { data: vinculos, error: vinculosErro }] = await Promise.all([
    cliente
      .from("perfis")
      .select("id,nome,email,status,telefone,avatar_url")
      .eq("id", authUser.id)
      .maybeSingle(),
    cliente
      .from("academia_usuarios")
      .select("academia_id,papel,status,permissoes")
      .eq("usuario_id", authUser.id)
      .eq("status", "ativo")
      .limit(1)
  ]);

  if (perfilErro) throw erro(`Não foi possível carregar o perfil: ${perfilErro.message}`, 503);
  if (vinculosErro) throw erro(`Não foi possível carregar o vínculo da academia: ${vinculosErro.message}`, 503);

  const vinculo = Array.isArray(vinculos) ? vinculos[0] : null;
  if (!vinculo?.academia_id) {
    throw erro("Usuário sem vínculo ativo com uma academia.", 403);
  }

  const { data: academia, error: academiaErro } = await cliente
    .from("academias")
    .select("id,nome,slug,status,timezone")
    .eq("id", vinculo.academia_id)
    .maybeSingle();

  if (academiaErro) throw erro(`Não foi possível carregar a academia: ${academiaErro.message}`, 503);
  if (!academia || academia.status !== "ativa") {
    throw erro("Academia indisponível ou inativa.", 403);
  }

  if (perfil?.status && perfil.status !== "ativo") {
    throw erro("Usuário inativo. Procure o administrador.", 403);
  }

  const perfilSistema = perfilLegacyDoPapel(vinculo.papel);
  return {
    id: authUser.id,
    nome: perfil?.nome || authUser.user_metadata?.nome || authUser.user_metadata?.full_name || authUser.email || "Usuário",
    email: perfil?.email || authUser.email || "",
    telefone: perfil?.telefone || "",
    avatarUrl: perfil?.avatar_url || "",
    perfil: perfilSistema,
    perfilOriginal: vinculo.papel,
    permissoes: permissoesDoVinculo(vinculo, perfilSistema),
    academiaId: academia.id,
    academiaNome: academia.nome,
    academiaSlug: academia.slug,
    academiaTimezone: academia.timezone,
    authProvider: "supabase"
  };
}

function erroSupabaseEhIndisponibilidade(authErro) {
  const descricao = `${authErro?.name || ""} ${authErro?.message || ""}`.toLowerCase();
  return /fetch|network|eai_again|enotfound|timeout|retryable/.test(descricao);
}

function chaveCacheToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

async function validarTokenSupabase(token) {
  garantirSupabaseAuthConfigurado();
  const cacheKey = chaveCacheToken(token);
  const cache = supabaseSessionCache.get(cacheKey);
  if (cache && cache.expiraEm > Date.now()) return cache.usuario;

  const { data, error: authErro } = await clienteSupabasePublico().auth.getUser(token);
  if (authErro || !data?.user) {
    supabaseSessionCache.delete(cacheKey);
    if (erroSupabaseEhIndisponibilidade(authErro)) {
      throw erro("O serviço de autenticação está temporariamente indisponível.", 503);
    }
    throw erro("Sessão expirada ou inválida. Faça login novamente.", 401);
  }

  const usuario = await carregarUsuarioSupabase(data.user, token);
  supabaseSessionCache.set(cacheKey, {
    usuario,
    expiraEm: Date.now() + SUPABASE_AUTH_CACHE_MS
  });

  if (supabaseSessionCache.size > 500) {
    const agora = Date.now();
    for (const [chave, item] of supabaseSessionCache.entries()) {
      if (item.expiraEm <= agora) supabaseSessionCache.delete(chave);
    }
  }

  return usuario;
}

async function autenticarSupabase(email, senha) {
  garantirSupabaseAuthConfigurado();
  const loginEmail = normalizar(email);
  if (!loginEmail || !loginEmail.includes("@") || !String(senha || "")) {
    throw erro("Informe e-mail e senha.", 400);
  }

  const { data, error: authErro } = await clienteSupabasePublico().auth.signInWithPassword({
    email: loginEmail,
    password: String(senha)
  });

  if (authErro || !data?.session?.access_token || !data?.user) {
    if (erroSupabaseEhIndisponibilidade(authErro)) {
      throw erro("O serviço de autenticação está temporariamente indisponível.", 503);
    }
    const status = Number(authErro?.status) === 429 ? 429 : 401;
    throw erro(
      status === 429
        ? "Muitas tentativas de login. Aguarde alguns minutos."
        : "E-mail ou senha inválidos.",
      status
    );
  }

  const usuario = await carregarUsuarioSupabase(data.user, data.session.access_token);
  return {
    ok: true,
    token: data.session.access_token,
    refreshToken: data.session.refresh_token || "",
    expiresAt: data.session.expires_at || null,
    expiresIn: data.session.expires_in || null,
    authProvider: "supabase",
    usuario
  };
}

export async function renovarSessao(refreshToken = "") {
  if (!supabaseAuthAtivo()) {
    throw erro("Renovação de sessão disponível somente com Supabase Auth.", 400);
  }

  garantirSupabaseAuthConfigurado();
  const token = texto(refreshToken);
  if (!token) throw erro("Token de renovação ausente.", 401);

  const { data, error: authErro } = await clienteSupabasePublico().auth.refreshSession({
    refresh_token: token
  });

  if (authErro || !data?.session?.access_token || !data?.user) {
    if (erroSupabaseEhIndisponibilidade(authErro)) {
      throw erro("O serviço de autenticação está temporariamente indisponível.", 503);
    }
    throw erro("Não foi possível renovar a sessão. Faça login novamente.", 401);
  }

  const usuario = await carregarUsuarioSupabase(data.user, data.session.access_token);
  return {
    ok: true,
    token: data.session.access_token,
    refreshToken: data.session.refresh_token || token,
    expiresAt: data.session.expires_at || null,
    expiresIn: data.session.expires_in || null,
    authProvider: "supabase",
    usuario
  };
}

export function provedorAutenticacao() {
  return {
    provider: supabaseAuthAtivo() ? "supabase" : "local",
    configurado: supabaseAuthAtivo()
      ? Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY)
      : true
  };
}

if (process.env.NODE_ENV === "production" && !JWT_SECRET_CONFIGURADO) {
  throw new Error("Producao exige JWT_SECRET ou FUSION_JWT_SECRET para proteger as sessoes.");
}

if (process.env.NODE_ENV === "production" && JWT_SECRET_CONFIGURADO.length < 32) {
  throw new Error("JWT_SECRET/FUSION_JWT_SECRET deve ter pelo menos 32 caracteres em producao.");
}

const PERFIS_PADRAO = {
  Administrador: ["*"],
  Gerente: [
    "dashboard", "alunos", "professores", "matriculas", "matriculas-pendentes",
    "financeiro", "mensalidades", "caixa", "comercial", "comercial-painel", "site-chat",
    "planos", "turmas", "relatorios"
  ],
  Recepcao: [
    "dashboard", "alunos", "matriculas", "matriculas-pendentes", "financeiro",
    "mensalidades", "caixa", "comercial", "comercial-painel", "site-chat", "checkin"
  ],
  Comercial: ["dashboard", "comercial", "comercial-painel", "site-chat", "matriculas-pendentes", "leads", "matricula-online"],
  Professor: ["professor-area"],
  Aluno: ["aluno-treinos", "aluno-avaliacao"]
};

function agoraISO() {
  return new Date().toISOString();
}

function gerarId(prefixo = "usr") {
  return `${prefixo}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function texto(valor) {
  return String(valor ?? "").trim();
}

function normalizar(valor) {
  return texto(valor).toLowerCase();
}

function senhaHashLegado(senha) {
  return crypto.createHash("sha256").update(String(senha || "")).digest("hex");
}

async function senhaBcrypt(senha) {
  return bcrypt.hash(String(senha || ""), BCRYPT_ROUNDS);
}

function pareceBcrypt(hash = "") {
  return /^\$2[aby]\$\d{2}\$/.test(String(hash || ""));
}

function textoSeguroIgual(a = "", b = "") {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}

async function verificarSenhaUsuario(usuario = {}, senha = "") {
  const hashAtual = String(usuario.senhaHash || "");
  const hashBcrypt = String(usuario.senhaBcrypt || "");

  for (const hash of [hashAtual, hashBcrypt].filter(pareceBcrypt)) {
    if (await bcrypt.compare(String(senha || ""), hash)) {
      return { ok: true, migrar: hash !== hashAtual };
    }
  }

  const hashLegado = String(usuario.senhaHashLegado || (!pareceBcrypt(hashAtual) ? hashAtual : ""));
  if (hashLegado && textoSeguroIgual(hashLegado, senhaHashLegado(senha))) {
    return { ok: true, migrar: true };
  }

  const senhaTexto = String(usuario.senhaAcesso || usuario.senhaPortal || "");
  if (senhaTexto && textoSeguroIgual(senhaTexto, String(senha || ""))) {
    return { ok: true, migrar: Boolean(!hashAtual && !hashBcrypt && !hashLegado) };
  }

  return { ok: false, migrar: false };
}

function semSenha(usuario = {}, opcoes = {}) {
  const { senha, senhaHash: _, senhaBcrypt: __, senhaHashLegado: ___, ...limpo } = usuario;
  if (!opcoes.incluirSenhaAcesso) {
    delete limpo.senhaAcesso;
    delete limpo.senhaPortal;
  }
  return limpo;
}

function permissoesPorPerfil(perfil = "Recepcao") {
  return PERFIS_PADRAO[perfil] || PERFIS_PADRAO.Recepcao;
}

function erro(mensagem, status = 500) {
  return Object.assign(new Error(mensagem), { status });
}

function senhaInicialAdmin() {
  const configurada = texto(process.env.FUSION_BOOTSTRAP_ADMIN_PASSWORD || process.env.FUSION_ADMIN_PASSWORD);
  if (configurada) {
    if (configurada.length < 10) {
      throw erro("FUSION_BOOTSTRAP_ADMIN_PASSWORD/FUSION_ADMIN_PASSWORD precisa ter pelo menos 10 caracteres.", 500);
    }
    return { senha: configurada, gerada: false };
  }

  return { senha: crypto.randomBytes(18).toString("base64url"), gerada: true };
}

async function gravarCredenciaisIniciais(senha) {
  const dataDir = path.resolve(process.cwd(), "data");
  const arquivo = path.join(dataDir, "CREDENCIAIS-INICIAIS.txt");
  const conteudo = [
    "FUSION ERP - CREDENCIAIS INICIAIS",
    "",
    "Administrador",
    "E-mail: admin@fusionerp.local",
    `Senha: ${senha}`,
    "",
    "Troque esta senha no primeiro acesso e remova este arquivo depois."
  ].join("\n");

  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(arquivo, `${conteudo}\n`, "utf8");
  console.warn("[Auth] Credenciais iniciais geradas em data/CREDENCIAIS-INICIAIS.txt. Troque a senha no primeiro acesso.");
}

async function garantirArquivoUsuarios() {
  const existentes = await lerJsonDuravel("usuarios.json", []);
  if (Array.isArray(existentes) && existentes.length) return;
  if (process.env.NODE_ENV === "production") throw erro("Nenhum usuário foi migrado para o Supabase. Implantação bloqueada por segurança.", 503);
  const senhaInicial = senhaInicialAdmin();
  const admin = {
    id: "usr_admin", nome: "Administrador Fusion", email: "admin@fusionerp.local",
    senhaHash: await senhaBcrypt(senhaInicial.senha), perfil: "Administrador", status: "ativo",
    senhaAcesso: senhaInicial.senha, senhaPortal: senhaInicial.senha,
    permissoes: ["*"], trocarSenhaNoPrimeiroAcesso: true, criadoEm: agoraISO(), atualizadoEm: agoraISO()
  };
  await salvarJsonDuravel("usuarios.json", [admin]);
  if (senhaInicial.gerada) await gravarCredenciaisIniciais(senhaInicial.senha);
}

async function lerUsuarios() {
  await garantirArquivoUsuarios();
  const lista = await lerJsonDuravel("usuarios.json", []);
  return Array.isArray(lista) ? lista : [];
}

async function salvarUsuarios(lista) {
  await salvarJsonDuravel("usuarios.json", lista);
}

function validarPayloadUsuario(payload = {}, editando = false) {
  const nome = texto(payload.nome);
  const email = normalizar(payload.email);
  const perfil = texto(payload.perfil || "Recepcao");
  const status = normalizar(payload.status || "ativo") === "inativo" ? "inativo" : "ativo";
  const senha = texto(payload.senha);

  if (!nome) throw erro("Nome é obrigatório.", 400);
  if (!email || !email.includes("@")) throw erro("E-mail inválido.", 400);
  if (!editando && !senha) throw erro("Senha é obrigatória.", 400);

  const permissoes = Array.isArray(payload.permissoes) && payload.permissoes.length
    ? payload.permissoes.map(texto).filter(Boolean)
    : permissoesPorPerfil(perfil);

  return { nome, email, perfil, status, senha, permissoes };
}

function gerarToken(usuario) {
  return jwt.sign(
    {
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      permissoes: usuario.permissoes || permissoesPorPerfil(usuario.perfil)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function extrairToken(authorization = "") {
  const valor = texto(authorization);
  if (!valor) return "";
  if (valor.toLowerCase().startsWith("bearer ")) return valor.slice(7).trim();
  return valor;
}

export function gerarTokenPortal({ sub, tipo, perfil = "", permissoes = [], nome = "" } = {}) {
  if (!sub || !tipo) throw erro("Não foi possível criar a sessão do portal.", 500);
  return jwt.sign(
    { sub: String(sub), tipo: String(tipo), perfil, permissoes, nome },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function validarTokenPortal(tokenOuAuthorization, tipoEsperado = "") {
  const token = extrairToken(tokenOuAuthorization);
  if (!token) throw erro("Sessão do portal ausente. Faça login novamente.", 401);
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw erro("Sessão do portal expirada ou inválida. Faça login novamente.", 401);
  }
  if (!payload?.sub || !payload?.tipo || (tipoEsperado && String(payload.tipo) !== String(tipoEsperado))) {
    throw erro("Sessão incompatível com este portal.", 401);
  }
  return payload;
}

export async function listarUsuarios() {
  const usuarios = await lerUsuarios();
  return usuarios.map(u => semSenha(u, { incluirSenhaAcesso: true })).sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
}

export async function obterUsuario(id) {
  const usuarios = await lerUsuarios();
  const usuario = usuarios.find(u => String(u.id) === String(id));
  if (!usuario) throw erro("Usuário não encontrado.", 404);
  return semSenha(usuario, { incluirSenhaAcesso: true });
}

export async function criarUsuario(payload = {}) {
  const usuarios = await lerUsuarios();
  const dados = validarPayloadUsuario(payload, false);

  if (usuarios.some(u => normalizar(u.email) === dados.email)) {
    throw erro("Já existe um usuário com este e-mail.", 409);
  }

  const novo = {
    id: gerarId(),
    nome: dados.nome,
    email: dados.email,
    senhaHash: await senhaBcrypt(dados.senha),
    senhaAcesso: dados.senha,
    senhaPortal: dados.senha,
    perfil: dados.perfil,
    status: dados.status,
    permissoes: dados.permissoes,
    criadoEm: agoraISO(),
    atualizadoEm: agoraISO()
  };

  usuarios.push(novo);
  await salvarUsuarios(usuarios);
  return semSenha(novo, { incluirSenhaAcesso: true });
}

export async function atualizarUsuario(id, payload = {}) {
  const usuarios = await lerUsuarios();
  const idx = usuarios.findIndex(u => String(u.id) === String(id));
  if (idx < 0) throw erro("Usuário não encontrado.", 404);

  const dados = validarPayloadUsuario(payload, true);
  const emailDuplicado = usuarios.some((u, i) => i !== idx && normalizar(u.email) === dados.email);
  if (emailDuplicado) throw erro("Já existe outro usuário com este e-mail.", 409);

  usuarios[idx] = {
    ...usuarios[idx],
    nome: dados.nome,
    email: dados.email,
    perfil: dados.perfil,
    status: dados.status,
    permissoes: dados.permissoes,
    atualizadoEm: agoraISO()
  };

  if (dados.senha) {
    usuarios[idx].senhaHash = await senhaBcrypt(dados.senha);
    usuarios[idx].senhaAcesso = dados.senha;
    usuarios[idx].senhaPortal = dados.senha;
    delete usuarios[idx].senhaBcrypt;
    delete usuarios[idx].senhaHashLegado;
  }

  await salvarUsuarios(usuarios);
  return semSenha(usuarios[idx], { incluirSenhaAcesso: true });
}

export async function alternarStatusUsuario(id) {
  const usuarios = await lerUsuarios();
  const idx = usuarios.findIndex(u => String(u.id) === String(id));
  if (idx < 0) throw erro("Usuário não encontrado.", 404);

  usuarios[idx].status = normalizar(usuarios[idx].status) === "ativo" ? "inativo" : "ativo";
  usuarios[idx].atualizadoEm = agoraISO();

  await salvarUsuarios(usuarios);
  return semSenha(usuarios[idx]);
}

export async function removerUsuario(id) {
  const usuarios = await lerUsuarios();
  const usuario = usuarios.find(u => String(u.id) === String(id));
  if (!usuario) throw erro("Usuário não encontrado.", 404);
  if (usuario.id === "usr_admin") throw erro("O administrador padrão não pode ser removido.", 400);

  await salvarUsuarios(usuarios.filter(u => String(u.id) !== String(id)));
  return { removido: true };
}

async function autenticarLocal(email, senha) {
  const usuarios = await lerUsuarios();
  const usuario = usuarios.find(u => normalizar(u.email) === normalizar(email));
  const verificacao = usuario ? await verificarSenhaUsuario(usuario, senha) : { ok: false };

  if (!usuario || !verificacao.ok) {
    throw erro("E-mail ou senha inválidos.", 401);
  }

  if (normalizar(usuario.status) !== "ativo") {
    throw erro("Usuário inativo. Procure o administrador.", 403);
  }

  if (verificacao.migrar) {
    usuario.senhaHash = await senhaBcrypt(senha);
    usuario.senhaAcesso = String(senha || "");
    usuario.senhaPortal = String(senha || "");
    delete usuario.senhaBcrypt;
    delete usuario.senhaHashLegado;
    usuario.atualizadoEm = agoraISO();
    await salvarUsuarios(usuarios);
  }

  const usuarioSessao = semSenha(usuario);

  return {
    ok: true,
    token: gerarToken(usuario),
    usuario: usuarioSessao
  };
}

async function validarTokenLocal(tokenOuAuthorization) {
  const token = extrairToken(tokenOuAuthorization);
  if (!token) throw erro("Token de autenticação ausente.", 401);

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw erro("Sessão expirada ou inválida. Faça login novamente.", 401);
  }

  const usuarios = await lerUsuarios();
  const usuario = usuarios.find(u => String(u.id) === String(payload.sub));
  if (!usuario) throw erro("Usuário não encontrado.", 401);
  if (normalizar(usuario.status) !== "ativo") throw erro("Usuário inativo. Procure o administrador.", 403);

  return semSenha(usuario);
}


export async function autenticar(email, senha) {
  if (supabaseAuthAtivo()) return autenticarSupabase(email, senha);
  return autenticarLocal(email, senha);
}

export async function validarToken(tokenOuAuthorization) {
  const token = extrairToken(tokenOuAuthorization);
  if (!token) throw erro("Token de autenticação ausente.", 401);
  if (supabaseAuthAtivo()) return validarTokenSupabase(token);
  return validarTokenLocal(token);
}

export async function obterPerfis() {
  return Object.entries(PERFIS_PADRAO).map(([perfil, permissoes]) => ({ perfil, permissoes }));
}

export async function usuarioPadrao() {
  await garantirArquivoUsuarios();
  const usuarios = await lerUsuarios();
  return semSenha(usuarios[0]);
}
