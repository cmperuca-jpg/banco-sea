const $ = (id) => document.getElementById(id);
const CONFIG = window.FusionAlunoConfig || {};
let sessao = null;
let statusAtual = null;
let alunoDetalhe = null;
let comprovanteBase64 = "";

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataHora(valor) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "-";
}
function dataBR(valor) {
  const texto = String(valor || "").slice(0, 10);
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : (texto || "-");
}
function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[caractere]));
}
function rota(nome, fallback) {
  return CONFIG.rotas?.[nome] || fallback;
}
function api(nome, fallback, parametros = {}) {
  let endereco = CONFIG.api?.[nome] || fallback;
  Object.entries(parametros).forEach(([chave, valor]) => {
    endereco = endereco.replace(`{${chave}}`, encodeURIComponent(String(valor)));
  });
  return endereco;
}
function authHeaders(headers = {}) {
  const token = sessao?.token || sessao?.accessToken || sessao?.jwt || "";
  return token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
}
function alunoId() {
  return String(new URLSearchParams(location.search).get("alunoId") || sessao?.alunoId || sessao?.id || "");
}
function mensagem(texto, erro = false) {
  const elemento = $("mensagem");
  elemento.textContent = texto || "";
  elemento.className = `mensagem ${erro ? "erro" : "ok"}`;
}
function extrairLista(payload) {
  if (Array.isArray(payload)) return payload;
  for (const chave of ["alunos", "dados", "data", "itens", "registros"]) {
    if (Array.isArray(payload?.[chave])) return payload[chave];
  }
  return [];
}
function idAlunoRegistro(aluno) {
  return String(aluno?.id ?? aluno?._id ?? aluno?.codigo ?? aluno?.alunoId ?? aluno?.aluno_id ?? aluno?.matricula ?? "");
}
function nomeAluno(aluno = {}) {
  return aluno.nome || aluno.nomeCompleto || aluno.alunoNome || aluno.name || sessao?.alunoNome || sessao?.nome || "Aluno";
}
function fotoAluno(aluno = {}) {
  return aluno.foto_base64 || aluno.foto || aluno.fotoBase64 || aluno.avatar || aluno.imagem || "";
}
function iniciais(nome) {
  return String(nome || "Aluno")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("") || "AL";
}

async function safeFetchJson(url) {
  try {
    const resposta = await fetch(url, { cache: "no-store", headers: authHeaders() });
    const json = await resposta.json().catch(() => ({}));
    return resposta.ok ? json : null;
  } catch {
    return null;
  }
}

async function carregarAlunoDetalhe() {
  const id = alunoId();
  if (!id) return null;

  const direto = await safeFetchJson(api("alunoDetalhe", "/api/alunos/{alunoId}", { alunoId: id }));
  if (direto) return direto.aluno || direto.dados || direto.data || direto;

  const listaPayload = await safeFetchJson(api("alunos", "/api/alunos"));
  return extrairLista(listaPayload || {}).find((aluno) => idAlunoRegistro(aluno) === id) || null;
}

function aplicarPerfilAluno() {
  const nome = nomeAluno(alunoDetalhe || {});
  const primeiroNome = nome.split(/\s+/)[0] || "aluno";
  $("tituloPortalAluno").textContent = `Olá, ${primeiroNome}.`;
  $("saudacao").textContent = "Acompanhe seu treino, sua situação financeira e seus acessos rápidos.";
  $("fotoFallback").textContent = iniciais(nome);

  const plano = alunoDetalhe?.planoNome || alunoDetalhe?.plano || alunoDetalhe?.planoAtual || "Plano não informado";
  const status = alunoDetalhe?.status || sessao?.status || "Ativo";
  $("planoAluno").textContent = plano;
  $("statusAluno").textContent = `Cadastro ${String(status).toLowerCase()}`;

  const foto = fotoAluno(alunoDetalhe || {});
  const imagem = $("fotoAluno");
  const fallback = $("fotoFallback");
  if (!foto) {
    imagem.classList.add("hidden");
    fallback.classList.remove("hidden");
    return;
  }

  imagem.onload = () => {
    imagem.classList.remove("hidden");
    fallback.classList.add("hidden");
  };
  imagem.onerror = () => {
    imagem.classList.add("hidden");
    fallback.classList.remove("hidden");
  };
  imagem.src = foto;
}

