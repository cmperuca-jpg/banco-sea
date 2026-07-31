const API_BI_ACADEMIA = "/api/bi/academia";

const CORES_GRAFICOS = ["#22b8d2", "#1789a3", "#65cfe0", "#6b88a0", "#7dd3b0", "#a6b7c4", "#4aa5bd", "#95deea"];
const COR_TEXTO = "#496273";
const COR_GRADE = "rgba(91, 117, 133, .15)";

let graficos = {};
let dadosAtuais = null;

const pluginCentroRosca = {
  id: "fusionCentroRosca",
  afterDraw(chart, _args, opcoes) {
    if (chart.config.type !== "doughnut" || !chart.chartArea) return;
    const { ctx, chartArea } = chart;
    const total = Number(opcoes?.total ?? 0);
    const centroX = (chartArea.left + chartArea.right) / 2;
    const centroY = (chartArea.top + chartArea.bottom) / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#15384b";
    ctx.font = "800 25px Arial, Helvetica, sans-serif";
    ctx.fillText(String(total), centroX, centroY - 7);
    ctx.fillStyle = "#718796";
    ctx.font = "700 11px Arial, Helvetica, sans-serif";
    ctx.fillText("ALUNOS", centroX, centroY + 17);
    ctx.restore();
  }
};

async function carregarDashboard() {
  const inicio = valor("filtroInicio");
  const fim = valor("filtroFim");
  const botao = document.getElementById("btnAtualizar");
  const status = document.getElementById("statusAtualizacao");
  const erro = document.getElementById("erroDashboard");

  if (inicio && fim && inicio > fim) {
    mostrarErro("A data inicial não pode ser posterior à data final.");
    return;
  }

  const params = new URLSearchParams();
  if (inicio) params.set("inicio", inicio);
  if (fim) params.set("fim", fim);

  definirCarregamento(true, botao, status);
  erro.hidden = true;
  erro.textContent = "";

  try {
    const fetchSeguro = window.FusionAuth?.fetchAuth
      ? FusionAuth.fetchAuth.bind(FusionAuth)
      : fetch.bind(window);
    const resposta = await fetchSeguro(`${API_BI_ACADEMIA}?${params.toString()}`, { cache: "no-store" });
    const json = await resposta.json().catch(() => ({}));

    if (!resposta.ok || json.ok === false) {
      throw new Error(json.mensagem || json.erro || "Não foi possível carregar o BI Academia.");
    }

    dadosAtuais = json;
    preencherKPIs(json.kpis || {});
    renderizarGraficos(json.graficos || {});
    renderizarTabelas(json.tabelas || {});
    status.textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    status.classList.remove("is-error");
  } catch (falha) {
    console.error("Erro ao carregar BI Academia:", falha);
    mostrarErro(falha?.message || "Não foi possível atualizar os dados.");
    status.textContent = "Falha na atualização";
    status.classList.add("is-error");
  } finally {
    definirCarregamento(false, botao, status);
  }
}

function definirCarregamento(ativo, botao, status) {
  if (botao) {
    botao.disabled = ativo;
    botao.textContent = ativo ? "Atualizando..." : "Atualizar painel";
  }
  if (status) {
    status.classList.toggle("is-loading", ativo);
    if (ativo) status.textContent = "Atualizando dados";
  }
}

function mostrarErro(mensagem) {
  const erro = document.getElementById("erroDashboard");
  if (!erro) return;
  erro.textContent = mensagem;
  erro.hidden = false;
}

function numero(valorRecebido) {
  const convertido = Number(valorRecebido ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function texto(id, conteudo) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = numero(conteudo).toLocaleString("pt-BR");
}

function preencherKPIs(kpis) {
  texto("kpiTotalAlunos", kpis.totalAlunos);
  texto("kpiAlunosAtivos", kpis.alunosAtivos);
  texto("kpiAlunosNovos", kpis.alunosNovosPeriodo);
  texto("kpiMatriculasAtivas", kpis.matriculasAtivas);
  texto("kpiPresencasPeriodo", kpis.presencasPeriodo);
  texto("kpiPresencasHoje", kpis.presencasHoje);
  texto("kpiCheckinsAbertos", kpis.checkinsAbertos);
  texto("kpiMatriculasTrancadas", kpis.matriculasTrancadas);
  texto("kpiMatriculasCanceladas", kpis.matriculasCanceladas);
}

function renderizarGraficos(graficosDados) {
  criarGraficoLinha("graficoPresencas", "Presenças", lista(graficosDados.presencasPorMes), "mes", "valor");
  criarGraficoBarra("graficoMatriculas", "Matrículas", lista(graficosDados.matriculasPorMes), "mes", "valor");
  criarGraficoRosca("graficoPlanos", lista(graficosDados.alunosPorPlano));
  criarGraficoBarraHorizontal("graficoCidades", "Alunos", lista(graficosDados.alunosPorCidade), "nome", "valor");
}

function lista(valorRecebido) {
  return Array.isArray(valorRecebido) ? valorRecebido : [];
}

function dadosValidos(dados, labelKey, valueKey) {
  return dados
    .map(item => ({ label: String(item?.[labelKey] ?? "Não informado"), valor: numero(item?.[valueKey]) }))
    .filter(item => item.label && item.valor >= 0);
}

function prepararGrafico(id, possuiDados, mensagem = "Nenhum dado disponível para o período.") {
  destruirGrafico(id);
  const canvas = document.getElementById(id);
  const vazio = document.querySelector(`[data-empty-for="${id}"]`);
  if (!canvas) return null;

  canvas.hidden = !possuiDados;
  if (vazio) {
    vazio.hidden = possuiDados;
    vazio.innerHTML = possuiDados ? "" : `<strong>Sem dados</strong><span>${mensagem}</span>`;
  }
  return possuiDados ? canvas : null;
}

function opcoesBase() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 450 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: false,
        labels: { color: COR_TEXTO, usePointStyle: true, boxWidth: 8, font: { size: 11, weight: "700" } }
      },
      tooltip: {
        backgroundColor: "#16384a",
        titleFont: { size: 12, weight: "700" },
        bodyFont: { size: 12 },
        padding: 11,
        cornerRadius: 9,
        displayColors: false
      }
    }
  };
}

