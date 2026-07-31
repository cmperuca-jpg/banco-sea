(function () {
  "use strict";

  const CHAVE_ULTIMA = "fusionCloudSyncUltimaV1";
  const CHAVE_STATUS = "fusionCloudSyncStatusV1";
  const INTERVALO_RECONCILIACAO = 24 * 60 * 60 * 1000;
  const ATRASO_INICIAL = 4500;
  const ENDPOINTS = [
    { id: "alunos", url: "/api/alunos/sincronizar-supabase" },
    { id: "professores", url: "/api/professores/sincronizar-supabase" },
    { id: "modalidades", url: "/api/modalidades/sincronizar-supabase" }
  ];

  let executando = null;
  let timer = null;

  function usuarioPodeSincronizar() {
    const usuario = window.FusionAuth?.usuarioAtual?.();
    if (!usuario || !window.FusionAuth?.estaLogado?.()) return false;
    if (usuario.authProvider !== "supabase") return false;
    const perfil = String(usuario.perfil || usuario.perfilOriginal || "").toLowerCase();
    return !["aluno", "professor", "responsavel_tecnico"].includes(perfil);
  }

  function ultimaExecucao() {
    return Number(localStorage.getItem(CHAVE_ULTIMA) || 0);
  }

  function salvarStatus(status) {
    localStorage.setItem(CHAVE_STATUS, JSON.stringify(status));
    document.dispatchEvent(new CustomEvent("fusion:cloud-sync", { detail: status }));
  }

  async function sincronizarModulo(modulo) {
    const resposta = await fetch(modulo.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store"
    });
    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok || json.ok === false || json.sucesso === false) {
      throw new Error(json.mensagem || json.erro || `HTTP ${resposta.status}`);
    }
    return {
      modulo: modulo.id,
      ok: true,
      enviados: Number(json.enviados || 0),
      sincronizadoEm: json.sincronizadoEm || new Date().toISOString()
    };
  }

  async function sincronizarAgora({ forcar = false } = {}) {
    if (executando) return executando;
    if (!usuarioPodeSincronizar() || !navigator.onLine) return null;
    if (!forcar && Date.now() - ultimaExecucao() < INTERVALO_RECONCILIACAO) return null;

    executando = (async () => {
      const inicio = new Date().toISOString();
      const resultados = [];
      salvarStatus({ estado: "sincronizando", inicio, resultados: [] });

      for (const modulo of ENDPOINTS) {
        try {
          resultados.push(await sincronizarModulo(modulo));
        } catch (erro) {
          resultados.push({ modulo: modulo.id, ok: false, erro: erro.message || String(erro) });
        }
      }

      const falhas = resultados.filter(item => !item.ok);
      const status = {
        estado: falhas.length ? "parcial" : "sincronizado",
        inicio,
        fim: new Date().toISOString(),
        resultados,
        falhas: falhas.length
      };

      if (!falhas.length) localStorage.setItem(CHAVE_ULTIMA, String(Date.now()));
      salvarStatus(status);
      return status;
    })();

    try {
      return await executando;
    } finally {
      executando = null;
    }
  }

  function agendar() {
    clearTimeout(timer);
    timer = setTimeout(() => sincronizarAgora().catch(() => {}), ATRASO_INICIAL);
  }

  window.FusionCloudSync = {
    sincronizarAgora: () => sincronizarAgora({ forcar: true }),
    status() {
      try { return JSON.parse(localStorage.getItem(CHAVE_STATUS) || "null"); }
      catch { return null; }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", agendar, { once: true });
  } else {
    agendar();
  }

  window.addEventListener("online", () => setTimeout(() => sincronizarAgora().catch(() => {}), 2500));
  window.addEventListener("storage", evento => {
    if (evento.key === "fusionToken" && evento.newValue) agendar();
  });
})();
