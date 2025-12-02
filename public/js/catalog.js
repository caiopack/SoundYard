import { supa, getAccessToken } from './supabaseClient.js';

const $ = (sel) => document.querySelector(sel);
const artistsEl = $('#artists');
const albumsEl  = $('#albums');
const tracksEl  = $('#tracks');

const playlistSelect = $('#playlistSelect');
const authHint = $('#authHint');
const btnLogout = $('#btnLogout');

let token = null;            // JWT (se logado)
let currentArtist = null;    // artist_id selecionado
let currentAlbum  = null;    // album_id selecionado

// ------------------------ Helpers ------------------------

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function authed(path, options = {}) {
  if (!token) throw new Error('Faça login para continuar');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json().catch(() => null);
}

function durationToStr(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function setActive(liContainer, id) {
  liContainer.querySelectorAll('li').forEach(li => li.classList.remove('active'));
  const el = liContainer.querySelector(`li[data-id="${id}"]`);
  if (el) el.classList.add('active');
}

// ------------------------ UI Render ------------------------

function renderArtists(list) {
  artistsEl.innerHTML = '';
  if (!list?.length) {
    artistsEl.innerHTML = '<li class="muted">Nenhum artista encontrado.</li>';
    return;
  }
  for (const a of list) {
    const li = document.createElement('li');
    li.dataset.id = a.id;
    li.textContent = a.name;
    li.addEventListener('click', () => onArtistClick(a));
    artistsEl.appendChild(li);
  }
}

function renderAlbums(list) {
  albumsEl.innerHTML = '';
  tracksEl.innerHTML = '';
  if (!list?.length) {
    albumsEl.innerHTML = '<li class="muted">Selecione um artista.</li>';
    return;
  }
  for (const al of list) {
    const li = document.createElement('li');
    li.dataset.id = al.id;
    li.innerHTML = `
      <div class="row">
        <div><strong>${al.title}</strong></div>
        <span class="pill">${al.year ?? '—'}</span>
      </div>
    `;
    li.addEventListener('click', () => onAlbumClick(al));
    albumsEl.appendChild(li);
  }
}

function renderTracks(list) {
  tracksEl.innerHTML = '';
  if (!list?.length) {
    tracksEl.innerHTML = '<li class="muted">Selecione um álbum.</li>';
    return;
  }
  const canAdd = !!token && !!playlistSelect.value;
  for (const t of list) {
    const li = document.createElement('li');
    li.className = 'track';
    li.dataset.id = t.id;
    li.innerHTML = `
      <div class="meta">
        <strong>${t.title}</strong>
        <small class="muted">${durationToStr(t.duration_seconds ?? 0)}</small>
      </div>
      <button class="primary add" ${canAdd ? '' : 'disabled'} data-id="${t.id}">
        ${canAdd ? 'Adicionar' : 'Adicionar (selecione uma playlist)'}
      </button>
    `;
    tracksEl.appendChild(li);
  }
}

// ------------------------ Eventos ------------------------

async function onArtistClick(artist) {
  currentArtist = artist.id;
  currentAlbum = null;
  setActive(artistsEl, artist.id);
  renderAlbums([]); // limpa álbuns temporariamente
  renderTracks([]); // limpa faixas

  try {
    const albums = await api(`/catalog/albums?artist_id=${encodeURIComponent(artist.id)}`);
    renderAlbums(albums);
  } catch (e) {
    console.error('Erro ao carregar álbuns:', e);
    albumsEl.innerHTML = `<li class="muted">Erro ao carregar álbuns.</li>`;
  }
}

async function onAlbumClick(album) {
  currentAlbum = album.id;
  setActive(albumsEl, album.id);
  renderTracks([]); // limpa faixas temporariamente

  try {
    const tracks = await api(`/catalog/tracks?album_id=${encodeURIComponent(album.id)}`);
    renderTracks(tracks);
  } catch (e) {
    console.error('Erro ao carregar faixas:', e);
    tracksEl.innerHTML = `<li class="muted">Erro ao carregar faixas.</li>`;
  }
}

tracksEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button.add');
  if (!btn) return;

  const trackId = btn.dataset.id;
  const plId = playlistSelect.value;
  if (!token) {
    alert('Faça login para adicionar faixas.');
    return;
  }
  if (!plId) {
    alert('Selecione uma playlist de destino.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Adicionando...';
  try {
    await authed(`/playlists/me/playlists/${plId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track_id: trackId })
    });
    btn.textContent = 'Adicionada ✓';
  } catch (err) {
    console.error('Erro ao adicionar faixa:', err);
    alert('Erro ao adicionar faixa: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Adicionar';
  }
});

playlistSelect.addEventListener('change', () => {
  // re-renderiza para habilitar/desabilitar botões "Adicionar"
  if (currentAlbum) {
    // re-carrega as faixas atuais para atualizar estado dos botões
    onAlbumClick({ id: currentAlbum });
  }
});

// ------------------------ Sessão / Playlists do usuário ------------------------

async function loadUserPlaylistsIfLogged() {
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    authHint.style.display = 'inline';
    btnLogout.style.display = 'none';
    return null;
  }
  authHint.style.display = 'none';
  btnLogout.style.display = 'inline-block';

  token = await getAccessToken();

  try {
    const res = await fetch('/playlists/me/playlists', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    const mine = await res.json();

    playlistSelect.innerHTML = `<option value="">— selecione uma playlist (requer login) —</option>`;
    for (const p of mine) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      playlistSelect.appendChild(opt);
    }
  } catch (e) {
    console.error('Erro ao carregar playlists do usuário:', e);
  }
  return session;
}

// ------------------------ Inicialização ------------------------

async function init() {
  // Carrega catálogo de artistas
  try {
    const artists = await api('/catalog/artists');
    renderArtists(artists);
  } catch (e) {
    console.error('Erro ao carregar artistas:', e);
    artistsEl.innerHTML = `<li class="muted">Erro ao carregar artistas.</li>`;
  }

  // Se logado, carrega playlists para o select
  await loadUserPlaylistsIfLogged();

  // Botão de logout (aparece só se logado)
  btnLogout.addEventListener('click', async () => {
    await supa.auth.signOut();
    token = null;
    playlistSelect.innerHTML = `<option value="">— selecione uma playlist (requer login) —</option>`;
    authHint.style.display = 'inline';
    btnLogout.style.display = 'none';
    alert('Sessão encerrada.');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