function configurarRotas() {
  const id = encodeURIComponent(alunoId());
  const montar = (nome, fallback) => {
    const base = rota(nome, fallback);
    return `${base}${base.includes("?") ? "&" : "?"}alunoId=${id}`;
  };

  $("linkMarca").href = montar("inicio", "/pages/portal-aluno-emergencial/index.html");
  $("linkTreino").href = montar("treino", "/pages/aluno-treinos/index.html");
  $("linkAvaliacao").href = montar("avaliacao", "/pages/aluno-avaliacao/index.html");
  $("linkSite").href = rota("siteAcademia", "/pages/promocao/index.html");
}

function carregarSessao() {
  try {
    sessao = JSON.parse(localStorage.getItem("fusion_aluno_treino_login") || "null");
  } catch {
    sessao = null;
  }

  if (!sessao || !alunoId()) {
    const login = rota("login", "/pages/aluno-login/index.html");
    location.replace(`${login}?next=${encodeURIComponent(location.pathname + location.search)}`);
    return false;
  }
  configurarRotas();
  return true;
}

function atualizarAcoesPix(disponivel, rotulo = "Pagar via Pix") {
  const botao = $("irParaPix");
  botao.disabled = !disponivel;
  botao.textContent = rotulo;
}

async function carregar() {
  $("cardPix").classList.add("hidden");
  $("cardStatus").innerHTML = '<div class="loading"><span class="loading-dot"></span>Consultando sua situação financeira...</div>';
  atualizarAcoesPix(false, "Consultando Pix...");

  try {
    const url = api("statusPix", "/api/emergency-access/alunos/{alunoId}/status", { alunoId: alunoId() });
    const resposta = await fetch(url, { cache: "no-store", headers: authHeaders() });
    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok || json.ok === false) throw new Error(json.mensagem || "Não foi possível consultar a liberação.");
    statusAtual = json;
    render();
  } catch (erro) {
    $("cardStatus").innerHTML = `<div class="erro-box"><strong>Não foi possível atualizar agora.</strong><span>${esc(erro.message)}</span></div>`;
    $("resumoFinanceiro").textContent = "Indisponível";
    $("resumoFinanceiroDetalhe").textContent = "Tente atualizar novamente.";
    $("resumoAcesso").textContent = "Não consultado";
    atualizarAcoesPix(false, "Pix indisponível");
  }
}

function render() {
  const status = statusAtual;
  if (!status) return;

  if (status.acessoAtivo) {
    $("cardStatus").innerHTML = `
      <div class="status-layout status-sucesso">
        <div class="status-icone">✓</div>
        <div>
          <span class="card-kicker">Acesso liberado</span>
          <h2>Acesso emergencial ativo</h2>
          <p>Seu comprovante já foi enviado. O acesso temporário está registrado até <strong>${esc(dataHora(status.acessoAtivo.acessoValidoAte))}</strong>.</p>
          <small>Competência utilizada: ${esc(status.competencia || "-")}.</small>
        </div>
      </div>`;
    $("resumoFinanceiro").textContent = "Comprovante enviado";
    $("resumoFinanceiroDetalhe").textContent = "A recepção poderá realizar a conferência.";
    $("resumoAcesso").textContent = "Ativo";
    $("resumoAcessoDetalhe").textContent = `Válido até ${dataHora(status.acessoAtivo.acessoValidoAte)}.`;
    $("proximoPasso").textContent = "Ir para o treino";
    $("proximoPassoDetalhe").textContent = "Seu acesso temporário está ativo.";
    atualizarAcoesPix(false, "Pix já enviado");
    return;
  }

  if (!status.elegivel) {
    $("cardStatus").innerHTML = `
      <div class="status-layout status-neutro">
        <div class="status-icone">i</div>
        <div>
          <span class="card-kicker">Situação atual</span>
          <h2>Liberação emergencial indisponível</h2>
          <p>${esc(status.motivo || "Não existe mensalidade vencida elegível.")}</p>
          ${status.tentativa ? `<small>Tentativa utilizada em ${esc(dataHora(status.tentativa.criadoEm))}.</small>` : ""}
        </div>
      </div>`;
    $("resumoFinanceiro").textContent = "Sem cobrança elegível";
    $("resumoFinanceiroDetalhe").textContent = status.motivo || "Nenhuma pendência disponível para Pix emergencial.";
    $("resumoAcesso").textContent = status.tentativa ? "Utilizado" : "Indisponível";
    $("resumoAcessoDetalhe").textContent = status.tentativa ? "A tentativa mensal já foi usada." : "Não há liberação necessária agora.";
    atualizarAcoesPix(false, "Pix indisponível");
    return;
  }

  const divida = status.divida?.item || {};
  const valor = divida.valorRestante ?? divida.saldo ?? divida.total ?? divida.valorOriginal ?? divida.valor;
  const vencimento = divida.vencimento || divida.dataVencimento || "-";
  $("cardStatus").innerHTML = `
    <div class="status-layout status-alerta">
      <div class="status-icone">!</div>
      <div class="status-conteudo">
        <span class="card-kicker">Atenção</span>
        <h2>Mensalidade em atraso</h2>
        <p>Regularize pelo Pix abaixo e envie o comprovante para solicitar acesso temporário.</p>
        <div class="status-resumo">
          <div><span>Vencimento</span><strong>${esc(dataBR(vencimento))}</strong></div>
          <div><span>Valor</span><strong>${esc(moeda(valor))}</strong></div>
          <div><span>Tentativa</span><strong>1 por mês</strong></div>
        </div>
      </div>
    </div>`;

  $("resumoFinanceiro").textContent = moeda(valor);
  $("resumoFinanceiroDetalhe").textContent = `Vencimento em ${dataBR(vencimento)}.`;
  $("resumoAcesso").textContent = "Disponível";
  $("resumoAcessoDetalhe").textContent = "Uma solicitação emergencial neste mês.";
  $("proximoPasso").textContent = "Pagar via Pix";
  $("proximoPassoDetalhe").textContent = "Copie o código e envie o comprovante.";

  if (!status.pix?.configured) {
    $("cardStatus").insertAdjacentHTML("beforeend", '<div class="erro-box"><strong>Pix não configurado.</strong><span>Entre em contato com a recepção da academia.</span></div>');
    atualizarAcoesPix(false, "Pix não configurado");
    return;
  }

  $("pixValor").textContent = moeda(status.pix.value);
  $("pixCodigo").value = status.pix.code || "";
  $("cardPix").classList.remove("hidden");
  atualizarAcoesPix(true, "Pagar via Pix");
}

