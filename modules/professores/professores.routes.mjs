import { Router } from 'express';
import * as service from './professores.service.mjs';
import {
  configuracaoSincronizacaoProfessores,
  marcarProfessorExcluido,
  sincronizarProfessor,
  sincronizarProfessores
} from './professores-supabase-sync.service.mjs';

const router = Router();
function tratar(res, e, status=500) { return res.status(e.status || status).json({ ok:false, erro:e.message, mensagem:e.message }); }

function tokenDaRequisicao(req) {
  const authorization = String(req.headers.authorization || '').trim();
  return authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : authorization;
}

async function copiarProfessorParaNuvem(req, professor) {
  if (!professor || req.usuario?.portal) return null;
  return sincronizarProfessor({
    professor,
    academiaId: req.usuario?.academiaId,
    token: tokenDaRequisicao(req)
  });
}

async function registrarExclusaoNaNuvem(req, professor, professorId) {
  if (req.usuario?.portal) return null;
  return marcarProfessorExcluido({
    professor,
    professorId,
    academiaId: req.usuario?.academiaId,
    token: tokenDaRequisicao(req)
  });
}

function ehAdminPainel(usuario = {}) {
  const perfil = String(usuario.perfil || '').toLowerCase();
  const permissoes = Array.isArray(usuario.permissoes) ? usuario.permissoes : [];
  return ['proprietario', 'administrador', 'admin'].includes(perfil) || permissoes.includes('*');
}

function solicitanteStatus(req) {
  const usuario = req.usuario || {};
  if (usuario.portal) {
    return {
      id: usuario.id,
      professorId: usuario.id,
      perfil: usuario.perfil,
      acessoTodosAlunos: usuario.acessoTodosAlunos === true
    };
  }
  if (ehAdminPainel(usuario)) {
    return {
      id: usuario.id,
      professorId: usuario.id,
      perfil: 'responsavel_tecnico',
      acessoTodosAlunos: true
    };
  }
  return {
    id: usuario.id,
    professorId: usuario.id,
    perfil: usuario.perfil,
    acessoTodosAlunos: false
  };
}

function semSenhaAdministrativa(professor = {}) {
  const { senha, senhaHash, senhaAcesso, senhaPortal, ...limpo } = professor;
  return limpo;
}

router.post('/login', async (req, res) => { try { res.json(await service.login(req.body || {})); } catch(e) { tratar(res,e, e.status || 401); } });
router.get('/sessao', async (req, res) => {
  try {
    const professor = await service.validarSessao(req.headers.authorization || '');
    res.json({ ok:true, professor });
  } catch(e) { tratar(res,e, e.status || 401); }
});

router.get('/sincronizacao/status', async (_req, res) => {
  res.json({ ok: true, ...configuracaoSincronizacaoProfessores() });
});

router.post('/sincronizar-supabase', async (req, res) => {
  try {
    if (req.usuario?.portal) return res.status(403).json({ ok:false, mensagem:'Acesso administrativo obrigatório.' });
    const professores = await service.listar({});
    const resultado = await sincronizarProfessores({
      professores,
      academiaId: req.usuario?.academiaId,
      token: tokenDaRequisicao(req)
    });
    res.json({ ...resultado, mensagem:`${resultado.enviados} professor(es) copiado(s) para o Supabase.` });
  } catch(e) { tratar(res,e,503); }
});

