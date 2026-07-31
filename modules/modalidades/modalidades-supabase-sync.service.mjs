import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim();
const SUPABASE_PUBLIC_KEY = String(
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ""
).trim();

function texto(valor) {
  return String(valor ?? "").trim();
}

function numero(valor, padrao = 0) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : padrao;
}

function statusModalidade(modalidade = {}) {
  const valor = texto(modalidade.status || modalidade.situacao).toLowerCase();
  return ["inativa", "inativo", "inactive"].includes(valor) ? "inativa" : "ativa";
}

function dataHora(valor, padrao = null) {
  const bruto = texto(valor);
  if (!bruto) return padrao;
  const data = new Date(bruto);
  return Number.isNaN(data.getTime()) ? padrao : data.toISOString();
}

function removerConteudoPesado(valor) {
  if (Array.isArray(valor)) return valor.map(removerConteudoPesado);
  if (!valor || typeof valor !== "object") return valor;

  const saida = {};
  for (const [chave, conteudo] of Object.entries(valor)) {
    const chaveNormalizada = String(chave).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (["senha", "password", "token", "accesstoken", "refreshtoken"].includes(chaveNormalizada)) continue;
    if (typeof conteudo === "string" && /^data:/i.test(conteudo)) continue;
    saida[chave] = removerConteudoPesado(conteudo);
  }
  return saida;
}

function registroSupabase(modalidade, academiaId) {
  const legacyId = texto(modalidade.id || modalidade._id || modalidade.codigo);
  if (!legacyId) throw new Error("Modalidade local sem identificador.");

  const atualizadoEm = dataHora(
    modalidade.atualizado_em || modalidade.atualizadoEm || modalidade.updated_at,
    new Date().toISOString()
  );

  return {
    academia_id: academiaId,
    legacy_id: legacyId,
    nome: texto(modalidade.nome) || "Modalidade sem nome",
    categoria: texto(modalidade.categoria) || "Geral",
    descricao: texto(modalidade.descricao) || null,
    professor_responsavel: texto(
      modalidade.professorResponsavel || modalidade.professor_responsavel
    ) || null,
    duracao_minutos: Math.max(1, Math.round(numero(
      modalidade.duracaoMinutos ?? modalidade.duracao_minutos,
      60
    ))),
    capacidade_maxima: Math.max(1, Math.round(numero(
      modalidade.capacidadeMaxima ?? modalidade.capacidade_maxima,
      20
    ))),
    valor_sugerido: Math.max(0, numero(
      modalidade.valorSugerido ?? modalidade.valor_sugerido,
      0
    )),
    cor: texto(modalidade.cor) || null,
    icone: texto(modalidade.icone) || null,
    status: statusModalidade(modalidade),
    dados: removerConteudoPesado(modalidade),
    criado_em: dataHora(
      modalidade.criado_em || modalidade.criadoEm || modalidade.created_at,
      atualizadoEm
    ),
    atualizado_em: atualizadoEm,
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

export function configuracaoSincronizacaoModalidades() {
  return {
    configurado: Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY),
    modo: "local-primary-cloud-copy",
    tabela: "modalidades"
  };
}

export async function sincronizarModalidades({ modalidades = [], academiaId, token }) {
  const academia = texto(academiaId);
  const acesso = texto(token);
  if (!academia) throw new Error("Academia não identificada na sessão.");
  if (!acesso) throw new Error("Token Supabase ausente na requisição.");

  const registros = modalidades.map(item => registroSupabase(item, academia));
  const cliente = clienteComToken(acesso);
  const tamanhoLote = 100;
  let enviados = 0;

  for (let inicio = 0; inicio < registros.length; inicio += tamanhoLote) {
    const lote = registros.slice(inicio, inicio + tamanhoLote);
    const { error } = await cliente
      .from("modalidades")
      .upsert(lote, { onConflict: "academia_id,legacy_id", ignoreDuplicates: false });

    if (error) throw new Error(`Falha ao sincronizar modalidades: ${error.message}`);
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

export async function sincronizarModalidade({ modalidade, academiaId, token }) {
  const resultado = await sincronizarModalidades({
    modalidades: [modalidade],
    academiaId,
    token
  });

  return {
    ...resultado,
    modalidadeId: texto(modalidade?.id || modalidade?._id || modalidade?.codigo)
  };
}

export async function marcarModalidadeExcluida({ modalidadeId, academiaId, token }) {
  const academia = texto(academiaId);
  const acesso = texto(token);
  const legacyId = texto(modalidadeId);
  if (!academia) throw new Error("Academia não identificada na sessão.");
  if (!acesso) throw new Error("Token Supabase ausente na requisição.");
  if (!legacyId) throw new Error("Modalidade local sem identificador.");

  const agora = new Date().toISOString();
  const cliente = clienteComToken(acesso);
  const { error } = await cliente
    .from("modalidades")
    .update({ status: "inativa", excluido_em: agora, atualizado_em: agora })
    .eq("academia_id", academia)
    .eq("legacy_id", legacyId);

  if (error) throw new Error(`Falha ao registrar exclusão da modalidade: ${error.message}`);

  return {
    ok: true,
    modalidadeId: legacyId,
    excluidoEm: agora
  };
}
