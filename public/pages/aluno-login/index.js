const $ = (id) => document.getElementById(id);
const CONFIG = window.FusionAlunoConfig || {};

function mensagem(texto, tipo = "") {
  const el = $("mensagem");
  el.textContent = texto || "";
  el.className = `msg ${tipo}`.trim();
}

function rota(nome, fallback) {
  return CONFIG.rotas?.[nome] || fallback;
}

function destinoAposLogin(padrao) {
  const next = new URLSearchParams(location.search).get("next") || "";
  const rotasAluno = [
    rota("treino", "/pages/aluno-treinos/"),
    rota("avaliacao", "/pages/aluno-avaliacao/"),
    "/pages/promocao-90-dias/",
    rota("inicio", "/pages/portal-aluno-emergencial/")
  ].map((valor) => new URL(valor, location.origin).pathname.replace(/index\.html$/i, ""));

  try {
    const destino = new URL(next, location.origin);
    const permitido = destino.origin === location.origin
      && rotasAluno.some((rotaPermitida) => destino.pathname.startsWith(rotaPermitida));
    return permitido ? `${destino.pathname}${destino.search}${destino.hash}` : padrao;
  } catch {
    return padrao;
  }
}

function alternarVisibilidadeSenha() {
  const campo = $("senha");
  const botao = $("alternarSenha");
  const mostrar = campo.type === "password";

  campo.type = mostrar ? "text" : "password";
  botao.setAttribute("aria-pressed", mostrar ? "true" : "false");
  botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  campo.focus({ preventScroll: true });
  campo.setSelectionRange(campo.value.length, campo.value.length);
}

async function entrar() {
  const login = $("login").value.trim();
  const senha = $("senha").value.trim();

  if (!login || !senha) {
    mensagem("Informe o login e a senha.", "erro");
    (!login ? $("login") : $("senha")).focus();
    return;
  }

  const botao = $("entrar");
  botao.disabled = true;
  botao.textContent = "Validando...";
  mensagem("Validando seu acesso...", "info");

  try {
    const resposta = await fetch("/api/treinos/aluno-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, senha })
    });
    const data = await resposta.json().catch(() => ({}));
    if (!resposta.ok || !data.ok) throw new Error(data.mensagem || "Login inválido.");

    localStorage.setItem("fusion_aluno_treino_login", JSON.stringify(data.dados));
    localStorage.setItem("fusion_aluno_treino_selecionado", JSON.stringify({
      alunoId: data.dados.alunoId,
      alunoNome: data.dados.alunoNome
    }));
    window.FusionAlunoSessao?.registrarLogin(data.dados);

    mensagem("Acesso liberado. Abrindo o portal...", "ok");
    const inicio = rota("inicio", "/pages/portal-aluno-emergencial/index.html");
    const destinoPadrao = `${inicio}${inicio.includes("?") ? "&" : "?"}alunoId=${encodeURIComponent(data.dados.alunoId)}`;
    location.href = destinoAposLogin(destinoPadrao);
  } catch (erro) {
    mensagem(erro.message || "Erro ao entrar.", "erro");
    $("senha").focus();
    $("senha").select();
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
}

$("loginFormAluno")?.addEventListener("submit", (evento) => {
  evento.preventDefault();
  entrar();
});
$("alternarSenha")?.addEventListener("click", alternarVisibilidadeSenha);

const motivo = new URLSearchParams(location.search).get("motivo");
if (motivo === "outro_acesso") {
  mensagem("Este aluno entrou em outro aparelho ou janela. Faça login novamente.", "erro");
}
