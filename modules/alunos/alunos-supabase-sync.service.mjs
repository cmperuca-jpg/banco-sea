import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim();
const SUPABASE_PUBLIC_KEY = String(
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ""
).trim();

function texto(valor) {
  return String(valor ?? "").trim();
}

function somenteNumeros(valor) {
  return texto(valor).replace(/\D/g, "");
}

function dataISO(valor) {
  const bruto = texto(valor);
  if (!bruto) return null;
  const iso = bruto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = bruto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

function statusAluno(aluno = {}) {
  const valor = texto(aluno.status || aluno.situacao || aluno.statusMatricula).toLowerCase();
  if (["ativo", "ativa", "active"].includes(valor)) return "ativo";
  if (["trancado", "trancada"].includes(valor)) return "trancado";
  if (["cancelado", "cancelada", "desligado", "desligada"].includes(valor)) return "cancelado";
  if (["pendente", "pre-matriculado", "pré-matriculado", "pre_matriculado"].includes(valor)) return "pendente";
  return "inativo";
}

function removerSegredos(valor) {
  if (Array.isArray(valor)) return valor.map(removerSegredos);
  if (!valor || typeof valor !== "object") return valor;

  const saida = {};
  const chavesBloqueadas = new Set([
    "senha", "password", "senhaAluno", "senhaAcesso", "senhaPortal", "portalSenha",
    "token", "accessToken", "refreshToken"
  ]);

  for (const [chave, conteudo] of Object.entries(valor)) {
    if (chavesBloqueadas.has(chave)) continue;
    if (/^data:image\//i.test(String(conteudo || ""))) continue;
    saida[chave] = removerSegredos(conteudo);
  }
  return saida;
}

function fotoUrl(aluno = {}) {
  const candidato = texto(aluno.foto_url || aluno.fotoUrl || aluno.avatar_url || aluno.avatarUrl || aluno.foto);
  return candidato && !/^data:/i.test(candidato) ? candidato : null;
}

function registroSupabase(aluno, academiaId) {
  const legacyId = texto(aluno.id);
  if (!legacyId) throw new Error("Aluno local sem identificador.");

  return {
    academia_id: academiaId,
    legacy_id: legacyId,
    nome: texto(aluno.nome || aluno.name || aluno.alunoNome) || "Aluno sem nome",
    cpf: somenteNumeros(aluno.cpf) || null,
    data_nascimento: dataISO(aluno.data_nascimento || aluno.dataNascimento || aluno.nascimento),
    email: texto(aluno.email) || null,
    telefone: texto(aluno.telefone || aluno.celular || aluno.whatsapp) || null,
    foto_url: fotoUrl(aluno),
    matricula: texto(aluno.matricula || aluno.numeroMatricula || aluno.numero_matricula) || null,
    status: statusAluno(aluno),
    dados: removerSegredos(aluno),
    atualizado_em: aluno.atualizado_em || aluno.atualizadoEm || aluno.updated_at || new Date().toISOString(),
    excluido_em: null
  };
}

function clienteComToken(token) {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error("Novo Supabase não configurado no arquivo .env.");
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

export function configuracaoSincronizacaoAlunos() {
  return {
    configurado: Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY),
    modo: "local-primary-cloud-copy",
    tabela: "alunos"
  };
}

export async function sincronizarAlunos({ alunos = [], academiaId, token }) {
  const academia = texto(academiaId);
  const acesso = texto(token);
  if (!academia) throw new Error("Academia não identificada na sessão.");
  if (!acesso) throw new Error("Token Supabase ausente na requisição.");

  const registros = alunos.map(aluno => registroSupabase(aluno, academia));
  const cliente = clienteComToken(acesso);
  const tamanhoLote = 100;
  let enviados = 0;

  for (let inicio = 0; inicio < registros.length; inicio += tamanhoLote) {
    const lote = registros.slice(inicio, inicio + tamanhoLote);
    const { error } = await cliente
      .from("alunos")
      .upsert(lote, { onConflict: "academia_id,legacy_id", ignoreDuplicates: false });
    if (error) throw new Error(`Falha ao sincronizar alunos: ${error.message}`);
    enviados += lote.length;
  }

  return {
    ok: true,
    enviados,
    totalLocal: registros.length,
    academiaId: academia,
    sincronizadoEm: new Date().toISOString()
  };
}

export async function sincronizarAluno({ aluno, academiaId, token }) {
  const resultado = await sincronizarAlunos({ alunos: [aluno], academiaId, token });
  return { ...resultado, alunoId: texto(aluno?.id) };
}
