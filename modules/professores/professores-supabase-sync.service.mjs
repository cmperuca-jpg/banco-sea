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

function lista(valor) {
  const itens = Array.isArray(valor) ? valor : texto(valor).split(",");
  return [...new Set(itens.map(texto).filter(Boolean))];
}

function statusProfessor(professor = {}) {
  const valor = texto(professor.status || professor.situacao).toLowerCase();
  if (["ativo", "ativa", "active"].includes(valor)) return "ativo";
  if (["cancelado", "cancelada", "excluido", "excluído"].includes(valor)) return "cancelado";
  if (["bloqueado", "bloqueada"].includes(valor) || professor.bloqueado === true) return "bloqueado";
  return "inativo";
}

function removerSegredos(valor) {
  if (Array.isArray(valor)) return valor.map(removerSegredos);
  if (!valor || typeof valor !== "object") return valor;

  const saida = {};
  const chavesBloqueadas = new Set([
    "senha", "senhahash", "senhaacesso", "senhaportal", "password",
    "token", "accesstoken", "refreshtoken", "arquivo_base64", "foto_base64"
  ]);

  for (const [chave, conteudo] of Object.entries(valor)) {
    const chaveNormalizada = String(chave).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (chavesBloqueadas.has(chaveNormalizada)) continue;
    if (typeof conteudo === "string" && /^data:/i.test(conteudo)) continue;
    saida[chave] = removerSegredos(conteudo);
  }
  return saida;
}

function fotoUrl(professor = {}) {
  const candidato = texto(
    professor.foto_url || professor.fotoUrl || professor.avatar_url || professor.avatarUrl || professor.foto
  );
  return candidato && !/^data:/i.test(candidato) ? candidato : null;
}

function registroSupabase(professor, academiaId) {
  const legacyId = texto(professor.id || professor._id || professor.codigo);
  if (!legacyId) throw new Error("Professor local sem identificador.");

  const status = statusProfessor(professor);
  const especialidades = lista([
    ...lista(professor.especialidades),
    ...lista(professor.especialidade)
  ]);

  return {
    academia_id: academiaId,
    legacy_id: legacyId,
    nome: texto(professor.nome || professor.name || professor.professorNome) || "Professor sem nome",
    cpf: somenteNumeros(professor.cpf) || null,
    email: texto(professor.email) || null,
    telefone: texto(professor.telefone || professor.celular || professor.whatsapp) || null,
    foto_url: fotoUrl(professor),
    cref: texto(professor.cref) || null,
    especialidades,
    modalidades: lista(professor.modalidades),
    status,
    ativo: status === "ativo",
    dados: {
      ...removerSegredos(professor),
      data_nascimento: dataISO(professor.dataNascimento || professor.data_nascimento || professor.nascimento)
    },
    atualizado_em: professor.atualizado_em || professor.atualizadoEm || professor.updated_at || new Date().toISOString(),
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

export function configuracaoSincronizacaoProfessores() {
  return {
    configurado: Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY),
    modo: "local-primary-cloud-copy",
    tabela: "professores"
  };
}

export async function sincronizarProfessores({ professores = [], academiaId, token }) {
  const academia = texto(academiaId);
  const acesso = texto(token);
  if (!academia) throw new Error("Academia não identificada na sessão.");
  if (!acesso) throw new Error("Token Supabase ausente na requisição.");

  const registros = professores.map(professor => registroSupabase(professor, academia));
  const cliente = clienteComToken(acesso);
  const tamanhoLote = 100;
  let enviados = 0;

  for (let inicio = 0; inicio < registros.length; inicio += tamanhoLote) {
    const lote = registros.slice(inicio, inicio + tamanhoLote);
    const { error } = await cliente
      .from("professores")
      .upsert(lote, { onConflict: "academia_id,legacy_id", ignoreDuplicates: false });
    if (error) throw new Error(`Falha ao sincronizar professores: ${error.message}`);
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

export async function sincronizarProfessor({ professor, academiaId, token }) {
  const resultado = await sincronizarProfessores({ professores: [professor], academiaId, token });
  return { ...resultado, professorId: texto(professor?.id || professor?._id || professor?.codigo) };
}

export async function marcarProfessorExcluido({ professor, professorId, academiaId, token }) {
  const academia = texto(academiaId);
  const acesso = texto(token);
  const legacyId = texto(professorId || professor?.id || professor?._id || professor?.codigo);
  if (!academia) throw new Error("Academia não identificada na sessão.");
  if (!acesso) throw new Error("Token Supabase ausente na requisição.");
  if (!legacyId) throw new Error("Professor local sem identificador.");

  const agora = new Date().toISOString();
  const cliente = clienteComToken(acesso);
  const { error } = await cliente
    .from("professores")
    .update({ ativo: false, status: "cancelado", excluido_em: agora, atualizado_em: agora })
    .eq("academia_id", academia)
    .eq("legacy_id", legacyId);

  if (error) throw new Error(`Falha ao registrar exclusão do professor: ${error.message}`);
  return { ok: true, professorId: legacyId, excluidoEm: agora };
}
