const { app, BrowserWindow, Menu, Tray, nativeImage, shell, Notification, dialog, session } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");

const PORTA_LOCAL = 3040;
const URL_LOCAL = `http://127.0.0.1:${PORTA_LOCAL}`;
const SUPABASE_URL_PADRAO = "https://kruujujuxeqexxuugwci.supabase.co";
const SUPABASE_KEY_PADRAO = "sb_publishable_qF4Iq7h0meYTGk5CzaG_4w_7QAdkFZC";

let janela = null;
let tray = null;
let encerrando = false;
let moduloServidor = null;
const paginasRecarregadasSemCache = new Set();
const paginasAvisadas = new Set();

function copiarDiretorioSeVazio(origem, destino) {
  fs.mkdirSync(destino, { recursive: true });
  if (!fs.existsSync(origem)) return;
  if (fs.readdirSync(destino).length > 0) return;
  fs.cpSync(origem, destino, { recursive: true, force: false, errorOnExist: false });
}

function lerJson(arquivo, padrao = {}) {
  try { return JSON.parse(fs.readFileSync(arquivo, "utf8")); }
  catch { return padrao; }
}

function salvarJsonSeguro(arquivo, dados) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const temporario = `${arquivo}.tmp`;
  fs.writeFileSync(temporario, JSON.stringify(dados, null, 2), "utf8");
  fs.renameSync(temporario, arquivo);
}

function prepararRuntime() {
  const runtimeRoot = path.join(app.getPath("userData"), "runtime");
  const configPath = path.join(runtimeRoot, "fusion-config.json");
  const publicRoot = app.isPackaged
    ? path.join(process.resourcesPath, "public")
    : path.join(__dirname, "..", "public");
  fs.mkdirSync(runtimeRoot, { recursive: true });

  const origemSeed = app.isPackaged
    ? path.join(process.resourcesPath, "seed")
    : path.join(__dirname, "..");

  copiarDiretorioSeVazio(path.join(origemSeed, "data"), path.join(runtimeRoot, "data"));
  copiarDiretorioSeVazio(path.join(origemSeed, "uploads"), path.join(runtimeRoot, "uploads"));
  fs.mkdirSync(path.join(runtimeRoot, "backups"), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, "logs"), { recursive: true });

  const configAtual = lerJson(configPath, {});
  const config = {
    supabaseUrl: configAtual.supabaseUrl || SUPABASE_URL_PADRAO,
    supabasePublishableKey: configAtual.supabasePublishableKey || SUPABASE_KEY_PADRAO,
    jwtSecret: configAtual.jwtSecret || crypto.randomBytes(48).toString("hex"),
    iniciarComWindows: configAtual.iniciarComWindows !== false,
    porta: Number(configAtual.porta || PORTA_LOCAL),
    criadoEm: configAtual.criadoEm || new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  salvarJsonSeguro(configPath, config);

  process.chdir(runtimeRoot);
  Object.assign(process.env, {
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: String(config.porta),
    CORS_ORIGINS: `${URL_LOCAL},http://localhost:${config.porta}`,
    FUSION_DESKTOP_LOCAL: "true",
    FUSION_DESKTOP_EMBEDDED: "1",
    FUSION_RUNTIME_ROOT: runtimeRoot,
    FUSION_PERSISTENT_DIR: runtimeRoot,
    FUSION_PUBLIC_ROOT: publicRoot,
    FUSION_AUTH_PROVIDER: "supabase",
    FUSION_DATABASE_PROVIDER: "json",
    FUSION_JSON_FALLBACK: "true",
    FUSION_MIGRATE_JSON_ON_START: "false",
    FUSION_SYNC_DATA_ON_LOCAL: "false",
    FUSION_REQUIRE_SUPABASE_DATA: "false",
    FUSION_BACKUP_AUTO: "false",
    FUSION_BACKUP_AUTO_ON_LOCAL: "false",
    SUPABASE_URL: config.supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
    SUPABASE_ANON_KEY: config.supabasePublishableKey,
    JWT_SECRET: config.jwtSecret,
    ACCESS_SERVER_URL: URL_LOCAL
  });

  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: config.iniciarComWindows, args: ["--background"] });
  }
  return { runtimeRoot, config };
}

async function limparCacheDaInterface() {
  const sessao = session.defaultSession;
  const operacoes = [
    sessao.clearCache(),
    sessao.clearStorageData({
      origin: URL_LOCAL,
      storages: ["serviceworkers", "cachestorage", "shadercache"]
    })
  ];
  const resultados = await Promise.allSettled(operacoes);
  resultados.forEach(resultado => {
    if (resultado.status === "rejected") {
      console.warn(`[Desktop] Não foi possível limpar parte do cache visual: ${resultado.reason?.message || resultado.reason}`);
    }
  });
}

async function validarRecursoWeb(caminho, tipoEsperado) {
  const resposta = await fetch(`${URL_LOCAL}${caminho}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2500)
  });
  if (!resposta.ok) {
    throw new Error(`Recurso visual indisponível: ${caminho} (HTTP ${resposta.status}).`);
  }
  const contentType = String(resposta.headers.get("content-type") || "").toLowerCase();
  if (tipoEsperado && !contentType.includes(tipoEsperado)) {
    throw new Error(`Tipo inválido para ${caminho}: ${contentType || "não informado"}.`);
  }
}

async function aguardarServidor(tentativas = 80) {
  for (let tentativa = 0; tentativa < tentativas; tentativa += 1) {
    try {
      const resposta = await fetch(`${URL_LOCAL}/api/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(1500)
      });
      if (resposta.ok) {
        await validarRecursoWeb("/pages/login/index.html", "text/html");
        await validarRecursoWeb("/pages/dashboard/index.html", "text/html");
        await validarRecursoWeb("/assets/css/fusion-app.css", "text/css");
        await validarRecursoWeb("/assets/css/fusion-theme.css", "text/css");
        await validarRecursoWeb("/assets/css/fusion-menu-global.css", "text/css");
        await validarRecursoWeb("/assets/js/fusion-layout.js", "javascript");
        return true;
      }
    } catch (erro) {
      if (tentativa === tentativas - 1) throw erro;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("O servidor local não iniciou dentro do tempo esperado.");
}

