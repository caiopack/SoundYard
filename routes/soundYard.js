import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../utils/db.js';

const router = express.Router();

// --- ROTAS DE CONSULTA ---

/**
 * @openapi
 * /soundyard/artistas:
 *   get:
 *     summary: Lista todos os artistas
 *     tags:
 *       - SoundYard - Consultas
 *     responses:
 *       200:
 *         description: Lista de artistas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   nome:
 *                     type: string
 */
router.get('/artistas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM artistas');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar artistas:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

/**
 * @openapi
 * /soundyard/artistas/{id}/albuns:
 *   get:
 *     summary: Lista todos os álbuns de um artista
 *     tags:
 *       - SoundYard - Consultas
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do artista
 *     responses:
 *       200:
 *         description: Lista de álbuns do artista
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   titulo:
 *                     type: string
 */
router.get('/artistas/:id/albuns', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM albuns WHERE artista_id = ?', [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar álbuns:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// --- ROTAS DE PLAYLISTS ---

/**
 * @openapi
 * /soundyard/playlists:
 *   post:
 *     summary: Cria uma nova playlist
 *     tags:
 *       - SoundYard - Playlists
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 musicas:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post('/playlists', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'O nome da playlist é obrigatório' });

    const id = uuidv4();
    await pool.query('INSERT INTO playlists (id, nome) VALUES (?, ?)', [id, nome]);
    res.status(201).json({ id, nome, musicas: [] });
  } catch (err) {
    console.error('Erro ao criar playlist:', err);
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
 *     responses:
 *       200:
 *         description: Lista de playlists
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   nome:
 *                     type: string
 *                   musicas:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         titulo:
 *                           type: string
 */
router.get('/playlists', async (req, res) => {
  try {
    const [playlists] = await pool.query('SELECT * FROM playlists');
    for (const playlist of playlists) {
      const [musicas] = await pool.query(`
        SELECT m.id, m.titulo 
        FROM musicas m
        JOIN playlist_musicas pm ON m.id = pm.musica_id
        WHERE pm.playlist_id = ?
      `, [playlist.id]);
      playlist.musicas = musicas;
    }
    res.json(playlists);
  } catch (err) {
    console.error('Erro ao listar playlists:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

/**
 * @openapi
 * /soundyard/playlists/{id}/musicas:
 *   post:
 *     summary: Adiciona uma música a uma playlist
 *     tags:
 *       - SoundYard - Playlists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da playlist
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               musica_id:
 *                 type: string
 *                 example: "e5f6a7b8-c9d0-1234-5678-90abcdef1234"
 *     responses:
 *       201:
 *         description: Música adicionada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Música adicionada com sucesso!
 */
router.post('/playlists/:id/musicas', async (req, res) => {
  try {
    const { musica_id } = req.body;
    const playlist_id = req.params.id;
    if (!musica_id) return res.status(400).json({ error: 'O ID da música (musica_id) é obrigatório' });

    await pool.query('INSERT INTO playlist_musicas (playlist_id, musica_id) VALUES (?, ?)', [playlist_id, musica_id]);
    res.status(201).json({ message: 'Música adicionada com sucesso!' });
  } catch (err) {
    console.error('Erro ao adicionar música:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
