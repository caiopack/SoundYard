// src/routes/playlists.js
import { Router } from 'express';
import { supa } from '../lib/supa.js';
import supaAuth from '../middleware/supaAuth.js';

const r = Router();

/**
 * @openapi
 * tags:
 *   - name: Playlists
 *     description: Gerenciamento e descoberta de playlists
 */

/**
 * @openapi
 * /playlists/public:
 *   get:
 *     tags: [Playlists]
 *     summary: Lista playlists públicas
 *     description: Retorna as playlists publicadas por qualquer usuário (não requer login).
 *     responses:
 *       200:
 *         description: Lista de playlists públicas
 */
r.get('/public', async (_req, res, next) => {
  try {
    const { data, error } = await supa
      .from('playlists')
      .select('id, name, is_public, created_at, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * Exporta uma playlist se for PÚBLICA **ou** se o usuário autenticado for o DONO.
 * Se não houver token e a playlist for privada -> 401.
 * Se houver token mas não for dono -> 403.
 *
 * GET /playlists/:id/export
 */
r.get('/:id/export', async (req, res, next) => {
  try {
    const { id } = req.params;

    // tenta identificar usuário pelo token (opcional)
    let userId = null;
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const { data: { user }, error } = await supa.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    // busca playlist
    const { data: pl, error: e1 } = await supa
      .from('playlists')
      .select('id, name, is_public, user_id')
      .eq('id', id)
      .single();

    if (e1) {
      // PGRST116 = no rows
      if (e1.code === 'PGRST116') return res.status(404).json({ error: 'Playlist não encontrada' });
      throw e1;
    }

    const podeExportar = pl.is_public || (userId && userId === pl.user_id);
    if (!podeExportar) {
      return res.status(userId ? 403 : 401).json({ error: 'Sem permissão para exportar' });
    }

    // busca faixas da playlist
    const { data: rows, error: e2 } = await supa
      .from('playlist_tracks')
      .select('track_id, position, tracks:tracks!inner(id, title, duration_seconds, album_id)')
      .eq('playlist_id', id)
      .order('position', { ascending: true });

    if (e2) throw e2;

    const payload = {
      id: pl.id,
      name: pl.name,
      is_public: pl.is_public,
      tracks: (rows || []).map(t => ({
        id: t.tracks.id,
        title: t.tracks.title,
        duration_seconds: t.tracks.duration_seconds
      }))
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="playlist-${pl.id}.json"`);
    res.status(200).json(payload);
  } catch (e) {
    next(e);
  }
});

/** ------- Rotas autenticadas do dono ------- */
r.use('/me', supaAuth);

/**
 * GET /playlists/me/playlists
 * Lista playlists do usuário autenticado
 */
r.get('/me/playlists', async (req, res, next) => {
  try {
    const { data, error } = await supa
      .from('playlists')
      .select('*')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /playlists/me/playlists
 * Cria uma playlist
 * Body: { name: string }
 */
r.post('/me/playlists', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(422).json({ error: 'Campo "name" é obrigatório' });
    }

    const { data, error } = await supa
      .from('playlists')
      .insert({ name, user_id: req.user.id })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /playlists/me/playlists/:id
 * Atualiza nome e/ou is_public
 * Body: { name?: string, is_public?: boolean }
 */
r.patch('/me/playlists/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const patch = {};
    if (typeof req.body.name === 'string') patch.name = req.body.name;
    if (typeof req.body.is_public === 'boolean') patch.is_public = req.body.is_public;
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supa
      .from('playlists')
      .update(patch)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Playlist não encontrada' });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /playlists/me/playlists/:id
 * Remove uma playlist do usuário
 */
r.delete('/me/playlists/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supa
      .from('playlists')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Playlist não encontrada' });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/**
 * GET /playlists/me/playlists/:id/detail
 * Retorna a playlist do usuário com as faixas (para edição)
 */
r.get('/me/playlists/:id/detail', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: pl, error: e1 } = await supa
      .from('playlists')
      .select('id, name, is_public, user_id, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    if (e1) {
      if (e1.code === 'PGRST116') return res.status(404).json({ error: 'Playlist não encontrada' });
      throw e1;
    }

    const { data: rows, error: e2 } = await supa
      .from('playlist_tracks')
      .select('track_id, position, tracks:tracks!inner(id, title, duration_seconds, album_id)')
      .eq('playlist_id', id)
      .order('position', { ascending: true });
    if (e2) throw e2;

    const payload = {
      ...pl,
      tracks: (rows || []).map(t => ({
        id: t.tracks.id,
        title: t.tracks.title,
        duration_seconds: t.tracks.duration_seconds,
        position: t.position ?? null
      }))
    };

    res.json(payload);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /playlists/me/playlists/:id/tracks
 * Adiciona uma faixa à playlist do usuário
 * Body: { track_id: uuid, position?: number }
 */
r.post('/me/playlists/:id/tracks', async (req, res, next) => {
  try {
    const { id } = req.params; // playlist_id
    const { track_id, position } = req.body;
    if (!track_id) return res.status(422).json({ error: 'track_id é obrigatório' });

    // Checagem opcional: garantir que a playlist é do usuário
    const { data: pl, error: ePl } = await supa
      .from('playlists')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    if (ePl) {
      if (ePl.code === 'PGRST116') return res.status(404).json({ error: 'Playlist não encontrada' });
      throw ePl;
    }

    const ins = { playlist_id: id, track_id };
    if (Number.isInteger(position)) ins.position = position;

    const { data, error } = await supa
      .from('playlist_tracks')
      .insert(ins)
      .select()
      .single();

    if (error) {
      // 23505 = unique violation (faixa já existe na playlist)
      if (error.code === '23505') return res.status(409).json({ error: 'Faixa já adicionada' });
      throw error;
    }

    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /playlists/me/playlists/:id/tracks/:track_id
 * Remove uma faixa da playlist do usuário
 */
r.delete('/me/playlists/:id/tracks/:track_id', async (req, res, next) => {
  try {
    const { id, track_id } = req.params;

    // garante que a playlist é do usuário
    const { data: pl, error: ePl } = await supa
      .from('playlists')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    if (ePl) {
      if (ePl.code === 'PGRST116') return res.status(404).json({ error: 'Playlist não encontrada' });
      throw ePl;
    }

    const { data, error } = await supa
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', id)
      .eq('track_id', track_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Registro não encontrado' });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/**
 * POST /playlists/me/playlists/:id/publish
 * Publica/privatiza uma playlist do usuário
 * Body: { is_public?: boolean }  // default: true
 */
r.post('/me/playlists/:id/publish', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_public = true } = req.body || {};

    const { data, error } = await supa
      .from('playlists')
      .update({ is_public, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Playlist não encontrada' });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

export default r;
