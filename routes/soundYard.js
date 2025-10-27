import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../utils/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /soundyard/artistas:
 *   get:
 *     summary: Lista todos os artistas
 *     tags:
 *       - SoundYard - Consultas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de artistas
 */
router.get('/artistas', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM artistas');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

/**
 * @openapi
 * /soundyard/artistas/albuns:
 *   get:
 *     summary: Lista todos os álbuns de um artista pelo nome
 *     tags:
 *       - SoundYard - Consultas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nome
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do artista
 *     responses:
 *       200:
 *         description: Lista de álbuns do artista
 */
router.get('/artistas/albuns', authMiddleware, async (req, res) => {
  try {
    const { nome } = req.query;
    if (!nome) return res.status(400).json({ error: 'O nome do artista é obrigatório' });

    const [rows] = await pool.query(`
      SELECT a.id, a.titulo, a.ano, ar.nome AS artista
      FROM albuns a
      JOIN artistas ar ON a.artista_id = ar.id
      WHERE LOWER(ar.nome) LIKE LOWER(?)
    `, [`%${nome}%`]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

/**
 * @openapi
 * /soundyard/playlists:
 *   post:
 *     summary: Cria uma nova playlist
 *     tags:
 *       - SoundYard - Playlists
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Minhas Músicas de Rock
 *     responses:
 *       201:
 *         description: Playlist criada com sucesso
 */
router.post('/playlists', authMiddleware, async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'O nome da playlist é obrigatório' });

    const id = uuidv4();
    await pool.query('INSERT INTO playlists (id, nome) VALUES (?, ?)', [id, nome]);
    res.status(201).json({ id, nome, musicas: [] });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

/**
 * @openapi
 * /soundyard/playlists:
 *   get:
 *     summary: Lista todas as playlists com suas músicas
 *     tags:
 *       - SoundYard - Playlists
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de playlists
 */
router.get('/playlists', authMiddleware, async (req, res) => {
  try {
    const [playlists] = await pool.query('SELECT * FROM playlists');
    for (const playlist of playlists) {
      const [musicas] = await pool.query(`
        SELECT m.titulo AS musica
        FROM musicas m
        JOIN playlist_musicas pm ON m.id = pm.musica_id
        WHERE pm.playlist_id = ?
      `, [playlist.id]);
      playlist.musicas = musicas;
    }
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

/**
 * @openapi
 * /soundyard/playlists/musicas:
 *   post:
 *     summary: Adiciona uma música a uma playlist pesquisando pelo nome
 *     tags:
 *       - SoundYard - Playlists
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome_playlist:
 *                 type: string
 *                 example: Minhas Músicas de Rock
 *               nome_musica:
 *                 type: string
 *                 example: Bohemian Rhapsody
 *     responses:
 *       201:
 *         description: Música adicionada com sucesso
 */
router.post('/playlists/musicas', authMiddleware, async (req, res) => {
  try {
    const { nome_playlist, nome_musica } = req.body;
    if (!nome_playlist || !nome_musica) return res.status(400).json({ error: 'O nome da playlist e da música são obrigatórios' });

    const [playlistRows] = await pool.query('SELECT id FROM playlists WHERE LOWER(nome) LIKE LOWER(?)', [`%${nome_playlist}%`]);
    if (playlistRows.length === 0) return res.status(404).json({ error: 'Playlist não encontrada' });

    const [musicaRows] = await pool.query('SELECT id FROM musicas WHERE LOWER(titulo) LIKE LOWER(?)', [`%${nome_musica}%`]);
    if (musicaRows.length === 0) return res.status(404).json({ error: 'Música não encontrada' });

    await pool.query('INSERT INTO playlist_musicas (playlist_id, musica_id) VALUES (?, ?)', [playlistRows[0].id, musicaRows[0].id]);

    res.status(201).json({ message: 'Música adicionada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
