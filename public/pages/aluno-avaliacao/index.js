const $ = (id) => document.getElementById(id);
const CONFIG = window.FusionAlunoConfig || {};

const GRUPOS = [
  { titulo: "Dados principais", campos: [["aluno_nome","Aluno"],["professorNome","Professor"],["professor_nome","Professor"],["data","Data"],["hora","Hora"],["objetivo","Objetivo"],["observacoes","Observações",true]] },
  { titulo: "Composição corporal", campos: [["peso","Peso"],["altura","Altura"],["imc","IMC"],["classificacao_imc","Classificação IMC"],["percentual_gordura","% Gordura"],["percentual_ideal","% Ideal"],["massa_magra","Massa magra"],["massa_gorda","Massa gorda"],["agua_corporal","Água corporal"],["gordura_visceral","Gordura visceral"],["idade_metabolica","Idade metabólica"],["tmb","TMB"],["composicao_resultado","Resultado",true]] },
  { titulo: "Perímetros e RCQ", campos: [["pescoco","Pescoço"],["punho","Punho"],["ombro","Ombro"],["braco_relaxado_direito","Braço relaxado direito"],["braco_relaxado_esquerdo","Braço relaxado esquerdo"],["braco_contraido_direito","Braço contraído direito"],["braco_contraido_esquerdo","Braço contraído esquerdo"],["antebraco_direito","Antebraço direito"],["antebraco_esquerdo","Antebraço esquerdo"],["torax_relaxado","Tórax relaxado"],["torax_inspirado","Tórax inspirado"],["cintura","Cintura"],["abdomen","Abdome"],["quadril","Quadril"],["coxa_proximal_direita","Coxa proximal direita"],["coxa_proximal_esquerda","Coxa proximal esquerda"],["coxa_medial_direita","Coxa medial direita"],["coxa_medial_esquerda","Coxa medial esquerda"],["panturrilha_direita","Panturrilha direita"],["panturrilha_esquerda","Panturrilha esquerda"],["rcq","RCQ"],["rcq_classificacao","Classificação RCQ",true],["soma_perimetros","Soma dos perímetros"]] },
  { titulo: "Dobras cutâneas e protocolo", campos: [["protocolo_dobras","Protocolo"],["subescapular","Subescapular"],["bicipital","Bicipital"],["tricipital","Tricipital"],["axilar_media","Axilar média"],["supra_iliaca","Supra-ilíaca"],["peitoral","Peitoral"],["dobra_abdominal","Abdominal"],["dobra_coxa","Coxa"],["dobra_panturrilha","Panturrilha"]] },
  { titulo: "Cardiorrespiratória", campos: [["condicao_fisica","Condição física"],["protocolo_cardio","Protocolo"],["vo2_obtido","VO² obtido"],["vo2_previsto","VO² previsto"],["deficit_aerobico","Déficit aeróbico"],["cardio_info","Resultado",true]] },
  { titulo: "Neuromotores", campos: [["flexao_bracos","Flexão de braços"],["flexao_resultado","Resultado flexão"],["abdominal_repeticoes","Abdominal"],["abdominal_resultado","Resultado abdominal"],["banco_wells","Banco de Wells"],["wells_resultado","Resultado Wells"]] },
  { titulo: "Anamnese", campos: [["pratica_atividade","Pratica atividade física"],["medicamentos","Medicamentos"],["cirurgias","Cirurgias"],["doencas_familia","Doenças na família"],["alergias","Alergias"],["restricoes_medicas","Restrições médicas"],["lesoes","Lesões"],["anamnese_observacoes","Observações",true]] }
];

const METRICAS = [
  { key:"peso", label:"Peso", unidade:"kg", classificacao:"" },
  { key:"percentual_gordura", label:"Gordura corporal", unidade:"%", classificacao:"percentual_ideal" },
  { key:"massa_magra", label:"Massa magra", unidade:"kg", classificacao:"" },
  { key:"imc", label:"IMC", unidade:"", classificacao:"classificacao_imc" }
];

const METRICAS_COMPARACAO = [
  ["peso","Peso","kg"], ["imc","IMC",""], ["percentual_gordura","Gordura corporal","%"],
  ["massa_magra","Massa magra","kg"], ["massa_gorda","Massa gorda","kg"],
  ["cintura","Cintura","cm"], ["quadril","Quadril","cm"], ["rcq","RCQ",""],
  ["abdomen","Abdome","cm"], ["soma_perimetros","Soma dos perímetros","cm"]
];

