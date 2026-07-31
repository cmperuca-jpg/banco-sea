(function () {
  "use strict";

  const LOGIN_URL = "/pages/login/index.html";
  const STORAGE_KEYS = [
    "fusionToken",
    "fusionRefreshToken",
    "fusionTokenExpiresAt",
    "fusionAuthProvider",
    "fusionUsuario",
    "usuarioLogado",
    "usuarioNome",
    "usuarioEmail",
    "usuarioPerfil"
  ];

  const estiloPendente = document.createElement("style");
  estiloPendente.textContent = "html.fusion-auth-pendente{visibility:hidden!important}";
  document.head.appendChild(estiloPendente);

  const fetchOriginal = window.fetch.bind(window);
  let renovacaoEmAndamento = null;

  function texto(valor) { return String(valor || "").trim(); }
  function normalizar(valor) { return texto(valor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function lista(valor) { return Array.isArray(valor) ? valor : (valor === undefined || valor === null || valor === "" ? [] : [valor]); }

  function perfilSlug(perfilOriginal) {
    const perfil = normalizar(perfilOriginal || "Administrador");
    if (perfil.includes("responsavel tecnico") || perfil.includes("responsavel-tecnico") || perfil.includes("responsavel_tecnico")) return "responsavel_tecnico";
    if (perfil.includes("proprietario") || perfil.includes("administrador") || perfil === "admin") return "admin";
    if (perfil.includes("prof")) return "professor";
    if (perfil.includes("aluno")) return "aluno";
    if (perfil.includes("comercial")) return "comercial";
    if (perfil.includes("recepc")) return "recepcao";
    if (perfil.includes("gerente")) return "gerente";
    return "admin";
  }

  function normalizarUsuario(usuario = {}) {
    const perfilOriginal = usuario.perfilOriginal || usuario.papel || usuario.perfil || usuario.tipo || usuario.role || "Administrador";
    const perfil = perfilSlug(perfilOriginal);
    let permissoes = Array.isArray(usuario.permissoes) ? usuario.permissoes.filter(Boolean) : [];
    if ((perfil === "admin" || normalizar(perfilOriginal) === "administrador" || normalizar(perfilOriginal) === "proprietario") && !permissoes.length) permissoes = ["*"];

    return {
      id: usuario.id || usuario.usuarioId || "local-admin",
      nome: usuario.nome || usuario.name || "Administrador",
      email: usuario.email || "",
      telefone: usuario.telefone || "",
      avatarUrl: usuario.avatarUrl || usuario.avatar_url || "",
      perfil,
      perfilOriginal,
      permissoes,
      professorId: usuario.professorId || usuario.id || "",
      academiaId: usuario.academiaId || usuario.academia_id || "",
      academiaNome: usuario.academiaNome || usuario.academia_nome || "",
      academiaSlug: usuario.academiaSlug || usuario.academia_slug || "",
      academiaTimezone: usuario.academiaTimezone || usuario.academia_timezone || "America/Sao_Paulo",
      authProvider: usuario.authProvider || localStorage.getItem("fusionAuthProvider") || "local",
      acessoTodosAlunos: usuario.acessoTodosAlunos === true
    };
  }

  function salvarSessao(token, usuario, sessao = {}) {
    if (!token) throw new Error("Token de autenticação ausente.");
    const user = normalizarUsuario(usuario);

    localStorage.setItem("fusionToken", token);
    localStorage.setItem("fusionUsuario", JSON.stringify(user));
    localStorage.setItem("usuarioLogado", "true");
    localStorage.setItem("usuarioNome", user.nome);
    localStorage.setItem("usuarioEmail", user.email);
    localStorage.setItem("usuarioPerfil", user.perfil);

    const provider = sessao.authProvider || user.authProvider;
    if (provider) localStorage.setItem("fusionAuthProvider", provider);

    if (Object.prototype.hasOwnProperty.call(sessao, "refreshToken") && sessao.refreshToken) {
      localStorage.setItem("fusionRefreshToken", sessao.refreshToken);
    }

    if (sessao.expiresAt) {
      localStorage.setItem("fusionTokenExpiresAt", String(sessao.expiresAt));
    }

    return user;
  }

  function tokenAtual() { return localStorage.getItem("fusionToken") || ""; }
  function refreshTokenAtual() { return localStorage.getItem("fusionRefreshToken") || ""; }
  function authProviderAtual() { return localStorage.getItem("fusionAuthProvider") || "local"; }

  function usuarioAtual() {
    try {
      const bruto = localStorage.getItem("fusionUsuario");
      if (bruto) return normalizarUsuario(JSON.parse(bruto));
    } catch {}
    return null;
  }

  function estaLogado() { return Boolean(tokenAtual() && usuarioAtual()); }

  function limparSessao(redirecionar = true) {
    STORAGE_KEYS.forEach(chave => localStorage.removeItem(chave));
    if (redirecionar) location.href = LOGIN_URL;
  }

  function permissoesAtual() {
    const user = usuarioAtual();
    return Array.isArray(user?.permissoes) ? user.permissoes : [];
  }

  function temPermissao(moduloOuPermissoes) {
    const user = usuarioAtual();
    if (!user) return false;
    if (user.perfil === "admin" || normalizar(user.perfilOriginal) === "administrador" || normalizar(user.perfilOriginal) === "proprietario") return true;

    const permissoes = permissoesAtual().map(normalizar);
    if (permissoes.includes("*")) return true;

    const solicitadas = lista(moduloOuPermissoes).map(normalizar).filter(Boolean);
    if (!solicitadas.length) return true;

    return solicitadas.some(item => permissoes.includes(item) || normalizar(user.perfil) === item || normalizar(user.perfilOriginal) === item);
  }

  function podeAcessar(user, perfisPermitidos) {
    const permitidos = lista(perfisPermitidos).map(normalizar).filter(Boolean);
    if (!permitidos.length) return true;
    if (temPermissao(permitidos)) return true;
    return permitidos.includes(normalizar(user?.perfil)) || permitidos.includes(normalizar(user?.perfilOriginal));
  }

  function tokenPertoDeExpirar() {
    if (authProviderAtual() !== "supabase") return false;
    const expiraEmSegundos = Number(localStorage.getItem("fusionTokenExpiresAt") || 0);
    if (!expiraEmSegundos) return false;
    return (expiraEmSegundos * 1000) - Date.now() <= 60_000;
  }

  async function renovarSessao() {
    const refreshToken = refreshTokenAtual();
    if (authProviderAtual() !== "supabase" || !refreshToken) return null;
    if (renovacaoEmAndamento) return renovacaoEmAndamento;

    renovacaoEmAndamento = (async () => {
      const resp = await fetchOriginal("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store"
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.ok === false || !json.token) {
        throw new Error(json.mensagem || "Não foi possível renovar a sessão.");
      }
      salvarSessao(json.token, json.usuario, json);
      return json.token;
    })();

    try {
      return await renovacaoEmAndamento;
    } finally {
      renovacaoEmAndamento = null;
    }
  }

  async function garantirTokenValido() {
    if (tokenPertoDeExpirar()) {
      try {
        await renovarSessao();
      } catch {
        limparSessao(true);
        return "";
      }
    }
    return tokenAtual();
  }

  async function validarSessao() {
    let token = await garantirTokenValido();
    if (!token) return null;

    try {
      let resp = await fetchOriginal("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });

      if (resp.status === 401 && authProviderAtual() === "supabase" && refreshTokenAtual()) {
        token = await renovarSessao();
        resp = await fetchOriginal("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
      }

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.ok === false) throw new Error(json.mensagem || "Sessão inválida.");

      const usuario = salvarSessao(token, json.usuario, {
        authProvider: json.autenticacao?.provider || authProviderAtual()
      });
      document.documentElement.classList.remove("fusion-auth-pendente");
      return usuario;
    } catch {
      limparSessao(true);
      return null;
    }
  }

  function proteger(perfisPermitidos) {
    document.documentElement.classList.add("fusion-auth-pendente");
    if (!estaLogado()) {
      const destino = encodeURIComponent(location.pathname + location.search);
      location.href = `${LOGIN_URL}?next=${destino}`;
      return false;
    }

    const user = usuarioAtual();
    if (!podeAcessar(user, perfisPermitidos)) {
      alert("Acesso não permitido para este usuário.");
      location.href = destinoPorPerfil(user);
      return false;
    }

    setTimeout(() => validarSessao().then((sessao) => {
      if (!sessao) return;
      if (!podeAcessar(sessao, perfisPermitidos)) {
        alert("Acesso não permitido para este usuário.");
        location.href = destinoPorPerfil(sessao);
        return;
      }
      filtrarElementosPorPermissao();
    }).catch(() => limparSessao(true)), 0);

    return true;
  }

  function cabecalhoAuth(headers = {}) {
    const token = tokenAtual();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
  }

  async function fetchAuth(url, opcoes = {}) {
    return window.fetch(url, opcoes);
  }

  function filtrarElementosPorPermissao(root = document) {
    root.querySelectorAll("[data-permissao]").forEach(elemento => {
      const regras = String(elemento.getAttribute("data-permissao") || "").split(",").map(valor => valor.trim()).filter(Boolean);
      if (regras.length && !temPermissao(regras)) elemento.remove();
    });
  }

  function sair() { limparSessao(true); }

  function destinoPorPerfil(usuario) {
    const perfil = String(usuario?.perfil || "").toLowerCase();
    if (perfil === "professor" || perfil === "responsavel_tecnico") return "/pages/professor-area/index.html";
    if (perfil === "aluno") return "/pages/aluno-login/index.html";
    if (perfil === "comercial") return "/pages/comercial-painel/index.html";
    return "/pages/dashboard/index.html";
  }

  async function login(email, senha) {
    const resp = await fetchOriginal("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: texto(email), senha }),
      cache: "no-store"
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || json.ok === false) throw new Error(json.mensagem || json.erro || "Falha no login.");
    return salvarSessao(json.token, json.usuario, json);
  }

  function urlApiInterna(input) {
    try {
      const raw = typeof input === "string" ? input : input?.url;
      const url = new URL(raw, location.origin);
      return url.origin === location.origin && url.pathname.startsWith("/api/");
    } catch {
      return false;
    }
  }

  function rotaAuthPublica(input) {
    try {
      const raw = typeof input === "string" ? input : input?.url;
      const pathname = new URL(raw, location.origin).pathname;
      return ["/api/auth/login", "/api/auth/refresh", "/api/auth/config"].includes(pathname);
    } catch {
      return false;
    }
  }

  window.fetch = async function fusionFetch(input, opcoes = {}) {
    if (!urlApiInterna(input) || rotaAuthPublica(input)) return fetchOriginal(input, opcoes);

    let token = await garantirTokenValido();
    const montarOpcoes = tokenAtualizado => {
      const headers = new Headers(opcoes.headers || (input instanceof Request ? input.headers : undefined));
      if (tokenAtualizado && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${tokenAtualizado}`);
      return { ...opcoes, headers };
    };

    let resp = await fetchOriginal(input, montarOpcoes(token));
    if (resp.status === 401 && authProviderAtual() === "supabase" && refreshTokenAtual()) {
      try {
        token = await renovarSessao();
        resp = await fetchOriginal(input, montarOpcoes(token));
      } catch {
        limparSessao(true);
      }
    }
    return resp;
  };

  window.FusionAuth = {
    login,
    renovarSessao,
    salvarSessao,
    usuarioAtual,
    tokenAtual,
    estaLogado,
    validarSessao,
    temPermissao,
    permissoesAtual,
    cabecalhoAuth,
    fetchAuth,
    filtrarElementosPorPermissao,
    proteger,
    sair,
    limparSessao,
    destinoPorPerfil
  };

  window.protegerPagina = function protegerPagina(perfisPermitidos) { return proteger(perfisPermitidos); };
  window.sair = sair;

  if (!document.querySelector('script[data-fusion-cloud-sync]')) {
    const scriptSync = document.createElement("script");
    scriptSync.src = "/assets/js/fusion-cloud-sync.js";
    scriptSync.defer = true;
    scriptSync.dataset.fusionCloudSync = "true";
    document.head.appendChild(scriptSync);
  }
})();
