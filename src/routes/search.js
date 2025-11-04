// src/routes/search.js
import { Router } from 'express';
import { supa } from '../lib/supa.js';

const r = Router();

/**
 * @openapi
 * tags:
 *   - name: Search
 *     description: Busca unificada no catálogo e playlists
 */

/**
 * @openapi
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: Busca unificada
 *     description: >
 *       Retorna resultados combinados de artistas, faixas, playlists públicas e playlists do usuário autenticado.
 *       Se o token for fornecido no header Authorization, inclui também playlists privadas do próprio usuário.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Termo de busca (nome de artista, faixa ou playlist)
 *     responses:
 *       200:
 *         description: Resultados agrupados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 artists:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Artist'
 *                 tracks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Track'
 *                 playlists_public:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Playlist'
 *                 playlists_me:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Playlist'
 */
r.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) {
      return res.json({ artists: [], tracks: [], playlists_public: [], playlists_me: [] });
    }

    // tenta identificar usuário pelo token (opcional)
    let userId = null;
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (token) {
      const { data: { user }, error } = await supa.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    // busca artistas
    const { data: artists, error: eA } = await supa
      .from('artists')
      .select('id, name')
      .ilike('name', `%${q}%`)
      .limit(20);
    if (eA) throw eA;

    // busca faixas
    const { data: tracks, error: eT } = await supa
      .from('tracks')
      .select('id, title, duration_seconds, album_id')
      .ilike('title', `%${q}%`)
      .limit(20);
    if (eT) throw eT;

    // busca playlists públicas
    const { data: playlists_public, error: eP } = await supa
      .from('playlists')
      .select('id, name, is_public, updated_at')
      .eq('is_public', true)
      .ilike('name', `%${q}%`)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (eP) throw eP;

    // busca playlists do próprio usuário (se logado)
    let playlists_me = [];
    if (userId) {
      const { data, error } = await supa
        .from('playlists')
        .select('id, name, is_public, updated_at')
        .eq('user_id', userId)
        .ilike('name', `%${q}%`)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      playlists_me = data || [];
    }

    res.json({ artists, tracks, playlists_public, playlists_me });
  } catch (e) {
    next(e);
  }
});

export default r;