router.get('/', async (req, res) => { try { const lista = await service.listar(req.query || {}); res.json(req.usuario?.portal ? lista.map(semSenhaAdministrativa) : lista); } catch(e) { tratar(res,e); } });
router.get('/:id/prontuario', async (req, res) => { try { const r = await service.prontuario(req.params.id); if (!r) return res.status(404).json({ok:false,mensagem:'Professor não encontrado'}); res.json(r); } catch(e) { tratar(res,e); } });
router.get('/:id', async (req, res) => { try { const r = await service.buscar(req.params.id); if (!r) return res.status(404).json({ok:false,mensagem:'Professor não encontrado'}); res.json(r); } catch(e) { tratar(res,e); } });
router.post('/', async (req, res) => {
  try {
    const professor = await service.criar(req.body || {});
    let nuvem = null;
    try { nuvem = await copiarProfessorParaNuvem(req, professor); } catch(syncError) { nuvem = { ok:false, mensagem:syncError.message }; }
    res.status(201).json({
      ok:true,
      professor,
      nuvem,
      mensagem:nuvem?.ok === false ? 'Professor salvo localmente; sincronização com a nuvem ficou pendente.' : 'Professor cadastrado com sucesso'
    });
  } catch(e) { tratar(res,e,400); }
});
router.put('/:id', async (req, res) => {
  try {
    const professor = await service.atualizar(req.params.id, req.body || {});
    if (!professor) return res.status(404).json({ok:false,mensagem:'Professor não encontrado'});
    let nuvem = null;
    try { nuvem = await copiarProfessorParaNuvem(req, professor); } catch(syncError) { nuvem = { ok:false, mensagem:syncError.message }; }
    res.json({
      ok:true,
      professor,
      nuvem,
      mensagem:nuvem?.ok === false ? 'Professor atualizado localmente; sincronização com a nuvem ficou pendente.' : 'Professor atualizado com sucesso'
    });
  } catch(e) { tratar(res,e,400); }
});

router.put('/:id/foto', async (req, res) => {
  try {
    const usuario = req.usuario || {};
    if (usuario.portal === true && usuario.portalTipo === 'professor' && String(usuario.id || '') !== String(req.params.id || '')) {
      return res.status(403).json({ ok:false, mensagem:'O professor só pode alterar a própria foto.' });
    }
    const foto = req.body?.foto || req.body?.foto_base64 || '';
    const professor = await service.atualizarFoto(req.params.id, foto);
    if (!professor) return res.status(404).json({ ok:false, mensagem:'Professor não encontrado' });
    let nuvem = null;
    try { nuvem = await copiarProfessorParaNuvem(req, professor); } catch(syncError) { nuvem = { ok:false, mensagem:syncError.message }; }
    res.json({
      ok:true,
      professor,
      nuvem,
      mensagem:nuvem?.ok === false ? 'Foto salva localmente; sincronização com a nuvem ficou pendente.' : 'Foto do professor atualizada com sucesso'
    });
  } catch(e) { tratar(res,e, e.status || 400); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const solicitante = solicitanteStatus(req);
    const professor = await service.alterarStatus(req.params.id, req.body?.status, solicitante);
    if (!professor) return res.status(404).json({ ok:false, mensagem:'Professor não encontrado' });
    let nuvem = null;
    try { nuvem = await copiarProfessorParaNuvem(req, professor); } catch(syncError) { nuvem = { ok:false, mensagem:syncError.message }; }
    res.json({
      ok:true,
      professor,
      nuvem,
      mensagem:nuvem?.ok === false
        ? 'Status salvo localmente; sincronização com a nuvem ficou pendente.'
        : (professor.status === 'Ativo' ? 'Professor desbloqueado com sucesso' : 'Professor bloqueado com sucesso')
    });
  } catch(e) { tratar(res,e, e.status || 400); }
});

router.delete('/:id', async (req, res) => {
  try {
    const professor = await service.excluir(req.params.id);
    if (!professor) return res.status(404).json({ok:false,mensagem:'Professor não encontrado'});
    let nuvem = null;
    try { nuvem = await registrarExclusaoNaNuvem(req, professor, req.params.id); } catch(syncError) { nuvem = { ok:false, mensagem:syncError.message }; }
    res.json({
      ok:true,
      professor,
      nuvem,
      mensagem:nuvem?.ok === false ? 'Professor excluído localmente; atualização da nuvem ficou pendente.' : 'Professor excluído com sucesso'
    });
  } catch(e) { tratar(res,e); }
});

export default router;
