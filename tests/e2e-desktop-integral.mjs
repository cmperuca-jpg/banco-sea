import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { _electron as electron } from "playwright";

const root = process.cwd();
const outputRoot = path.join(root, "artifacts", "e2e-integral");
const screenshotsRoot = path.join(outputRoot, "screenshots");
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(screenshotsRoot, { recursive: true });

const executablePath = process.env.FUSION_E2E_EXECUTABLE
  || path.join(root, "release", "win-unpacked", "Fusion Sistema.exe");

const paginas = [
  ["dashboard", "/pages/dashboard/index.html"],
  ["bi-financeiro", "/pages/bi-financeiro/index.html"],
  ["admin", "/pages/admin/index.html"],
  ["alunos", "/pages/alunos/index.html"],
  ["professores", "/pages/professores/index.html"],
  ["modalidades", "/pages/modalidades/index.html"],
  ["planos", "/pages/planos/index.html"],
  ["turmas", "/pages/turmas/index.html"],
  ["agenda", "/pages/agenda/index.html"],
  ["checkin", "/pages/checkin/index.html"],
  ["catracas", "/pages/access-engine/index.html"],
  ["reconhecimento-facial", "/pages/reconhecimento-facial/admin.html"],
  ["crm-comercial", "/pages/comercial-painel/index.html"],
  ["matriculas-pendentes", "/pages/matriculas-pendentes/index.html"],
  ["chat-site", "/pages/site-chat/index.html"],
  ["matriculas", "/pages/matriculas/index.html"],
  ["financeiro", "/pages/financeiro/index.html"],
  ["mensalidades", "/pages/mensalidades/index.html"],
  ["recebimentos", "/pages/recebimentos/index.html"],
  ["pagamentos", "/pages/financeiro/pagamentos/index.html"],
  ["caixa", "/pages/caixa/index.html"],
  ["relatorios-caixa", "/pages/relatorios-caixa/index.html"],
  ["bi-academia", "/pages/bi-academia/index.html"],
  ["bi-operacional", "/pages/bi-academia-operacional/index.html"],
  ["configuracoes", "/pages/configuracoes/index.html"],
  ["instalar", "/pages/instalar/index.html"]
];

const paginasSemMenu = [
  "/pages/aluno-avaliacao/",
  "/pages/aluno-treinos/",
  "/pages/aluno-login/",
  "/pages/professor-area/",
  "/pages/professor-login/",
  "/pages/treinos/",
  "/pages/avaliacoes/",
  "/pages/promocao/",
  "/pages/matricula-online/",
  "/pages/login/"
];

function normalizarCaminho(valor) {
  const limpo = String(valor || "").replaceAll("\\", "/");
  return limpo.endsWith("/index.html")
    ? limpo.slice(0, -"/index.html".length + 1)
    : (limpo.endsWith("/") ? limpo : `${limpo}/`);
}

function auditarFontes() {
  const pagesRoot = path.join(root, "public", "pages");
  const falhas = [];
  let totalHtml = 0;
  let totalComLayout = 0;

  function visitar(diretorio) {
    for (const entrada of fs.readdirSync(diretorio, { withFileTypes: true })) {
      const absoluto = path.join(diretorio, entrada.name);
      if (entrada.isDirectory()) {
        visitar(absoluto);
        continue;
      }
      if (!entrada.isFile() || !/\.html?$/i.test(entrada.name)) continue;

      totalHtml += 1;
      const relativo = `/${path.relative(path.join(root, "public"), absoluto).replaceAll("\\", "/")}`;
      const html = fs.readFileSync(absoluto, "utf8");
      if (!html.includes("/assets/js/fusion-layout.js")) continue;
      totalComLayout += 1;

      const semMenu = paginasSemMenu.some(item => normalizarCaminho(relativo) === normalizarCaminho(item));
      if (semMenu) continue;

      if (!html.includes("/assets/js/fusion-top-menu-beta5.js")) {
        falhas.push(`${relativo}: não carrega fusion-top-menu-beta5.js`);
      }
      if (!html.includes("/assets/css/fusion-menu-offset-beta5.css")) {
        falhas.push(`${relativo}: não carrega fusion-menu-offset-beta5.css`);
      }
    }
  }

  visitar(pagesRoot);

  const instalar = fs.readFileSync(path.join(pagesRoot, "instalar", "index.html"), "utf8");
  for (const trecho of [
    "/assets/js/fusion-top-menu-beta5.js",
    "/assets/css/fusion-menu-offset-beta5.css",
    "data-fusion-voltar-sistema",
    "cmperuca-jpg/banco-sea/releases/latest/download/FusionSistema-Setup.exe"
  ]) {
    if (!instalar.includes(trecho)) falhas.push(`/pages/instalar/index.html: falta ${trecho}`);
  }

  return { totalHtml, totalComLayout, falhas };
}

