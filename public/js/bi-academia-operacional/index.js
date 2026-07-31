const API_BI_OPERACIONAL = "/api/bi/academia-operacional";

const PALETA_GRAFICOS = [
  "#22b8d2",
  "#3579c9",
  "#38a67a",
  "#7d67c6",
  "#e0a126",
  "#5f879e",
  "#d45f78",
  "#63b6a5"
];

let graficos = {};
let dadosAtuais = null;

const pluginTextoCentral = {
  id: "fusionTextoCentral",
  afterDraw(chart, args, opcoes) {
    if (chart.config.type !== "doughnut") return;

    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const textoPrincipal = String(opcoes?.textoPrincipal ?? "0");
    const textoSecundario = String(opcoes?.textoSecundario ?? "Total");
    const centroX = (chartArea.left + chartArea.right) / 2;
    const centroY = (chartArea.top + chartArea.bottom) / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#15364a";
    ctx.font = "700 24px Arial, Helvetica, sans-serif";
    ctx.fillText(textoPrincipal, centroX, centroY - 7);
    ctx.fillStyle = "#718592";
    ctx.font = "600 11px Arial, Helvetica, sans-serif";
    ctx.fillText(textoSecundario, centroX, centroY + 15);
    ctx.restore();
  }
};

if (window.Chart) Chart.register(pluginTextoCentral);

async function carregarDashboard() {
  const inicio = valor("filtroInicio");
  const fim = valor("filtroFim");
  const params = new URLSearchParams();

  if (inicio) params.set("inicio", inicio);
  if (fim) params.set("fim", fim);

  definirCarregando(true);
  ocultarErro();

  try {
    const fetchSeguro = window.FusionAuth?.fetchAuth
      ? FusionAuth.fetchAuth.bind(FusionAuth)
      : fetch.bind(window);

    const resposta = await fetchSeguro(`${API_BI_OPERACIONAL}?${params.toString()}`, {
      cache: "no-store"
    });

    const json = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(json.mensagem || json.erro || "Não foi possível carregar os indicadores operacionais.");
    }

    dadosAtuais = normalizarResposta(json);
    preencherKPIs(dadosAtuais.kpis);
    renderizarGraficos(dadosAtuais.graficos);
    renderizarTabelas(dadosAtuais.tabelas);
    atualizarStatus("Dados atualizados", "ok");
  } catch (erro) {
    console.error("Falha ao carregar BI Operacional:", erro);
    mostrarErro(erro?.message || "Não foi possível carregar o painel.");
    atualizarStatus("Falha na atualização", "erro");
  } finally {
    definirCarregando(false);
  }
}

function normalizarResposta(json) {
  return {
    kpis: json?.kpis || {},
    graficos: json?.graficos || {},
    tabelas: json?.tabelas || {}
  };
}

function preencherKPIs(kpis = {}) {
  setText("kpiTurmasAtivas", numero(kpis.turmasAtivas));
  setText("kpiCapacidadeTotal", numero(kpis.capacidadeTotal));
  setText("kpiProfessoresAtivos", numero(kpis.professoresAtivos));
  setText("kpiAgendaHoje", numero(kpis.agendamentosHoje));
  setText("kpiTotalTurmas", numero(kpis.totalTurmas));
  setText("kpiTurmasEncerradas", numero(kpis.turmasEncerradas));
  setText("kpiTotalProfessores", numero(kpis.totalProfessores));
  setText("kpiAgendaPeriodo", numero(kpis.agendamentosPeriodo));
}

function renderizarGraficos(graficosDados = {}) {
  criarGraficoRosca(
    "graficoTurmasModalidade",
    graficosDados.alunosPorModalidade || graficosDados.turmasPorModalidade || [],
    "Alunos"
  );
  criarGraficoRosca(
    "graficoProfessoresEspecialidade",
    graficosDados.professoresPorEspecialidade || [],
    "Professores"
  );
  criarGraficoRosca(
    "graficoAgendaTipo",
    graficosDados.agendaPorTipo || [],
    "Eventos"
  );
  criarGraficoBarra(
    "graficoAgendaMes",
    "Agendamentos",
    graficosDados.agendaPorMes || [],
    "mes",
    "valor"
  );
}

