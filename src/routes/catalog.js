// src/routes/catalog.js
import { Router } from 'express';
import { supa } from '../lib/supa.js';

const r = Router();

/**
 * @openapi
 * tags:
 *   - name: Catalog
 *     description: Consulta de artistas, álbuns e faixas (público)
 */

/** LISTA ARTISTAS */
r.get('/artists', async (_req, res, next) => {
  try {
    const { data, error } = await supa
      .from('artists')
      .select('id,name')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /catalog/artists/{artistId}/albums:
 *   get:
 *     tags: [Catalog]
 *     summary: Lista álbuns de um artista
 *     parameters:
 *       - in: path
 *         name: artistId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
r.get('/artists/:artistId/albums', async (req, res, next) => {
  try {
    const { artistId } = req.params;
    const { data, error } = await supa
      .from('albums')
      .select('id,title,artist_id')
      .eq('artist_id', artistId)
      .order('title', { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { next(e); }
});

/** LISTA ÁLBUNS (com filtro opcional por artist_id) */
r.get('/albums', async (req, res, next) => {
  try {
    const { artist_id } = req.query;
    let q = supa.from('albums').select('id,title,artist_id').order('title', { ascending: true });
    if (artist_id) q = q.eq('artist_id', artist_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { next(e); }
});

/**
 * @openapi
 * /catalog/albums/{albumId}/tracks:
 *   get:
 *     tags: [Catalog]
 *     summary: Lista faixas de um álbum
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
r.get('/albums/:albumId/tracks', async (req, res, next) => {
  try {
    const { albumId } = req.params;
    const { data, error } = await supa
      .from('tracks')
      .select('id,title,duration_seconds,album_id')
      .eq('album_id', albumId)               
      .order('title', { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { next(e); }
});

/** LISTA FAIXAS (com filtro opcional por album_id) */
r.get('/tracks', async (req, res, next) => {
  try {
    const { album_id } = req.query;
    let q = supa.from('tracks').select('id,title,duration_seconds,album_id').order('title', { ascending: true });
    if (album_id) q = q.eq('album_id', album_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { next(e); }
});

export default r;