function respostaApi(caminho, metodo) {
  const usuario = {
    id: "e2e-admin",
    nome: "Administrador E2E",
    email: "e2e@fusion.local",
    perfil: "admin",
    perfilOriginal: "Proprietário",
    permissoes: ["*"],
    academiaId: "e2e-academia",
    academiaNome: "Academia E2E",
    authProvider: "supabase"
  };

  if (caminho === "/api/auth/me") {
    return { ok: true, usuario, autenticacao: { provider: "supabase" } };
  }
  if (caminho === "/api/auth/refresh") {
    return {
      ok: true,
      token: "e2e-token",
      refreshToken: "e2e-refresh",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      usuario,
      authProvider: "supabase"
    };
  }
  if (caminho === "/api/auth/config") {
    return { ok: true, provider: "supabase" };
  }
  if (caminho === "/api/health") {
    return { ok: true, sistema: "Fusion Sistema E2E" };
  }

  return {
    ok: true,
    total: 0,
    dados: [],
    data: [],
    itens: [],
    items: [],
    registros: [],
    alunos: [],
    professores: [],
    modalidades: [],
    planos: [],
    turmas: [],
    aulas: [],
    agenda: [],
    checkins: [],
    usuarios: [],
    leads: [],
    matriculas: [],
    mensalidades: [],
    recebimentos: [],
    pagamentos: [],
    movimentos: [],
    categorias: [],
    notificacoes: [],
    indicadores: {},
    resumo: {},
    resultado: metodo === "GET" ? [] : {}
  };
}