const FOTOS = [
  ["foto_frente_base64","Frente"], ["foto_costas_base64","Costas"],
  ["foto_lateral_direita_base64","Lateral direita"], ["foto_lateral_esquerda_base64","Lateral esquerda"]
];

function sessaoAluno(){
  try {
    const sessao = JSON.parse(localStorage.getItem("fusion_aluno_treino_login") || "null");
    if (sessao?.alunoId) return sessao;
  } catch {}
  const parametros = new URLSearchParams(location.search);
  const alunoId = parametros.get("alunoId") || parametros.get("id");
  const alunoNome = parametros.get("alunoNome") || parametros.get("nome") || "Aluno";
  return alunoId ? { alunoId, alunoNome } : null;
}

function headersAluno(headers = {}){
  const sessao = sessaoAluno();
  const token = sessao?.token || sessao?.accessToken || sessao?.jwt || "";
  return token ? { ...headers, Authorization:`Bearer ${token}` } : { ...headers };
}
function rota(nome,fallback){return CONFIG.rotas?.[nome] || fallback}
function api(nome,fallback,parametros={}){
  let endereco = CONFIG.api?.[nome] || fallback;
  Object.entries(parametros).forEach(([chave,valorParametro]) => {
    endereco = endereco.replace(`{${chave}}`,encodeURIComponent(String(valorParametro)));
  });
  return endereco;
}
function dataISO(valorData){
  if(!valorData) return "";
  const texto = String(valorData).slice(0,10);
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(iso) return texto;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : texto;
}
function dataBR(valorData){
  const texto = dataISO(valorData);
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : (valorData || "-");
}
function valor(objeto,chave){
  return objeto?.[chave] ?? objeto?.[chave.replaceAll("_","")] ?? objeto?.[chave.replaceAll("_","").toLowerCase()] ?? "";
}
function temValor(conteudo){return conteudo !== undefined && conteudo !== null && String(conteudo).trim() !== ""}
function numero(conteudo){
  if(!temValor(conteudo)) return null;
  const texto = String(conteudo).trim().replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".");
  const encontrado = texto.match(/-?\d+(?:\.\d+)?/);
  const convertido = encontrado ? Number(encontrado[0]) : NaN;
  return Number.isFinite(convertido) ? convertido : null;
}
function escapar(conteudo){return String(conteudo ?? "").replace(/[&<>"']/g, caractere => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[caractere]))}
function extrairLista(payload){
  if(Array.isArray(payload)) return payload;
  for(const chave of ["avaliacoes","dados","data","itens","registros","alunos"]) if(Array.isArray(payload?.[chave])) return payload[chave];
  return [];
}
function dataAvaliacao(avaliacao){return dataISO(avaliacao?.data || avaliacao?.criado_em || avaliacao?.criadoEm || avaliacao?.createdAt)}
function ordenarAvaliacoes(a,b){return String(dataAvaliacao(b)).localeCompare(String(dataAvaliacao(a)))}
function formatarNumero(valorNumero,maximo=2){return Number(valorNumero).toLocaleString("pt-BR",{maximumFractionDigits:maximo})}
function formatarMetrica(chave,conteudo,unidade=""){
  if(!temValor(conteudo)) return "-";
  const texto = String(conteudo).trim();
  if(/[a-zA-Z%]/.test(texto) || !unidade) return texto;
  return `${texto} ${unidade}`;
}
function iniciais(nome){
  return String(nome || "Aluno").trim().split(/\s+/).filter(Boolean).slice(0,2).map(parte => parte[0]?.toUpperCase()).join("") || "AL";
}
function idAlunoRegistro(aluno){return String(aluno?.id ?? aluno?._id ?? aluno?.codigo ?? aluno?.alunoId ?? aluno?.aluno_id ?? aluno?.matricula ?? "")}
function fotoAluno(aluno={}){return aluno.foto_base64 || aluno.foto || aluno.fotoBase64 || aluno.avatar || aluno.imagem || ""}
function nomeAluno(aluno={}){const sessao=sessaoAluno();return aluno.nome || aluno.nomeCompleto || aluno.alunoNome || aluno.name || sessao?.alunoNome || sessao?.nome || "Aluno"}

async function buscarJson(url){
  try{
    const resposta = await fetch(url,{cache:"no-store",headers:headersAluno()});
    const json = await resposta.json().catch(()=>({}));
    return resposta.ok ? json : null;
  }catch{return null}
}
async function buscarAluno(alunoId){
  const direto = await buscarJson(api("alunoDetalhe","/api/alunos/{alunoId}",{alunoId}));
  if(direto) return direto.aluno || direto.dados || direto.data || direto;
  const lista = extrairLista(await buscarJson(api("alunos","/api/alunos")) || {});
  return lista.find(aluno => idAlunoRegistro(aluno) === String(alunoId)) || null;
}
async function buscarAvaliacoes(alunoId){
  const urls = [
    `/api/avaliacoes?alunoId=${encodeURIComponent(alunoId)}`,
    `/api/avaliacoes?aluno_id=${encodeURIComponent(alunoId)}`
  ];
  for(const url of urls){
    try{
      const resposta = await fetch(url,{cache:"no-store",headers:headersAluno()});
      const json = await resposta.json().catch(()=>({}));
      if(resposta.ok){
        const lista = extrairLista(json);
        if(lista.length || url.includes("aluno_id")) return lista;
      }
    }catch{}
  }
  return [];
}

function aplicarAluno(aluno){
  const nome = nomeAluno(aluno || {});
  $("tituloAluno").textContent = nome;
  $("fotoFallback").textContent = iniciais(nome);
  const foto = fotoAluno(aluno || {});
  const imagem = $("fotoAluno");
  const fallback = $("fotoFallback");
  if(!foto){imagem.classList.add("hidden");fallback.classList.remove("hidden");return}
  imagem.onload = () => {imagem.classList.remove("hidden");fallback.classList.add("hidden")};
  imagem.onerror = () => {imagem.classList.add("hidden");fallback.classList.remove("hidden")};
  imagem.src = foto;
  imagem.alt = `Foto de ${nome}`;
}

function variacao(atual,anterior){
  const valorAtual = numero(atual);
  const valorAnterior = numero(anterior);
  if(valorAtual === null || valorAnterior === null) return null;
  return valorAtual - valorAnterior;
}
function textoVariacao(diferenca,unidade=""){
  if(diferenca === null) return {texto:"Sem comparação",classe:"flat",simbolo:""};
  if(Math.abs(diferenca) < .005) return {texto:"Sem alteração",classe:"flat",simbolo:"="};
  const sinal = diferenca > 0 ? "+" : "−";
  const valorAbsoluto = formatarNumero(Math.abs(diferenca));
  return {texto:`${sinal}${valorAbsoluto}${unidade ? ` ${unidade}` : ""}`,classe:diferenca > 0 ? "up" : "down",simbolo:diferenca > 0 ? "↑" : "↓"};
}

function renderKpis(atual,anterior){
  const html = METRICAS.map(metrica => {
    const atualValor = valor(atual,metrica.key);
    if(!temValor(atualValor)) return "";
    const anteriorValor = anterior ? valor(anterior,metrica.key) : "";
    const mudanca = textoVariacao(variacao(atualValor,anteriorValor),metrica.unidade);
    const detalhe = metrica.classificacao && temValor(valor(atual,metrica.classificacao))
      ? String(valor(atual,metrica.classificacao))
      : anterior ? "Desde a avaliação anterior" : "Primeiro registro";
    return `<article class="kpi-card">
      <span class="kpi-card__label">${escapar(metrica.label)}</span>
      <strong class="kpi-card__value">${escapar(formatarMetrica(metrica.key,atualValor,metrica.unidade))}</strong>
      <div class="kpi-card__footer">
        <span>${escapar(detalhe)}</span>
        <span class="trend-pill ${mudanca.classe}">${escapar(`${mudanca.simbolo} ${mudanca.texto}`.trim())}</span>
      </div>
    </article>`;
  }).join("");
  $("kpisAvaliacao").innerHTML = html || `<div class="comparacao-vazia">Os indicadores principais ainda não foram preenchidos nesta avaliação.</div>`;
}

function pontosSparkline(lista,chave){
  return lista.slice(0,8).reverse().map(avaliacao => ({
    data:dataBR(dataAvaliacao(avaliacao)),
    valor:numero(valor(avaliacao,chave))
  })).filter(item => item.valor !== null);
}
function svgSparkline(pontos){
  const largura=320, altura=96, margemX=10, margemY=12;
  if(!pontos.length) return "";
  const valores=pontos.map(item=>item.valor);
  let minimo=Math.min(...valores), maximo=Math.max(...valores);
  if(minimo===maximo){minimo-=1;maximo+=1}
  const intervaloX = pontos.length > 1 ? (largura-margemX*2)/(pontos.length-1) : 0;
  const coordenadas=pontos.map((item,indice)=>{
    const x=pontos.length===1 ? largura/2 : margemX+indice*intervaloX;
    const y=altura-margemY-((item.valor-minimo)/(maximo-minimo))*(altura-margemY*2);
    return {x,y,...item};
  });
  const linha=coordenadas.map(item=>`${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(" ");
  const area=`${margemX},${altura-margemY} ${linha} ${largura-margemX},${altura-margemY}`;
  return `<svg class="sparkline" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Gráfico de evolução">
    <line class="sparkline-grid" x1="${margemX}" y1="${altura/2}" x2="${largura-margemX}" y2="${altura/2}"></line>
    <polygon class="sparkline-area" points="${area}"></polygon>
    <polyline class="sparkline-line" points="${linha}"></polyline>
    ${coordenadas.map(item=>`<circle class="sparkline-dot" cx="${item.x.toFixed(1)}" cy="${item.y.toFixed(1)}" r="4"><title>${escapar(item.data)}: ${escapar(formatarNumero(item.valor))}</title></circle>`).join("")}
  </svg>`;
}
function renderEvolucao(lista){
  const graficos = METRICAS.map(metrica => {
    const pontos=pontosSparkline(lista,metrica.key);
    if(pontos.length<2) return "";
    const primeiro=pontos[0], ultimo=pontos[pontos.length-1];
    return `<article class="evolucao-card">
      <div class="evolucao-card__head"><h3>${escapar(metrica.label)}</h3><small>${pontos.length} avaliações</small></div>
      ${svgSparkline(pontos)}
      <div class="evolucao-footer"><span>${escapar(primeiro.data)}</span><strong>${escapar(formatarMetrica(metrica.key,ultimo.valor,metrica.unidade))}</strong><span>${escapar(ultimo.data)}</span></div>
    </article>`;
  }).join("");
  $("graficosEvolucao").innerHTML=graficos;
  $("evolucaoBox").classList.toggle("hidden",!graficos);
}

function renderComparacao(atual,anterior){
  if(!anterior){
    $("comparacaoInfo").textContent="Esta é a primeira avaliação registrada.";
    $("comparacao").innerHTML=`<div class="comparacao-vazia">Quando houver uma nova avaliação, você verá aqui o que mudou em cada indicador.</div>`;
    $("resumoEvolucao").textContent="Primeiro registro disponível.";
    return;
  }
  $("comparacaoInfo").textContent=`Comparando ${dataBR(dataAvaliacao(atual))} com ${dataBR(dataAvaliacao(anterior))}.`;
  const alteracoes=[];
  const html=METRICAS_COMPARACAO.map(([chave,nome,unidade])=>{
    const valorAtual=valor(atual,chave), valorAnterior=valor(anterior,chave);
    if(!temValor(valorAtual)&&!temValor(valorAnterior)) return "";
    const mudanca=textoVariacao(variacao(valorAtual,valorAnterior),unidade);
    if(mudanca.classe!=="flat") alteracoes.push(`${nome.toLowerCase()} ${mudanca.classe==="up"?"subiu":"reduziu"} ${mudanca.texto.replace(/[+−]/,"")}`);
    return `<article class="metric-card">
      <h3>${escapar(nome)}</h3>
      <div class="metric-row">
        <div class="metric-cell"><span>Anterior</span><strong>${escapar(formatarMetrica(chave,valorAnterior,unidade))}</strong></div>
        <div class="metric-cell"><span>Atual</span><strong>${escapar(formatarMetrica(chave,valorAtual,unidade))}</strong></div>
        <div class="metric-cell metric-cell--change ${mudanca.classe}"><span>Mudança</span><strong>${escapar(`${mudanca.simbolo} ${mudanca.texto}`.trim())}</strong></div>
      </div>
    </article>`;
  }).join("");
  $("comparacao").innerHTML=html || `<div class="comparacao-vazia">Não há campos suficientes para comparação.</div>`;
  $("resumoEvolucao").textContent=alteracoes.length ? `${alteracoes.slice(0,2).join(" e ")}.` : "Sem alterações numéricas relevantes nos campos disponíveis.";
}

function renderCompleto(atual){
  let indiceVisivel=0;
  $("resultadoCompleto").innerHTML=GRUPOS.map(grupo=>{
    const campos=grupo.campos.map(([chave,rotulo,full])=>{
      const conteudo=valor(atual,chave);
      if(!temValor(conteudo)) return "";
      return `<div class="campo ${full?"full":""}"><span>${escapar(rotulo)}</span><strong>${escapar(String(conteudo))}</strong></div>`;
    }).filter(Boolean);
    if(!campos.length) return "";
    const aberto=indiceVisivel<2 ? " open" : "";
    indiceVisivel+=1;
    return `<details class="grupo"${aberto}><summary>${escapar(grupo.titulo)}<span class="grupo-count">${campos.length} itens</span></summary><div class="campo-grid">${campos.join("")}</div></details>`;
  }).join("") || `<div class="comparacao-vazia">Nenhum detalhe adicional foi preenchido nesta avaliação.</div>`;
}

function renderFotos(atual){
  const fotos=FOTOS.map(([chave,rotulo])=>[valor(atual,chave),rotulo]).filter(([src])=>temValor(src));
  $("fotosBox").classList.toggle("hidden",!fotos.length);
  if(!fotos.length) return;
  $("fotosPosturais").innerHTML=fotos.map(([src,rotulo])=>`<figure class="foto-card"><span>${escapar(rotulo)}</span><img src="${escapar(src)}" alt="Foto postural: ${escapar(rotulo)}" loading="lazy"></figure>`).join("");
}

function mostrarVazio(){
  $("conteudoAvaliacao").classList.add("hidden");
  $("estadoVazio").classList.remove("hidden");
  $("dataAtualHero").textContent="Não registrada";
  $("professorHero").textContent="Aguardando avaliação";
  $("objetivoHero").textContent="Aguardando avaliação";
}
function mostrarConteudo(){
  $("estadoVazio").classList.add("hidden");
  $("conteudoAvaliacao").classList.remove("hidden");
}

async function carregar(){
  const sessao=sessaoAluno();
  if(!sessao?.alunoId){
    location.replace(rota("login","/pages/aluno-login/index.html"));
    return;
  }
  const botao=$("btnAtualizar");
  botao.disabled=true;
  botao.querySelector("span:last-child").textContent="Atualizando...";
  $("alerta").classList.add("hidden");
  try{
    const [aluno,avaliacoes]=await Promise.all([buscarAluno(sessao.alunoId),buscarAvaliacoes(sessao.alunoId)]);
    aplicarAluno(aluno || {nome:sessao.alunoNome});
    const lista=avaliacoes.sort(ordenarAvaliacoes);
    if(!lista.length){mostrarVazio();return}
    mostrarConteudo();
    const atual=lista[0], anterior=lista[1] || null;
    const professor=valor(atual,"professorNome") || valor(atual,"professor_nome") || valor(atual,"professor") || "Não informado";
    const objetivo=valor(atual,"objetivo") || "Não informado";
    $("dataAtualHero").textContent=dataBR(dataAvaliacao(atual));
    $("professorHero").textContent=professor;
    $("objetivoHero").textContent=objetivo;
    renderKpis(atual,anterior);
    renderEvolucao(lista);
    renderComparacao(atual,anterior);
    renderCompleto(atual);
    renderFotos(atual);
  }catch(erro){
    $("alerta").textContent=erro?.message || "Não foi possível carregar a avaliação agora.";
    $("alerta").classList.remove("hidden");
  }finally{
    botao.disabled=false;
    botao.querySelector("span:last-child").textContent="Atualizar dados";
  }
}

function voltarAoTreino(){
  const sessao=sessaoAluno();
  const base=rota("treino","/pages/aluno-treinos/index.html");
  location.href=sessao?.alunoId ? `${base}${base.includes("?")?"&":"?"}alunoId=${encodeURIComponent(sessao.alunoId)}` : base;
}

$("btnVoltar").addEventListener("click",voltarAoTreino);
$("btnVoltarVazio").addEventListener("click",voltarAoTreino);
$("btnAtualizar").addEventListener("click",carregar);
$("btnAtualizarVazio").addEventListener("click",carregar);
carregar();
