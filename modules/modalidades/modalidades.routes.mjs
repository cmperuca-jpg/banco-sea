import express from "express";
import {
  obterModalidades,
  criarModalidade,
  atualizarModalidade,
  removerModalidade,
  obterResumoModalidades
} from "./modalidades.service.mjs";
import {
  configuracaoSincronizacaoModalidades,
  marcarModalidadeExcluida,
  sincronizarModalidade,
  sincronizarModalidades
} from "./modalidades-supabase-sync.service.mjs";

const router = express.Router();

function tokenDaRequisicao(req) {
  const authorization = String(req.headers.authorization || "").trim();
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : authorization;
}

async function copiarModalidadeParaNuvem(req, modalidade) {
  if (!modalidade || req.usuario?.portal) return null;
  return sincronizarModalidade({
    modalidade,
    academiaId: req.usuario?.academiaId,
    token: tokenDaRequisicao(req)
  });
}

async function registrarExclusaoNaNuvem(req, modalidadeId) {
  if (req.usuario?.portal) return null;
  return marcarModalidadeExcluida({
    modalidadeId,
    academiaId: req.usuario?.academiaId,
    token: tokenDaRequisicao(req)
  });
}

router.get("/sincronizacao/status", async (_req, res) => {
  res.json({ sucesso: true, ...configuracaoSincronizacaoModalidades() });
});

router.post("/sincronizar-supabase", async (req, res) => {
  try {
    if (req.usuario?.portal) {
      return res.status(403).json({ sucesso: false, erro: "Acesso administrativo obrigatório." });
    }

    const modalidades = await obterModalidades({});
    const resultado = await sincronizarModalidades({
      modalidades,
      academiaId: req.usuario?.academiaId,
      token: tokenDaRequisicao(req)
    });

    res.json({
      sucesso: true,
      ...resultado,
      mensagem: `${resultado.enviados} modalidade(s) copiada(s) para o Supabase.`
    });
  } catch (error) {
    res.status(503).json({ sucesso: false, erro: error.message, mensagem: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const modalidades = await obterModalidades(req.query);
    res.json({ sucesso: true, dados: modalidades });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

router.get("/resumo", async (_req, res) => {
  try {
    const resumo = await obterResumoModalidades();
    res.json({ sucesso: true, dados: resumo });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const modalidade = await criarModalidade(req.body);
    let nuvem = null;
    try {
      nuvem = await copiarModalidadeParaNuvem(req, modalidade);
    } catch (syncError) {
      nuvem = { ok: false, mensagem: syncError.message };
    }

    res.status(201).json({
      sucesso: true,
      dados: modalidade,
      nuvem,
      mensagem: nuvem?.ok === false
        ? "Modalidade salva localmente; sincronização com a nuvem ficou pendente."
        : "Modalidade cadastrada com sucesso."
    });
  } catch (error) {
    res.status(400).json({ sucesso: false, erro: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const modalidade = await atualizarModalidade(req.params.id, req.body);
    let nuvem = null;
    try {
      nuvem = await copiarModalidadeParaNuvem(req, modalidade);
    } catch (syncError) {
      nuvem = { ok: false, mensagem: syncError.message };
    }

    res.json({
      sucesso: true,
      dados: modalidade,
      nuvem,
      mensagem: nuvem?.ok === false
        ? "Modalidade atualizada localmente; sincronização com a nuvem ficou pendente."
        : "Modalidade atualizada com sucesso."
    });
  } catch (error) {
    res.status(400).json({ sucesso: false, erro: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const resultado = await removerModalidade(req.params.id);
    let nuvem = null;
    try {
      nuvem = await registrarExclusaoNaNuvem(req, req.params.id);
    } catch (syncError) {
      nuvem = { ok: false, mensagem: syncError.message };
    }

    res.json({
      sucesso: true,
      dados: resultado,
      nuvem,
      mensagem: nuvem?.ok === false
        ? "Modalidade excluída localmente; atualização da nuvem ficou pendente."
        : "Modalidade excluída com sucesso."
    });
  } catch (error) {
    res.status(400).json({ sucesso: false, erro: error.message });
  }
});

export default router;