function escalasBase() {
  return {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: COR_TEXTO, font: { size: 11, weight: "600" }, maxRotation: 0, autoSkip: true }
    },
    y: {
      beginAtZero: true,
      grid: { color: COR_GRADE },
      border: { display: false },
      ticks: { color: COR_TEXTO, precision: 0, font: { size: 11 } }
    }
  };
}

function criarGraficoLinha(id, label, dados, labelKey, valueKey) {
  const normalizados = dadosValidos(dados, labelKey, valueKey);
  const canvas = prepararGrafico(id, normalizados.some(item => item.valor > 0));
  if (!canvas) return;

  const contexto = canvas.getContext("2d");
  const gradiente = contexto.createLinearGradient(0, 0, 0, 300);
  gradiente.addColorStop(0, "rgba(34,184,210,.28)");
  gradiente.addColorStop(1, "rgba(34,184,210,0)");

  graficos[id] = new Chart(canvas, {
    type: "line",
    data: {
      labels: normalizados.map(item => formatarPeriodo(item.label)),
      datasets: [{
        label,
        data: normalizados.map(item => item.valor),
        borderColor: "#159db7",
        backgroundColor: gradiente,
        borderWidth: 2.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#159db7",
        pointBorderWidth: 2,
        tension: .34,
        fill: true
      }]
    },
    options: { ...opcoesBase(), scales: escalasBase() }
  });
}

function criarGraficoBarra(id, label, dados, labelKey, valueKey) {
  const normalizados = dadosValidos(dados, labelKey, valueKey);
  const canvas = prepararGrafico(id, normalizados.some(item => item.valor > 0));
  if (!canvas) return;

  graficos[id] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: normalizados.map(item => formatarPeriodo(item.label)),
      datasets: [{
        label,
        data: normalizados.map(item => item.valor),
        backgroundColor: "rgba(34,184,210,.72)",
        borderColor: "#159db7",
        borderWidth: 1,
        borderRadius: 7,
        borderSkipped: false,
        maxBarThickness: 58
      }]
    },
    options: { ...opcoesBase(), scales: escalasBase() }
  });
}

function criarGraficoBarraHorizontal(id, label, dados, labelKey, valueKey) {
  const normalizados = dadosValidos(dados, labelKey, valueKey)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
  const canvas = prepararGrafico(id, normalizados.some(item => item.valor > 0));
  if (!canvas) return;

  graficos[id] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: normalizados.map(item => item.label),
      datasets: [{
        label,
        data: normalizados.map(item => item.valor),
        backgroundColor: normalizados.map((_item, indice) => CORES_GRAFICOS[indice % CORES_GRAFICOS.length]),
        borderRadius: 7,
        borderSkipped: false,
        maxBarThickness: 32
      }]
    },
    options: {
      ...opcoesBase(),
      indexAxis: "y",
      scales: {
        x: { beginAtZero: true, grid: { color: COR_GRADE }, border: { display: false }, ticks: { color: COR_TEXTO, precision: 0 } },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: COR_TEXTO, font: { size: 11, weight: "600" } } }
      }
    }
  });
}

function criarGraficoRosca(id, dados) {
  const normalizados = dadosValidos(dados, "nome", "valor").filter(item => item.valor > 0);
  const canvas = prepararGrafico(id, normalizados.length > 0);
  if (!canvas) return;
  const total = normalizados.reduce((soma, item) => soma + item.valor, 0);

  graficos[id] = new Chart(canvas, {
    type: "doughnut",
    plugins: [pluginCentroRosca],
    data: {
      labels: normalizados.map(item => item.label),
      datasets: [{
        data: normalizados.map(item => item.valor),
        backgroundColor: normalizados.map((_item, indice) => CORES_GRAFICOS[indice % CORES_GRAFICOS.length]),
        borderColor: "#fff",
        borderWidth: 3,
        hoverOffset: 5
      }]
    },
    options: {
      ...opcoesBase(),
      cutout: "68%",
      layout: { padding: 5 },
      plugins: {
        ...opcoesBase().plugins,
        legend: {
          display: true,
          position: "right",
          labels: {
            color: COR_TEXTO,
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 8,
            padding: 15,
            font: { size: 11, weight: "700" },
            generateLabels(chart) {
              const dadosGrafico = chart.data.datasets[0].data;
              return chart.data.labels.map((rotulo, indice) => ({
                text: `${rotulo} · ${total ? ((numero(dadosGrafico[indice]) / total) * 100).toFixed(0) : 0}%`,
                fillStyle: chart.data.datasets[0].backgroundColor[indice],
                strokeStyle: chart.data.datasets[0].backgroundColor[indice],
                hidden: false,
                index: indice,
                pointStyle: "circle"
              }));
            }
          }
        },
        fusionCentroRosca: { total }
      }
    }
  });
}