function criarGraficoBarra(id, label, dados, labelKey, valueKey) {
  destruirGrafico(id);

  const lista = Array.isArray(dados) ? dados : [];
  const contexto = document.getElementById(id);
  if (!contexto || !window.Chart) return;

  const valores = lista.map(item => numeroBruto(item?.[valueKey]));
  const maiorValor = Math.max(...valores, 0);

  graficos[id] = new Chart(contexto, {
    type: "bar",
    data: {
      labels: lista.map(item => texto(item?.[labelKey], "Sem identificação")),
      datasets: [{
        label,
        data: valores,
        backgroundColor: "rgba(34, 184, 210, .86)",
        hoverBackgroundColor: "#1389a0",
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 38
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: { duration: 450 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#15364a",
          padding: 12,
          cornerRadius: 9,
          displayColors: false,
          callbacks: {
            label: contextoTooltip => `${label}: ${numero(contextoTooltip.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#657b89", font: { size: 11, weight: "600" } }
        },
        y: {
          beginAtZero: true,
          suggestedMax: maiorValor > 0 ? maiorValor * 1.18 : 5,
          grid: { color: "rgba(111, 137, 151, .14)" },
          border: { display: false },
          ticks: {
            precision: 0,
            color: "#7a8e9a",
            font: { size: 11 }
          }
        }
      }
    }
  });
}

function criarGraficoRosca(id, dados, rotuloTotal) {
  destruirGrafico(id);

  const contexto = document.getElementById(id);
  if (!contexto || !window.Chart) return;

  const listaOriginal = Array.isArray(dados) ? dados : [];
  const listaValida = listaOriginal
    .map(item => ({
      nome: texto(item?.nome, "Sem identificação"),
      valor: numeroBruto(item?.valor)
    }))
    .filter(item => item.valor > 0);

  const semDados = listaValida.length === 0;
  const lista = semDados ? [{ nome: "Sem dados", valor: 1 }] : listaValida;
  const total = listaValida.reduce((soma, item) => soma + item.valor, 0);

  graficos[id] = new Chart(contexto, {
    type: "doughnut",
    data: {
      labels: lista.map(item => item.nome),
      datasets: [{
        data: lista.map(item => item.valor),
        backgroundColor: semDados ? ["#e7eef2"] : lista.map((_, indice) => PALETA_GRAFICOS[indice % PALETA_GRAFICOS.length]),
        borderColor: "#ffffff",
        borderWidth: 4,
        hoverOffset: semDados ? 0 : 7,
        spacing: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "67%",
      radius: "86%",
      animation: { duration: 500 },
      plugins: {
        fusionTextoCentral: {
          textoPrincipal: semDados ? "0" : numero(total),
          textoSecundario: rotuloTotal
        },
        legend: {
          display: !semDados,
          position: "bottom",
          align: "center",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 8,
            boxHeight: 8,
            padding: 15,
            color: "#607684",
            font: { size: 11, weight: "600" },
            generateLabels(chart) {
              const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              const totalValores = chart.data.datasets[0].data.reduce((soma, valor) => soma + Number(valor || 0), 0);
              return labels.map(item => {
                const valorAtual = Number(chart.data.datasets[0].data[item.index] || 0);
                const percentual = totalValores > 0 ? Math.round((valorAtual / totalValores) * 100) : 0;
                return { ...item, text: `${item.text} · ${percentual}%` };
              });
            }
          }
        },
        tooltip: {
          enabled: !semDados,
          backgroundColor: "#15364a",
          padding: 12,
          cornerRadius: 9,
          callbacks: {
            label(contextoTooltip) {
              const valorAtual = numeroBruto(contextoTooltip.raw);
              const percentual = total > 0 ? Math.round((valorAtual / total) * 100) : 0;
              return ` ${contextoTooltip.label}: ${numero(valorAtual)} (${percentual}%)`;
            }
          }
        }
      }
    }
  });
}

function destruirGrafico(id) {
  if (graficos[id]) {
    graficos[id].destroy();
    delete graficos[id];
  }
}

function renderizarTabelas(tabelas = {}) {
  renderizarTabelaSimples(
    "rankingProfessoresTurmas",
    tabelas.rankingProfessoresTurmas || [],
    ["professor", "turmas"],
    ["Professor", "Turmas"]
  );
  renderizarTabelaSimples(
    "rankingProfessoresAgenda",
    tabelas.rankingProfessoresAgenda || [],
    ["professor", "agendamentos"],
    ["Professor", "Agendamentos"]
  );
  renderizarTabelaSimples(
    "turmasSemProfessor",
    tabelas.turmasSemProfessor || [],
    ["nome", "modalidade", "status"],
    ["Turma", "Modalidade", "Status"]
  );
  renderizarTabelaSimples(
    "agendaHoje",
    tabelas.agendaHoje || [],
    ["horario", "titulo", "tipo", "aluno", "professor", "status"],
    ["Horário", "Título", "Tipo", "Aluno", "Professor", "Status"]
  );
  renderizarTabelaSimples(
    "turmasOcupacao",
    tabelas.turmasComCapacidade || [],
    ["nome", "modalidade", "capacidade", "matriculasAtivas", "ocupacao"],
    ["Turma", "Modalidade", "Capacidade", "Matrículas", "Ocupação"]
  );
}

function renderizarTabelaSimples(id, lista, chaves, titulos) {
  const div = document.getElementById(id);
  if (!div) return;

  const itens = Array.isArray(lista) ? lista : [];

  if (itens.length === 0) {
    div.innerHTML = `
      <div class="bi-empty">
        <div><strong>Nenhum dado encontrado</strong><span>Não há registros para o período selecionado.</span></div>
      </div>
    `;
    return;
  }

  div.innerHTML = `
    <div class="bi-table-scroll">
      <table>
        <thead>
          <tr>${titulos.map(titulo => `<th>${escaparHTML(titulo)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${itens.map(item => `
            <tr>${chaves.map(chave => `<td>${formatarCelula(chave, item?.[chave])}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatarCelula(chave, valorCelula) {
  if (chave === "status") {
    const status = texto(valorCelula, "Não informado");
    const classe = normalizarClasse(status);
    return `<span class="bi-status bi-status--${classe}">${escaparHTML(status)}</span>`;
  }

  if (chave === "ocupacao") {
    const percentual = limitar(numeroBruto(valorCelula), 0, 100);
    return `
      <div class="bi-occupancy" aria-label="Ocupação de ${percentual}%">
        <span class="bi-occupancy__track"><span class="bi-occupancy__bar" style="width:${percentual}%"></span></span>
        <strong>${numero(percentual)}%</strong>
      </div>
    `;
  }

  return escaparHTML(texto(valorCelula, "-"));
}

function exportarCSV() {
  if (!dadosAtuais) {
    mostrarErro("Atualize o painel antes de exportar os dados.");
    return;
  }

  const linhas = [];

  linhas.push(["Indicador", "Valor"]);
  Object.entries(dadosAtuais.kpis || {}).forEach(([chave, valorKpi]) => linhas.push([chave, valorKpi]));

  linhas.push([]);
  linhas.push(["Professores por turmas"]);
  linhas.push(["Professor", "Turmas"]);
  (dadosAtuais.tabelas.rankingProfessoresTurmas || []).forEach(item => linhas.push([item.professor, item.turmas]));

  linhas.push([]);
  linhas.push(["Agenda de hoje"]);
  linhas.push(["Horário", "Título", "Tipo", "Aluno", "Professor", "Status"]);
  (dadosAtuais.tabelas.agendaHoje || []).forEach(item => {
    linhas.push([item.horario, item.titulo, item.tipo, item.aluno, item.professor, item.status]);
  });

  const csv = linhas
    .map(linha => linha.map(campo => `"${String(campo ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bi-operacional.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function limparFiltros() {
  setValue("filtroInicio", "");
  setValue("filtroFim", "");
  carregarDashboard();
}

function definirCarregando(carregando) {
  const botao = document.getElementById("btnAtualizar");
  if (botao) {
    botao.disabled = carregando;
    botao.textContent = carregando ? "Atualizando..." : "Atualizar painel";
  }

  if (carregando) atualizarStatus("Atualizando dados", "carregando");
}

function atualizarStatus(textoStatus, estado) {
  const elemento = document.getElementById("statusAtualizacao");
  if (!elemento) return;
  elemento.textContent = textoStatus;
  elemento.classList.toggle("is-loading", estado === "carregando");
  elemento.classList.toggle("is-error", estado === "erro");
}

function mostrarErro(mensagem) {
  const elemento = document.getElementById("erroDashboard");
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.hidden = false;
}

function ocultarErro() {
  const elemento = document.getElementById("erroDashboard");
  if (!elemento) return;
  elemento.hidden = true;
  elemento.textContent = "";
}

function valor(id) {
  return document.getElementById(id)?.value || "";
}

function setValue(id, valorCampo) {
  const campo = document.getElementById(id);
  if (campo) campo.value = valorCampo;
}

function setText(id, conteudo) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = conteudo;
}

function numero(valorNumero) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(numeroBruto(valorNumero));
}

function numeroBruto(valorNumero) {
  const resultado = Number(valorNumero ?? 0);
  return Number.isFinite(resultado) ? resultado : 0;
}

function texto(valorTexto, fallback = "") {
  const resultado = String(valorTexto ?? "").trim();
  return resultado || fallback;
}

function limitar(valorNumero, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valorNumero));
}

function normalizarClasse(valorStatus) {
  return String(valorStatus || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "neutro";
}

function escaparHTML(valorTexto) {
  return String(valorTexto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.carregarDashboard = carregarDashboard;
window.limparFiltros = limparFiltros;
window.exportarCSV = exportarCSV;

carregarDashboard();