async function iniciarServidor() {
  const arquivoServidor = path.join(__dirname, "..", "server.mjs");
  moduloServidor = await import(pathToFileURL(arquivoServidor).href);
  await aguardarServidor();
}

async function validarInterfaceRenderizada() {
  if (!janela || janela.isDestroyed()) return;
  const resultado = await janela.webContents.executeJavaScript(`
    (() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return {
        pagina: location.pathname,
        total: links.length,
        falhas: links
          .filter(link => !link.sheet)
          .map(link => link.getAttribute('href') || link.href)
      };
    })()
  `, true).catch(erro => ({ erro: erro.message }));

  if (resultado?.erro) {
    console.warn(`[Desktop] Falha ao validar a interface: ${resultado.erro}`);
    return;
  }
  if (!resultado?.falhas?.length) return;

  const pagina = resultado.pagina || janela.webContents.getURL();
  if (!paginasRecarregadasSemCache.has(pagina)) {
    paginasRecarregadasSemCache.add(pagina);
    console.warn(`[Desktop] CSS não carregado em ${pagina}. Recarregando sem cache: ${resultado.falhas.join(", ")}`);
    janela.webContents.reloadIgnoringCache();
    return;
  }

  if (!paginasAvisadas.has(pagina)) {
    paginasAvisadas.add(pagina);
    await dialog.showMessageBox(janela, {
      type: "warning",
      title: "Fusion Sistema",
      message: "Alguns arquivos visuais não foram carregados.",
      detail: `Página: ${pagina}\nArquivos: ${resultado.falhas.join(", ")}`
    });
  }
}

function criarJanela() {
  if (janela && !janela.isDestroyed()) {
    janela.show();
    janela.focus();
    return janela;
  }

  janela = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0b2030",
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(URL_LOCAL)) return { action: "allow" };
    shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });

  janela.webContents.on("will-navigate", (evento, url) => {
    if (!url.startsWith(URL_LOCAL)) {
      evento.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });

  janela.webContents.on("did-finish-load", () => {
    validarInterfaceRenderizada().catch(erro => {
      console.warn(`[Desktop] Falha ao verificar estilos no renderer: ${erro.message}`);
    });
  });

  janela.on("close", evento => {
    if (!encerrando) {
      evento.preventDefault();
      janela.hide();
    }
  });

  janela.once("ready-to-show", () => {
    if (!process.argv.includes("--background")) janela.show();
  });

  const versao = encodeURIComponent(app.getVersion());
  void janela.loadURL(`${URL_LOCAL}/pages/login/index.html?desktop=${versao}`, {
    extraHeaders: "pragma: no-cache\ncache-control: no-cache\n"
  });
  return janela;
}

function criarTray() {
  const imagem = nativeImage.createFromPath(path.join(__dirname, "assets", "icon.png")).resize({ width: 20, height: 20 });
  tray = new Tray(imagem);
  tray.setToolTip("Fusion Sistema");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir Fusion Sistema", click: () => criarJanela() },
    { label: "Verificar atualizações", click: () => verificarAtualizacoes(true) },
    { type: "separator" },
    { label: "Sair", click: () => { encerrando = true; app.quit(); } }
  ]));
  tray.on("double-click", () => criarJanela());
}

function configurarAtualizacoes() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-downloaded", () => {
    if (Notification.isSupported()) {
      new Notification({
        title: "Atualização do Fusion Sistema",
        body: "A nova versão foi baixada e será instalada ao reiniciar o aplicativo."
      }).show();
    }
  });
  autoUpdater.on("error", erro => console.warn(`[Atualização] ${erro.message}`));
  setTimeout(() => verificarAtualizacoes(false), 30_000).unref?.();
  setInterval(() => verificarAtualizacoes(false), 6 * 60 * 60 * 1000).unref?.();
}

async function verificarAtualizacoes(mostrarResultado) {
  if (!app.isPackaged) {
    if (mostrarResultado) dialog.showMessageBox({ type: "info", message: "Atualizações automáticas são verificadas na versão instalada." });
    return;
  }
  try {
    const resultado = await autoUpdater.checkForUpdates();
    if (mostrarResultado && !resultado?.updateInfo) {
      await dialog.showMessageBox({ type: "info", message: "Nenhuma atualização disponível." });
    }
  } catch (erro) {
    if (mostrarResultado) await dialog.showMessageBox({ type: "warning", message: "Não foi possível verificar atualizações agora.", detail: erro.message });
  }
}

const bloqueio = app.requestSingleInstanceLock();
if (!bloqueio) {
  app.quit();
} else {
  app.on("second-instance", () => criarJanela());

  app.whenReady().then(async () => {
    try {
      app.setAppUserModelId("com.fusionsistema.desktop");
      prepararRuntime();
      await limparCacheDaInterface();
      await iniciarServidor();
      criarTray();
      criarJanela();
      configurarAtualizacoes();
    } catch (erro) {
      await dialog.showMessageBox({
        type: "error",
        title: "Fusion Sistema",
        message: "Não foi possível iniciar o sistema local.",
        detail: erro.stack || erro.message
      });
      encerrando = true;
      app.quit();
    }
  });
}

app.on("activate", () => criarJanela());
app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  encerrando = true;
  moduloServidor?.fecharFusionServidor?.().catch(() => {});
});