function formatarPeriodo(rotulo) {
  const texto = String(rotulo || "");
  const encontrou = texto.match(/^(\d{4})-(\d{2})$/);
  return encontrou ? `${encontrou[2]}/${encontrou[1]}` : texto;
}

function destruirGrafico(id) {
  if (graficos[id]) {
    graficos[id].destroy();
    delete graficos[id];
  }
}

function renderizarTabelas(tabelas) {
  renderizarRanking("rankingAlunos", lista(tabelas.rankingAlunosFrequencia), "Aluno", "aluno");
  renderizarRanking("rankingTurmas", lista(tabelas.rankingTurmasFrequencia), "Turma", "turma");
  renderizarAlunosSemPresenca(lista(tabelas.alunosSemPresenca));
}

function escapeHtml(valorRecebido) {
  return String(valorRecebido ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[caractere]));
}

function estadoVazio(titulo, descricao) {
  return `<div class="fusion-ui-empty"><strong>${escapeHtml(titulo)}</strong><span>${escapeHtml(descricao)}</span></div>`;
}

function renderizarRanking(id, registros, tituloColuna, chaveNome) {
  const div = document.getElementById(id);
  if (!div) return;
  if (!registros.length) {
    div.innerHTML = estadoVazio("Nenhuma frequência registrada", "Os dados aparecerão quando houver presença no período selecionado.");
    return;
  }

  div.innerHTML = `
    <div class="fusion-ui-table-wrap">
      <table class="fusion-ui-table">
        <thead><tr><th>${escapeHtml(tituloColuna)}</th><th class="is-numeric">Presenças</th></tr></thead>
        <tbody>${registros.map((item, indice) => `
          <tr><td><span class="fusion-ui-rank">${indice + 1}</span>${escapeHtml(item?.[chaveNome] || "Não informado")}</td><td class="is-numeric"><strong>${numero(item?.presencas).toLocaleString("pt-BR")}</strong></td></tr>
        `).join("")}</tbody>
      </table>
    </div>`;
}

function renderizarAlunosSemPresenca(registros) {
  const div = document.getElementById("alunosSemPresenca");
  if (!div) return;
  if (!registros.length) {
    div.innerHTML = estadoVazio("Nenhuma pendência encontrada", "Todos os alunos ativos possuem presença registrada.");
    return;
  }

  div.innerHTML = `
    <div class="fusion-ui-table-wrap">
      <table class="fusion-ui-table">
        <thead><tr><th>Aluno</th><th>Telefone</th><th>Status</th></tr></thead>
        <tbody>${registros.map(item => `
          <tr>
            <td><strong>${escapeHtml(item?.nome || "Não informado")}</strong></td>
            <td>${escapeHtml(item?.telefone || "Não informado")}</td>
            <td><span class="fusion-ui-status fusion-ui-status--warning">${escapeHtml(item?.status || "Ativo")}</span></td>
          </tr>
        `).join("")}</tbody>
      </table>
    </div>`;
}

function exportarCSV() {
  if (!dadosAtuais) {
    mostrarErro("Atualize o painel antes de exportar os dados.");
    return;
  }

  const linhas = [["Indicador", "Valor"]];
  Object.entries(dadosAtuais.kpis || {}).forEach(([chave, valorKpi]) => linhas.push([chave, valorKpi]));
  linhas.push([], ["Ranking alunos frequência"], ["Aluno", "Presenças"]);
  lista(dadosAtuais.tabelas?.rankingAlunosFrequencia).forEach(item => linhas.push([item.aluno, item.presencas]));
  linhas.push([], ["Ranking turmas frequência"], ["Turma", "Presenças"]);
  lista(dadosAtuais.tabelas?.rankingTurmasFrequencia).forEach(item => linhas.push([item.turma, item.presencas]));

  const csv = `\uFEFF${linhas.map(linha => linha.map(campo => `"${String(campo ?? "").replace(/"/g, '""')}"`).join(";")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bi-academia-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function limparFiltros() {
  document.getElementById("filtroInicio").value = "";
  document.getElementById("filtroFim").value = "";
  carregarDashboard();
}

function valor(id) {
  return document.getElementById(id)?.value || "";
}

window.carregarDashboard = carregarDashboard;
window.limparFiltros = limparFiltros;
window.exportarCSV = exportarCSV;

carregarDashboard();