function gerarHtmlRelatorio(relatorio) {
  const linhas = relatorio.paginas.map(item => {
    const estado = item.ok ? "APROVADA" : "FALHOU";
    const detalhes = item.falhas.length
      ? `<ul>${item.falhas.map(falha => `<li>${escapeHtml(falha)}</li>`).join("")}</ul>`
      : "Sem falhas.";
    return `<tr>
      <td>${escapeHtml(item.nome)}</td>
      <td>${escapeHtml(item.caminho)}</td>
      <td class="${item.ok ? "ok" : "bad"}">${estado}</td>
      <td>${detalhes}</td>
      <td>${item.consoleErrors.length}</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
  <html lang="pt-BR"><head><meta charset="utf-8"><title>Teste integral Fusion</title>
  <style>
    body{font:14px Arial;margin:24px;color:#172b3a}h1{margin-bottom:6px}
    table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #ccd8df;padding:9px;vertical-align:top}
    th{background:#eef4f7}.ok{color:#16714d;font-weight:800}.bad{color:#b42333;font-weight:800}
    code{background:#eef2f4;padding:2px 5px;border-radius:4px}
  </style></head><body>
  <h1>Fusion Sistema — teste integral Windows</h1>
  <p>Versão: <strong>${escapeHtml(relatorio.versao)}</strong></p>
  <p>Resultado: <strong class="${relatorio.ok ? "ok" : "bad"}">${relatorio.ok ? "APROVADO" : "REPROVADO"}</strong></p>
  <p>Páginas: ${relatorio.aprovadas}/${relatorio.totalPaginas} aprovadas.</p>
  <p>Auditoria de fontes: ${relatorio.auditoriaFontes.falhas.length ? "falhou" : "aprovada"}.</p>
  <table><thead><tr><th>Página</th><th>Caminho</th><th>Estado</th><th>Detalhes</th><th>Erros JS</th></tr></thead>
  <tbody>${linhas}</tbody></table>
  </body></html>`;
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const auditoriaFontes = auditarFontes();
const pacote = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const relatorio = {
  versao: pacote.version,
  executavel: executablePath,
  auditoriaFontes,
  paginas: [],
  totalPaginas: paginas.length,
  aprovadas: 0,
  ok: false
};

if (!fs.existsSync(executablePath)) {
  throw new Error(`Executável empacotado não encontrado: ${executablePath}`);
}

let electronApp = null;
let pagina = null;
let errosPaginaAtual = [];

try {
  electronApp = await electron.launch({
    executablePath,
    args: ["--fusion-e2e"],
    timeout: 120_000,
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      FUSION_E2E: "1"
    }
  });

  pagina = await electronApp.firstWindow({ timeout: 120_000 });
  await pagina.setViewportSize({ width: 1365, height: 768 });
  pagina.on("dialog", async dialogo => dialogo.dismiss().catch(() => {}));
  pagina.on("pageerror", erro => errosPaginaAtual.push(`pageerror: ${erro.message}`));
  pagina.on("console", mensagem => {
    if (mensagem.type() === "error") errosPaginaAtual.push(`console: ${mensagem.text()}`);
  });

  await pagina.route("**/api/**", async rota => {
    const requisicao = rota.request();
    const url = new URL(requisicao.url());
    const corpo = respostaApi(url.pathname, requisicao.method());
    await rota.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(corpo)
    });
  });

  const usuario = {
    id: "e2e-admin",
    nome: "Administrador E2E",
    email: "e2e@fusion.local",
    perfil: "admin",
    perfilOriginal: "Proprietário",
    permissoes: ["*"],
    academiaId: "e2e-academia",
    academiaNome: "Academia E2E",
    authProvider: "supabase"
  };

  await pagina.evaluate(usuarioE2E => {
    localStorage.setItem("fusionToken", "e2e-token");
    localStorage.setItem("fusionRefreshToken", "e2e-refresh");
    localStorage.setItem("fusionTokenExpiresAt", String(Math.floor(Date.now() / 1000) + 3600));
    localStorage.setItem("fusionAuthProvider", "supabase");
    localStorage.setItem("fusionUsuario", JSON.stringify(usuarioE2E));
    localStorage.setItem("usuarioLogado", "true");
    localStorage.setItem("usuarioNome", usuarioE2E.nome);
    localStorage.setItem("usuarioEmail", usuarioE2E.email);
    localStorage.setItem("usuarioPerfil", usuarioE2E.perfil);
  }, usuario);

  const origem = new URL(pagina.url()).origin;

  for (const [nome, caminho] of paginas) {
    errosPaginaAtual = [];
    const falhas = [];
    let resposta = null;

    try {
      resposta = await pagina.goto(`${origem}${caminho}?e2e=${Date.now()}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000
      });

      await pagina.waitForTimeout(1400);
      await pagina.evaluate(() => window.scrollTo(0, 0));
      await pagina.waitForTimeout(350);

      if (!resposta || !resposta.ok()) {
        falhas.push(`HTTP da página: ${resposta?.status() ?? "sem resposta"}`);
      }

      if (new URL(pagina.url()).pathname.includes("/pages/login/")) {
        falhas.push("a página redirecionou para o login");
      }

      const metricas = await pagina.evaluate(() => {
        const menu = document.getElementById("fusionTopMenu");
        const spacer = document.getElementById("fusionTopMenuSpacer");
        const raiz = document.querySelector(".fusion-page-root-integral");
        const linksCss = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const cssFalhos = linksCss
          .filter(link => !link.sheet)
          .map(link => link.getAttribute("href") || link.href);

        const visivel = elemento => {
          if (!(elemento instanceof Element)) return false;
          const estilo = getComputedStyle(elemento);
          if (estilo.display === "none" || estilo.visibility === "hidden" || Number(estilo.opacity) === 0) return false;
          const rect = elemento.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        const menuRect = menu?.getBoundingClientRect() || null;
        const candidatos = Array.from(document.querySelectorAll(
          "h1,h2,h3,button,a,input,select,textarea,.page-actions,.top-actions,.header-actions,.page-header,.topo,.toolbar,.fusion-card,.card,.panel,.kpi-grid"
        )).filter(elemento => {
          if (!visivel(elemento)) return false;
          if (elemento.closest("#fusionTopMenu")) return false;
          if (elemento.closest(".modal,.modal-backdrop,.modal-overlay,.popup,.dialog,[role='dialog']")) return false;
          return getComputedStyle(elemento).position !== "fixed";
        });

        const sobrepostos = menuRect
          ? candidatos.filter(elemento => {
              const rect = elemento.getBoundingClientRect();
              return rect.top < menuRect.bottom - 1 && rect.bottom > menuRect.top + 1;
            }).slice(0, 12).map(elemento => {
              const rect = elemento.getBoundingClientRect();
              return {
                tag: elemento.tagName,
                id: elemento.id || "",
                classe: String(elemento.className || "").slice(0, 100),
                texto: String(elemento.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
                top: Math.round(rect.top),
                bottom: Math.round(rect.bottom)
              };
            })
          : [];

        const raizRect = raiz?.getBoundingClientRect() || null;
        const botaoVoltar = document.querySelector("[data-fusion-voltar-sistema] .fusion-install-back,.fusion-install-back");

        return {
          titulo: document.title,
          menuExiste: Boolean(menu),
          menuRect: menuRect ? {
            top: Math.round(menuRect.top),
            bottom: Math.round(menuRect.bottom),
            height: Math.round(menuRect.height),
            position: getComputedStyle(menu).position
          } : null,
          spacerExiste: Boolean(spacer),
          spacerHeight: spacer ? Math.round(spacer.getBoundingClientRect().height) : 0,
          raizExiste: Boolean(raiz),
          raizTop: raizRect ? Math.round(raizRect.top) : null,
          cssFalhos,
          sobrepostos,
          larguraDocumento: document.documentElement.scrollWidth,
          larguraViewport: window.innerWidth,
          botaoVoltarExiste: Boolean(botaoVoltar),
          bodyClasses: document.body.className
        };
      });

      if (!metricas.titulo) falhas.push("document.title vazio");
      if (!metricas.menuExiste) falhas.push("menu superior ausente");
      if (!metricas.spacerExiste) falhas.push("espaçador do menu ausente");
      if (!metricas.raizExiste) falhas.push("raiz visual não identificada");

      if (metricas.menuRect) {
        if (metricas.menuRect.position !== "fixed") falhas.push(`menu não está fixo: ${metricas.menuRect.position}`);
        if (metricas.menuRect.top !== 0) falhas.push(`menu não começa em 0: top=${metricas.menuRect.top}`);
        if (metricas.menuRect.height < 45) falhas.push(`altura do menu inválida: ${metricas.menuRect.height}`);
        if (Math.abs(metricas.spacerHeight - metricas.menuRect.height) > 2) {
          falhas.push(`espaçador ${metricas.spacerHeight}px difere do menu ${metricas.menuRect.height}px`);
        }
      }

      if (metricas.cssFalhos.length) {
        falhas.push(`CSS não carregado: ${metricas.cssFalhos.join(", ")}`);
      }
      if (metricas.sobrepostos.length) {
        falhas.push(`conteúdo sob o menu: ${JSON.stringify(metricas.sobrepostos)}`);
      }
      if (metricas.larguraDocumento > metricas.larguraViewport + 4) {
        falhas.push(`rolagem horizontal: documento=${metricas.larguraDocumento}, viewport=${metricas.larguraViewport}`);
      }
      if (nome === "instalar" && !metricas.botaoVoltarExiste) {
        falhas.push("página Instalar sem botão Voltar ao sistema");
      }

      if (nome === "dashboard") {
        const gatilhoPrincipal = pagina.locator(".fusion-top-menu__group-trigger", { hasText: "Principal" }).first();
        await gatilhoPrincipal.click();
        const dropdown = gatilhoPrincipal.locator("xpath=..").locator(".fusion-top-menu__dropdown");
        const aberto = await dropdown.evaluate(elemento => {
          const estilo = getComputedStyle(elemento);
          const rect = elemento.getBoundingClientRect();
          return estilo.display !== "none" && rect.width > 0 && rect.height > 0;
        });
        if (!aberto) falhas.push("dropdown Principal não abriu");
        await pagina.keyboard.press("Escape");
      }

      await pagina.screenshot({
        path: path.join(screenshotsRoot, `${String(relatorio.paginas.length + 1).padStart(2, "0")}-${nome}.png`),
        fullPage: false
      });

      relatorio.paginas.push({
        nome,
        caminho,
        ok: falhas.length === 0,
        falhas,
        metricas,
        consoleErrors: [...new Set(errosPaginaAtual)].slice(0, 30)
      });
    } catch (erro) {
      falhas.push(`exceção do teste: ${erro.stack || erro.message}`);
      relatorio.paginas.push({
        nome,
        caminho,
        ok: false,
        falhas,
        metricas: null,
        consoleErrors: [...new Set(errosPaginaAtual)].slice(0, 30)
      });
    }
  }

  const instalacao = relatorio.paginas.find(item => item.nome === "instalar");
  if (instalacao?.ok) {
    try {
      const caminhoAntes = new URL(pagina.url()).pathname;
      await pagina.locator(".fusion-install-back").click();
      await pagina.waitForTimeout(600);
      const caminhoDepois = new URL(pagina.url()).pathname;
      if (caminhoDepois === caminhoAntes) {
        instalacao.ok = false;
        instalacao.falhas.push("o botão Voltar não saiu da página Instalar");
      }
    } catch (erro) {
      instalacao.ok = false;
      instalacao.falhas.push(`falha ao testar botão Voltar: ${erro.message}`);
    }
  }
} catch (erro) {
  relatorio.fatal = erro.stack || erro.message;
} finally {
  if (electronApp) {
    await electronApp.close().catch(() => {});
  }
}

relatorio.aprovadas = relatorio.paginas.filter(item => item.ok).length;
relatorio.ok = !relatorio.fatal
  && auditoriaFontes.falhas.length === 0
  && relatorio.aprovadas === relatorio.totalPaginas;

fs.writeFileSync(path.join(outputRoot, "relatorio.json"), JSON.stringify(relatorio, null, 2), "utf8");
fs.writeFileSync(path.join(outputRoot, "relatorio.html"), gerarHtmlRelatorio(relatorio), "utf8");

console.log(JSON.stringify({
  ok: relatorio.ok,
  versao: relatorio.versao,
  aprovadas: relatorio.aprovadas,
  total: relatorio.totalPaginas,
  falhasFonte: auditoriaFontes.falhas.length,
  fatal: relatorio.fatal || null,
  relatorio: path.join(outputRoot, "relatorio.html")
}, null, 2));

if (!relatorio.ok) process.exit(1);