$("irParaPix").onclick = () => {
  if ($("irParaPix").disabled) return;
  $("cardPix").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => $("copiarPix").focus(), 500);
};

$("copiarPix").onclick = async () => {
  const codigo = $("pixCodigo").value;
  if (!codigo) return mensagem("O código Pix ainda não está disponível.", true);
  try {
    await navigator.clipboard.writeText(codigo);
    mensagem("Código Pix copiado.");
  } catch {
    $("pixCodigo").select();
    document.execCommand("copy");
    mensagem("Código Pix copiado.");
  }
};

$("comprovante").onchange = () => {
  const arquivo = $("comprovante").files[0];
  comprovanteBase64 = "";
  $("preview").classList.add("hidden");
  if (!arquivo) return;

  const maxMb = Number(CONFIG.pix?.tamanhoMaximoComprovanteMb || 8);
  if (arquivo.size > maxMb * 1024 * 1024) {
    mensagem(`O arquivo deve ter no máximo ${maxMb} MB.`, true);
    $("comprovante").value = "";
    return;
  }

  const leitor = new FileReader();
  leitor.onload = () => {
    comprovanteBase64 = String(leitor.result || "");
    $("preview").src = comprovanteBase64;
    $("preview").classList.remove("hidden");
  };
  leitor.readAsDataURL(arquivo);
};

$("enviar").onclick = async () => {
  if (!comprovanteBase64) return mensagem("Selecione a imagem do comprovante.", true);

  const horas = Number(CONFIG.pix?.validadeAcessoHoras || 24);
  if (!confirm(`Ao enviar, sua tentativa mensal será utilizada e o acesso poderá ser liberado por ${horas} horas. Continuar?`)) return;

  const botao = $("enviar");
  botao.disabled = true;
  botao.textContent = "Enviando comprovante...";
  mensagem("Enviando comprovante e solicitando a liberação...");

  try {
    const resposta = await fetch(api("comprovantePix", "/api/emergency-access/comprovante"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ alunoId: alunoId(), comprovanteBase64 })
    });
    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok || json.ok === false) throw new Error(json.mensagem || "Falha ao enviar o comprovante.");
    mensagem(`Comprovante enviado. Acesso temporário registrado até ${dataHora(json.solicitacao?.acessoValidoAte)}.`);
    await carregar();
  } catch (erro) {
    mensagem(erro.message || "Falha ao enviar o comprovante.", true);
  } finally {
    botao.disabled = false;
    botao.textContent = "Enviar comprovante e solicitar acesso";
  }
};

$("sair").onclick = () => {
  localStorage.removeItem("fusion_aluno_treino_login");
  localStorage.removeItem("fusion_aluno_treino_selecionado");
  location.replace(rota("login", "/pages/aluno-login/index.html"));
};

(async function iniciarPortalAluno() {
  if (!carregarSessao()) return;
  alunoDetalhe = await carregarAlunoDetalhe();
  aplicarPerfilAluno();
  await carregar();
})();
