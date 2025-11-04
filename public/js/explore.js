import { supa, getAccessToken } from './supabaseClient.js';

const $ = (s) => document.querySelector(s);

const btnRefresh = $('#btnRefresh');
const btnExport  = $('#btnExport');
const publicList = $('#publicList');
const tracksEl   = $('#tracks');

const authHint   = $('#authHint');
const btnLogout  = $('#btnLogout');
const myPlaylistSelect = $('#myPlaylistSelect');

let token = null;
let selectedPlaylistId = null; // playlist pública selecionada
let selectedPlaylistObj = null;

// ------------------------ Helpers ------------------------

function durationToStr(sec) {
  const m = Math.floor((sec ?? 0) / 60);
  const s = (sec ?? 0) % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = !!loading;
  btn.textContent = loading ? 'Aguarde...' : (btn.getAttribute('data-label') || btn.textContent);
}

function setActiveList(container, id) {
  container.querySelectorAll('li').forEach(li => li.classList.remove('active'));
  const el = container.querySelector(`li[data-id="${id}"]`);
  if (el) el.classList.add('active');
}

// ------------------------ Render ------------------------

function renderPublic(list) {
  publicList.innerHTML = '';
  tracksEl.innerHTML = '<li class="muted">Selecione uma playlist pública.</li>';
  btnExport.disabled = true;
  selectedPlaylistId = null;
  selectedPlaylistObj = null;

  if (!list?.length) {
    publicList.innerHTML = '<li class="muted">Nenhuma playlist pública encontrada.</li>';
    return;
  }

  for (const p of list) {
    const li = document.createElement('li');
    li.dataset.id = p.id;
    li.innerHTML = `
      <div class="row">
        <div><strong>${p.name}</strong></div>
        <span class="pill">${new Date(p.updated_at).toLocaleDateString()}</span>
      </div>
    `;
    li.addEventListener('click', () => onPublicClick(p));
    publicList.appendChild(li);
  }
}

function renderTracks(payload) {
  tracksEl.innerHTML = '';
  if (!payload || !payload.tracks || !payload.tracks.length) {
    tracksEl.innerHTML = '<li class="muted">Playlist vazia.</li>';
    return;
  }

  const haveAuth = !!token && !!myPlaylistSelect.value;

  for (const t of payload.tracks) {
    const li = document.createElement('li');
    li.className = 'track';
    li.innerHTML = `
      <div class="meta">
        <strong>${t.title}</strong>
        <small class="muted">${durationToStr(t.duration_seconds)}</small>
      </div>
      <button class="primary copy" data-id="${t.id}" ${haveAuth ? '' : 'disabled'}>
        ${haveAuth ? 'Copiar para minha playlist' : 'Faça login e selecione a sua playlist'}
      </button>
    `;
    tracksEl.appendChild(li);
  }
}

// ------------------------ Eventos ------------------------

async function onPublicClick(p) {
  selectedPlaylistId = p.id;
  selectedPlaylistObj = p;
  setActiveList(publicList, p.id);
  btnExport.disabled = false;

  // carrega conteúdo (usando o mesmo payload do export, mas sem baixar arquivo)
  try {
    const res = await fetch(`/playlists/${p.id}/export`);
    if (!res.ok) throw new Error(await res.text());
    const payload = await res.json();
    renderTracks(payload);
  } catch (e) {
    console.error('Erro ao carregar conteúdo:', e);
    tracksEl.innerHTML = '<li class="muted">Erro ao carregar o conteúdo.</li>';
  }
}

tracksEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button.copy');
  if (!btn) return;

  const trackId = btn.dataset.id;
  const myPlId = myPlaylistSelect.value;
  if (!token) return alert('Faça login.');
  if (!myPlId) return alert('Selecione uma das suas playlists.');

  setLoading(btn, true);
  try {
    await authed(`/playlists/me/playlists/${myPlId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track_id: trackId })
    });
    btn.textContent = 'Copiada ✓';
  } catch (err) {
    console.error('Erro ao copiar faixa:', err);
    alert('Erro ao copiar faixa: ' + err.message);
    setLoading(btn, false);
  }
});

btnRefresh.addEventListener('click', async () => {
  await loadPublic();
});

btnExport.addEventListener('click', async () => {
  if (!selectedPlaylistId) return alert('Selecione uma playlist pública.');
  try {
    const res = await fetch(`/playlists/${selectedPlaylistId}/export`);
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `playlist-${selectedPlaylistId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    console.error('Falha ao exportar:', err);
    alert('Falha ao exportar: ' + err.message);
  }
});

// ------------------------ Sessão ------------------------

async function loadUserPlaylistsIfLogged() {
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    authHint.style.display = 'inline';
    btnLogout.style.display = 'none';
    myPlaylistSelect.style.display = 'none';
    token = null;
    return null;
  }
  authHint.style.display = 'none';
  btnLogout.style.display = 'inline-block';
  myPlaylistSelect.style.display = 'inline-block';

  token = await getAccessToken();

  try {
    const res = await fetch('/playlists/me/playlists', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    const mine = await res.json();

    myPlaylistSelect.innerHTML = `<option value="">— copiar faixa para minha playlist —</option>`;
    for (const p of mine) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      myPlaylistSelect.appendChild(opt);
    }
  } catch (e) {
    console.error('Erro ao carregar minhas playlists:', e);
  }
  return session;
}

// ------------------------ Data ------------------------

async function loadPublic() {
  try {
    const list = await api('/playlists/public');
    renderPublic(list);
  } catch (e) {
    console.error('Erro ao carregar públicas:', e);
    publicList.innerHTML = '<li class="muted">Erro ao carregar playlists públicas.</li>';
  }
}

// ------------------------ Init ------------------------

async function init() {
  await loadPublic();
  await loadUserPlaylistsIfLogged();

  btnLogout.addEventListener('click', async () => {
    await supa.auth.signOut();
    token = null;
    await loadUserPlaylistsIfLogged();
    alert('Sessão encerrada.');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
