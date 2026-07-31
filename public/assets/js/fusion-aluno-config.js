(function () {
  "use strict";

  const configuracaoPadrao = {
    marca: {
      nome: "Fusion Sistema",
      logo: "/assets/brand/fusion-sistema-logo.svg"
    },
    rotas: {
      login: "/pages/aluno-login/index.html",
      inicio: "/pages/portal-aluno-emergencial/index.html",
      treino: "/pages/aluno-treinos/index.html",
      avaliacao: "/pages/aluno-avaliacao/index.html",
      siteAcademia: "/pages/promocao/index.html"
    },
    api: {
      statusPix: "/api/emergency-access/alunos/{alunoId}/status",
      comprovantePix: "/api/emergency-access/comprovante",
      alunoDetalhe: "/api/alunos/{alunoId}",
      alunos: "/api/alunos"
    },
    pix: {
      tamanhoMaximoComprovanteMb: 8,
      validadeAcessoHoras: 24
    }
  };

  const configuracaoExistente = window.FusionAlunoConfig || {};
  window.FusionAlunoConfig = Object.freeze({
    ...configuracaoPadrao,
    ...configuracaoExistente,
    marca: Object.freeze({
      ...configuracaoPadrao.marca,
      ...(configuracaoExistente.marca || {})
    }),
    rotas: Object.freeze({
      ...configuracaoPadrao.rotas,
      ...(configuracaoExistente.rotas || {})
    }),
    api: Object.freeze({
      ...configuracaoPadrao.api,
      ...(configuracaoExistente.api || {})
    }),
    pix: Object.freeze({
      ...configuracaoPadrao.pix,
      ...(configuracaoExistente.pix || {})
    })
  });
})();
