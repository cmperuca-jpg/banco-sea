(() => {
  "use strict";

  const MARCADOR = "__FUSION_TOP_MENU_BETA4__";
  if (window[MARCADOR]) return;
  window[MARCADOR] = true;

  const PAGINAS_SEM_MENU = [
    "/pages/aluno-avaliacao/",
    "/pages/aluno-treinos/",
    "/pages/aluno-login/",
    "/pages/professor-area/",
    "/pages/professor-login/",
    "/pages/treinos/",
    "/pages/avaliacoes/",
    "/pages/promocao/",
    "/pages/matricula-online/",
    "/pages/login/",
    "/pages/reconhecimento-facial/"
  ];

  const GRUPOS = [
    {
      nome: "Principal",
      itens: [
        { id: "dashboard", label: "Dashboard", href: "/pages/dashboard/index.html", perm: "dashboard" },
        { id: "bi-financeiro", label: "BI Financeiro", href: "/pages/bi-financeiro/index.html", perm: "relatorios" },
        { id: "admin", label: "Painel administrativo", href: "/pages/admin/index.html", perm: "admin" }
      ]
    },
    {
      nome: "Academia",
      itens: [
        { id: "alunos", label: "Alunos", href: "/pages/alunos/index.html", perm: "alunos" },
        { id: "professores", label: "Professores", href: "/pages/professores/index.html", perm: "professores" },
        { id: "modalidades", label: "Modalidades", href: "/pages/modalidades/index.html", perm: "modalidades" },
        { id: "planos", label: "Planos", href: "/pages/planos/index.html", perm: "planos" },
        { id: "turmas", label: "Turmas", href: "/pages/turmas/index.html", perm: "turmas" },
        { id: "agenda", label: "Agenda", href: "/pages/agenda/index.html", perm: "turmas" },
        { id: "checkin", label: "Check-in", href: "/pages/checkin/index.html", perm: "checkin" },
        { id: "access-engine", label: "Catracas", href: "/pages/access-engine/index.html", perm: "access-engine" },
        { id: "reconhecimento-facial", label: "Reconhecimento facial", href: "/pages/reconhecimento-facial/admin.html", perm: "alunos" }
      ]
    },
    {
      nome: "Comercial",
      itens: [
        { id: "comercial-painel", label: "CRM Comercial", href: "/pages/comercial-painel/index.html", perm: "comercial-painel" },
        { id: "site-academia", label: "Site da academia", href: "/pages/promocao/index.html", perm: "comercial", novaAba: true },
        { id: "matricula-online", label: "Matrícula Online", href: "/pages/matricula-online/index.html", perm: "matricula-online", novaAba: true },
        { id: "matriculas-pendentes", label: "Matrículas pendentes", href: "/pages/matriculas-pendentes/index.html", perm: "matriculas" },
        { id: "site-chat", label: "Chat do site", href: "/pages/site-chat/index.html", perm: "site-chat" },
        { id: "matriculas", label: "Matrículas", href: "/pages/matriculas/index.html", perm: "matriculas" }
      ]
    },
    {
      nome: "Financeiro",
      itens: [
        { id: "financeiro", label: "Financeiro", href: "/pages/financeiro/index.html", perm: "financeiro" },
        { id: "mensalidades", label: "Mensalidades", href: "/pages/mensalidades/index.html", perm: "mensalidades" },
        { id: "recebimentos", label: "Recebimentos", href: "/pages/recebimentos/index.html", perm: "financeiro" },
        { id: "pagamentos", label: "Pagamentos", href: "/pages/financeiro/pagamentos/index.html", perm: "financeiro" },
        { id: "caixa", label: "Caixa", href: "/pages/caixa/index.html", perm: "caixa" },
        { id: "relatorios", label: "Relatórios de caixa", href: "/pages/relatorios-caixa/index.html", perm: "relatorios" }
      ]
    },
    {
      nome: "Indicadores",
      itens: [
        { id: "bi-academia", label: "BI Academia", href: "/pages/bi-academia/index.html", perm: "relatorios" },
        { id: "bi-operacional", label: "BI Operacional", href: "/pages/bi-academia-operacional/index.html", perm: "relatorios" }
      ]
    },
    {
      nome: "Sistema",
      itens: [
        { id: "configuracoes", label: "Configurações", href: "/pages/configuracoes/index.html", perm: "admin" },
        { id: "instalar", label: "Instalar aplicativos", href: "/pages/instalar/index.html", perm: "admin" }
      ]
    }
  ];

  function caminhoNormalizado(valor = location.pathname) {
    const caminho = String(valor || "/").split("?")[0].split("#")[0];
    return caminho.endsWith("/index.html")
      ? caminho.slice(0, -"/index.html".length + 1)
      : (caminho.endsWith("/") ? caminho : `${caminho}/`);
  }

  function paginaSemMenu() {
    const atual = caminhoNormalizado();
    return PAGINAS_SEM_MENU.some(item => atual === caminhoNormalizado(item));
  }

  function usuarioAtual() {
    try {
      if (window.FusionAuth?.usuarioAtual) return window.FusionAuth.usuarioAtual();
    } catch {}
    try {
      return JSON.parse(localStorage.getItem("fusionUsuario") || "null");
    } catch {
      return null;
    }
  }

  function normalizar(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function podeVer(item) {
    try {
      if (window.FusionAuth?.temPermissao) {
        return window.FusionAuth.temPermissao([item.perm, item.id]);
      }
    } catch {}

    const user = usuarioAtual();
    const perfil = normalizar(user?.perfilOriginal || user?.perfil);
    if (["admin", "administrador", "proprietario"].includes(perfil)) return true;

    const permissoes = Array.isArray(user?.permissoes)
      ? user.permissoes.map(normalizar)
      : [];
    return permissoes.includes("*") || permissoes.includes(normalizar(item.perm)) || permissoes.includes(normalizar(item.id));
  }

  function itemAtivo(item) {
    return caminhoNormalizado(item.href) === caminhoNormalizado();
  }

  function gruposVisiveis() {
    return GRUPOS
      .map(grupo => ({ ...grupo, itens: grupo.itens.filter(podeVer) }))
      .filter(grupo => grupo.itens.length > 0);
  }

  function criarLink(item) {
    const link = document.createElement("a");
    link.className = "fusion-top-menu__link";
    link.href = item.href;
    link.textContent = item.label;
    link.dataset.menuId = item.id;

    if (itemAtivo(item)) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }

    if (item.novaAba) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = `${item.label} — abrir em nova janela`;
    }

    link.addEventListener("click", fecharMenus);
    return link;
  }

  function fecharMenus() {
    document.querySelectorAll(".fusion-top-menu__group.is-open").forEach(el => el.classList.remove("is-open"));
    const mega = document.querySelector("#fusionTopMenu .fusion-top-menu__mega");
    const gatilho = document.querySelector("#fusionTopMenu .fusion-top-menu__all-trigger");
    mega?.classList.remove("is-open");
    gatilho?.setAttribute("aria-expanded", "false");
  }

  function removerLayoutAntigo() {
    document.querySelectorAll(
      "#fusionSidebar,#fusionMenuGlobal,.fusion-menu-global," +
      ".fusion-v3-menu-toggle,.fusion-v3-menu-backdrop," +
      ".fusion-mobile-final-bar,.fusion-mobile-final-overlay,.fusion-breadcrumb"
    ).forEach(el => el.remove());

    document.documentElement.classList.remove("fusion-sem-menu", "fusion-com-sidebar", "fusion-menu-open");
    document.body?.classList.remove("fusion-sem-menu", "fusion-com-sidebar", "fusion-menu-open");
  }

  function criarMegaMenu(grupos) {
    const mega = document.createElement("div");
    mega.className = "fusion-top-menu__mega";
    mega.id = "fusionTopMenuMega";

    const grade = document.createElement("div");
    grade.className = "fusion-top-menu__mega-grid";

    grupos.forEach(grupo => {
      const atual = grupo.itens.some(itemAtivo);
      const secao = document.createElement("section");
      secao.className = "fusion-top-menu__mega-group";
      if (atual) secao.classList.add("is-current", "is-open");

      const titulo = document.createElement("button");
      titulo.type = "button";
      titulo.className = "fusion-top-menu__mega-title";
      titulo.innerHTML = `<span>${grupo.nome}</span><span class="fusion-top-menu__caret" aria-hidden="true"></span>`;
      titulo.addEventListener("click", evento => {
        evento.stopPropagation();
        secao.classList.toggle("is-open");
      });

      const links = document.createElement("div");
      links.className = "fusion-top-menu__mega-links";
      grupo.itens.forEach(item => links.appendChild(criarLink(item)));

      secao.append(titulo, links);
      grade.appendChild(secao);
    });

    mega.appendChild(grade);
    return mega;
  }

  function criarMenuSuperior() {
    if (!document.body || paginaSemMenu()) return;

    removerLayoutAntigo();
    document.querySelector("#fusionTopMenu")?.remove();

    document.documentElement.classList.add("fusion-menu-superior-ativo", "fusion-layout-fullwidth");
    document.body.classList.add("fusion-menu-superior-ativo", "fusion-layout-fullwidth");

    const grupos = gruposVisiveis();
    const nav = document.createElement("nav");
    nav.id = "fusionTopMenu";
    nav.className = "fusion-top-menu";
    nav.setAttribute("aria-label", "Menu principal do Fusion Sistema");

    const interno = document.createElement("div");
    interno.className = "fusion-top-menu__inner";

    const todos = document.createElement("div");
    todos.className = "fusion-top-menu__all";

    const gatilhoTodos = document.createElement("button");
    gatilhoTodos.type = "button";
    gatilhoTodos.className = "fusion-top-menu__all-trigger";
    gatilhoTodos.setAttribute("aria-controls", "fusionTopMenuMega");
    gatilhoTodos.setAttribute("aria-expanded", "false");
    gatilhoTodos.innerHTML = `
      <span class="fusion-top-menu__hamburger" aria-hidden="true"><i></i><i></i><i></i></span>
      <span>Todos os módulos</span>
      <span class="fusion-top-menu__caret" aria-hidden="true"></span>
    `;

    todos.appendChild(gatilhoTodos);

    const categorias = document.createElement("div");
    categorias.className = "fusion-top-menu__categories";

    grupos.forEach(grupo => {
      const caixa = document.createElement("div");
      caixa.className = "fusion-top-menu__group";
      if (grupo.itens.some(itemAtivo)) caixa.classList.add("is-current");

      const gatilho = document.createElement("button");
      gatilho.type = "button";
      gatilho.className = "fusion-top-menu__group-trigger";
      gatilho.setAttribute("aria-expanded", "false");
      gatilho.innerHTML = `<span>${grupo.nome}</span><span class="fusion-top-menu__caret" aria-hidden="true"></span>`;

      const dropdown = document.createElement("div");
      dropdown.className = "fusion-top-menu__dropdown";
      grupo.itens.forEach(item => dropdown.appendChild(criarLink(item)));

      gatilho.addEventListener("click", evento => {
        evento.stopPropagation();
        const abrir = !caixa.classList.contains("is-open");
        fecharMenus();
        caixa.classList.toggle("is-open", abrir);
        gatilho.setAttribute("aria-expanded", abrir ? "true" : "false");
      });

      caixa.append(gatilho, dropdown);
      categorias.appendChild(caixa);
    });

    const mega = criarMegaMenu(grupos);

    gatilhoTodos.addEventListener("click", evento => {
      evento.stopPropagation();
      const abrir = !mega.classList.contains("is-open");
      fecharMenus();
      mega.classList.toggle("is-open", abrir);
      gatilhoTodos.setAttribute("aria-expanded", abrir ? "true" : "false");
    });

    interno.append(todos, categorias, mega);
    nav.appendChild(interno);
    nav.addEventListener("click", evento => evento.stopPropagation());
    document.body.prepend(nav);

    document.dispatchEvent(new CustomEvent("fusion:menu-superior-pronto"));
  }

  let agendado = false;
  function agendarMenu() {
    if (agendado) return;
    agendado = true;
    queueMicrotask(() => {
      agendado = false;
      criarMenuSuperior();
    });
  }

  const carregarLayoutAnterior = window.carregarLayout;
  window.carregarLayout = function carregarLayoutBeta4(...args) {
    const resultado = typeof carregarLayoutAnterior === "function"
      ? carregarLayoutAnterior.apply(this, args)
      : undefined;
    agendarMenu();
    return resultado;
  };

  document.addEventListener("click", fecharMenus);
  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") fecharMenus();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", agendarMenu, { once: true });
  } else {
    agendarMenu();
  }

  window.addEventListener("load", () => {
    agendarMenu();
    setTimeout(agendarMenu, 120);
  }, { once: true });
})();
