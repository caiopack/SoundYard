// public/js/playlists.js
import { supa, ensureAuthOrRedirect, getAccessToken } from './supabaseClient.js';

const $ = (s) => document.querySelector(s);

// ===== UI base =====
const myPlaylistsEl = $('#myPlaylists');
const createForm    = $('#createForm');
const nameInput     = $('#playlistName');
const btnLogout     = $('#btnLogout');

const editorTitle   = $('#editorTitle');
const editorBody    = $('#editorBody');
const btnExport     = $('#btnExport');
const btnTogglePub  = $('#btnTogglePub');
const btnDelete     = $('#btnDelete');

// Busca (popover)
const searchInput   = $('#searchInput');
const btnSearch     = $('#btnSearch');
const popover       = $('#searchPopover');

// Modal
const modalOverlay  = document.getElementById('modalOverlay');
const modalTitle    = document.getElementById('modalTitle');
const modalBody     = document.getElementById('modalBody');
const modalClose    = document.getElementById('modalClose');

// ===== State =====
let token = null;
let selected = null; // playlist aberta no editor
let popState = { items: [], activeIndex: -1 }; // itens flat do popover
let myPlaylistsCache = []; // [{id,name,is_public}, ...] mantido pelo loadMyPlaylists()


// ===== Helpers =====
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  const txt = await res.text();
  let data; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!res.ok) throw new Error(typeof data === 'string' ? data : (data?.error || 'Erro'));
  return data;
}
function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = !!loading;
  const base = btn.getAttribute('data-label') || btn.textContent;
  btn.textContent = loading ? 'Aguarde...' : base;
}
function liActive(container, id) {
  container.querySelectorAll('li').forEach(li => li.classList.remove('active'));
  const el = container.querySelector(`li[data-id="${id}"]`);
  if (el) el.classList.add('active');
}
function debounce(fn, ms=250) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
function openPopover() { popover.style.display = 'block'; }
function closePopover() { popover.style.display = 'none'; popState = { items: [], activeIndex: -1 }; }
function setActivePopover(i) {
  popState.activeIndex = i;
  popover.querySelectorAll('.search-item').forEach((el, idx) => {
    if (idx === i) el.classList.add('active'); else el.classList.remove('active');
  });
}
async function createPlaylistAndAddTrack(playlistName, trackId) {
  const created = await api('/playlists/me/playlists', {
    method: 'POST',
    body: JSON.stringify({ name: playlistName })
  });
  const plId = created?.id || created;
  await api(`/playlists/me/playlists/${plId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ track_id: trackId })
  });
  await loadMyPlaylists();
  await onSelectPlaylist(plId);
}


// ===== Modal helpers =====
function openModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modalOverlay.style.display = 'block';
}
function closeModal() {
  modalOverlay.style.display = 'none';
  modalBody.innerHTML = '';
}
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

// ===== Utilitários de tracks/payload =====
function renderTracksList(tracks) {
  if (!tracks?.length) return '<p class="muted">Sem faixas.</p>';
  return `
    <ul>
      ${tracks.map(t => `
        <li class="track">
          <div class="meta">
            <strong>${t.title}</strong>
            <small class="small">${t.duration_seconds ?? 0}s</small>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

async function addExportPayloadToSelected(payload) {
  if (!selected) { alert('Selecione uma playlist no editor.'); return; }
  const tracks = payload?.tracks || [];
  for (const t of tracks) {
    await api(`/playlists/me/playlists/${selected.id}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track_id: t.id })
    });
  }
  await onSelectPlaylist(selected.id);
}

async function copyExportPayloadToNew(payload, newName) {
  const created = await api('/playlists/me/playlists', {
    method: 'POST',
    body: JSON.stringify({ name: newName })
  });
  const plId = created?.id || created; // compat
  for (const t of (payload.tracks || [])) {
    await api(`/playlists/me/playlists/${plId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track_id: t.id })
    });
  }
  await loadMyPlaylists();
  await onSelectPlaylist(plId);
}

// ===== Minhas Playlists =====
async function loadMyPlaylists() {
  const list = await api('/playlists/me/playlists');
  myPlaylistsEl.innerHTML = '';
  if (!list.length) {
    myPlaylistsEl.innerHTML = '<li class="muted">Nenhuma playlist criada.</li>';
    return;
  }
  for (const p of list) {
    const li = document.createElement('li');
    li.dataset.id = p.id;
    li.className = 'item';
    li.innerHTML = `
      <div><strong>${p.name}</strong></div>
      <span class="pill">${p.is_public ? '🌍 pública' : '🔒 privada'}</span>
    `;
    li.addEventListener('click', () => onSelectPlaylist(p.id));
    myPlaylistsEl.appendChild(li);
  }
  myPlaylistsCache = list; // mantém lista atual para o modal

}

async function onSelectPlaylist(id) {
  const detail = await api(`/playlists/me/playlists/${id}/detail`);
  selected = detail;
  liActive(myPlaylistsEl, id);
  renderEditor();
}

function renderEditor() {
  if (!selected) {
    editorTitle.textContent = 'Editor';
    editorBody.innerHTML = `<p class="muted">Selecione uma playlist para editar.</p>`;
    btnExport.disabled = btnTogglePub.disabled = btnDelete.disabled = true;
    return;
  }
  editorTitle.textContent = `Editor — ${selected.name}`;
  btnExport.disabled = false;
  btnTogglePub.disabled = false;
  btnDelete.disabled = false;
  btnTogglePub.textContent = selected.is_public ? 'Tornar Privada' : 'Publicar';
  btnTogglePub.setAttribute('data-label', btnTogglePub.textContent);

  const tracksHtml = (selected.tracks || []).map(t => `
    <li class="track">
      <div class="meta">
        <strong>${t.title}</strong>
        <small class="muted">${t.duration_seconds ?? 0}s</small>
      </div>
      <button class="btn danger rm" data-id="${t.id}" data-label="Remover">Remover</button>
    </li>
  `).join('') || '<li class="muted">Sem faixas.</li>';

  editorBody.innerHTML = `
    <div class="row" style="gap:8px; margin-bottom:8px;">
      <input id="renameInput" value="${selected.name}" />
      <button id="btnRename" class="btn primary" data-label="Salvar Nome">Salvar Nome</button>
    </div>
    <ul id="editorTracks">${tracksHtml}</ul>
  `;

  const editorTracks = $('#editorTracks');
  editorTracks.addEventListener('click', async (e) => {
    const btn = e.target.closest('button.rm');
    if (!btn) return;
    const trackId = btn.dataset.id;
    try {
      setLoading(btn, true);
      await api(`/playlists/me/playlists/${selected.id}/tracks/${trackId}`, { method: 'DELETE' });
      await onSelectPlaylist(selected.id);
    } catch (err) {
      alert('Erro ao remover faixa: ' + err.message);
    } finally {
      setLoading(btn, false);
    }
  }, { once: true });

  $('#btnRename').addEventListener('click', async () => {
    const newName = $('#renameInput').value.trim();
    if (!newName) return alert('Digite um nome');
    try {
      setLoading($('#btnRename'), true);
      await api(`/playlists/me/playlists/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName })
      });
      await onSelectPlaylist(selected.id);
    } catch (err) {
      alert('Erro ao renomear: ' + err.message);
    } finally {
      setLoading($('#btnRename'), false);
    }
  }, { once: true });
}

// ===== Ações editor =====
btnExport.addEventListener('click', async () => {
  if (!selected) return;
  try {
    setLoading(btnExport, true);
    const res = await fetch(`/playlists/${selected.id}/export`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `playlist-${selected.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert('Falha ao exportar: ' + err.message);
  } finally {
    setLoading(btnExport, false);
  }
});

btnTogglePub.addEventListener('click', async () => {
  if (!selected) return;
  try {
    setLoading(btnTogglePub, true);
    const is_public = !selected.is_public;
    await api(`/playlists/me/playlists/${selected.id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ is_public })
    });
    await onSelectPlaylist(selected.id);
    await loadMyPlaylists();
  } catch (err) {
    alert('Erro ao publicar/privar: ' + err.message);
  } finally {
    setLoading(btnTogglePub, false);
  }
});

btnDelete.addEventListener('click', async () => {
  if (!selected) return;
  if (!confirm('Excluir esta playlist?')) return;
  try {
    setLoading(btnDelete, true);
    await api(`/playlists/me/playlists/${selected.id}`, { method: 'DELETE' });
    selected = null;
    renderEditor();
    await loadMyPlaylists();
  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
  } finally {
    setLoading(btnDelete, false);
  }
});

// ===== Criar playlist =====
createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return alert('Digite um nome');
  try {
    setLoading(createForm.querySelector('button[type="submit"]'), true);
    await api('/playlists/me/playlists', { method: 'POST', body: JSON.stringify({ name }) });
    nameInput.value = '';
    await loadMyPlaylists();
  } catch (err) {
    alert('Erro ao criar: ' + err.message);
  } finally {
    setLoading(createForm.querySelector('button[type="submit"]'), false);
  }
});

// ===== Busca em tempo real (popover + modal) =====
const doLiveSearch = debounce(async (q) => {
  if (!q) { closePopover(); return; }
  try {
    const res = await fetch(`/search?q=${encodeURIComponent(q)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error(await res.text());
    const { artists, tracks, playlists_public, playlists_me } = await res.json();
    renderPopover({ artists, tracks, playlists_public, playlists_me });
  } catch {
    closePopover();
  }
}, 220);

function renderPopover({ artists = [], tracks = [], playlists_public = [], playlists_me = [] }) {
  const items = [];
  const sections = [];

  if (tracks.length) {
    sections.push(`<div class="search-section"><div class="search-title">Músicas</div>${
      tracks.map(t => {
        items.push({ type: 'track', id: t.id, title: t.title, duration: t.duration_seconds });
        return `
          <div class="search-item" data-idx="${items.length-1}">
            <div class="meta">
              <strong>${t.title}</strong>
              <small class="small">${t.duration_seconds ?? 0}s</small>
            </div>
          </div>
        `;
      }).join('')
    }</div>`);
  }

  const combined = [
    ...playlists_me.map(p => ({ ...p, mine: true })),
    ...playlists_public.map(p => ({ ...p, mine: false }))
  ];
  if (combined.length) {
    sections.push(`<div class="search-section"><div class="search-title">Playlists</div>${
      combined.map(p => {
        items.push({ type: 'playlist', id: p.id, name: p.name, mine: !!p.mine, is_public: !!p.is_public });
        return `
          <div class="search-item" data-idx="${items.length-1}">
            <div class="meta">
              <strong>${p.name}</strong>
              <small class="small">${p.mine ? 'minha' : (p.is_public ? 'pública' : 'privada')}</small>
            </div>
          </div>
        `;
      }).join('')
    }</div>`);
  }

  if (artists.length) {
    sections.push(`<div class="search-section"><div class="search-title">Artistas</div>${
      artists.map(a => {
        items.push({ type: 'artist', id: a.id, name: a.name });
        return `
          <div class="search-item" data-idx="${items.length-1}">
            <div class="meta"><strong>${a.name}</strong></div>
          </div>
        `;
      }).join('')
    }</div>`);
  }

  if (!sections.length) {
    popover.innerHTML = `<div class="search-section"><div class="muted">Sem resultados.</div></div>`;
    popState = { items: [], activeIndex: -1 };
    openPopover(); return;
  }

  popover.innerHTML = sections.join('');
  popState = { items, activeIndex: items.length ? 0 : -1 };
  openPopover();
  setActivePopover(popState.activeIndex);

  popover.querySelectorAll('.search-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.idx);
      activateItem(idx);
    });
  });
}

async function activateItem(idx) {
  const item = popState.items[idx];
  if (!item) return;

  if (item.type === 'track') {
  // monta opções de playlists do usuário
  const options = myPlaylistsCache.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const html = `
    <p><strong>${item.title}</strong></p>
    <p class="small">Duração: ${item.duration ?? 0}s</p>

    <div class="hr"></div>
    <div class="small" style="margin-bottom:6px;">Escolha a playlist de destino</div>
    <div class="row" style="gap:8px; align-items:center;">
      <select id="trackTarget" style="min-width:260px;">
        ${options ? `<option value="">— selecione —</option>${options}` : ''}
        <option value="__new__">➕ Criar nova…</option>
      </select>
      <input id="newPlName" placeholder="Nome da nova playlist" style="display:none; min-width:220px;" />
    </div>

    <div class="modal-actions">
      <button id="confirmAdd" class="btn primary">Adicionar</button>
    </div>
  `;
  openModal('Adicionar música', html);

  const sel   = document.getElementById('trackTarget');
  const input = document.getElementById('newPlName');
  const btn   = document.getElementById('confirmAdd');

  // Se o usuário não tem playlists, já seleciona "nova" e mostra input
  if (!myPlaylistsCache.length) {
    sel.value = '__new__';
    input.style.display = 'block';
  }

  sel.addEventListener('change', () => {
    if (sel.value === '__new__') input.style.display = 'block';
    else input.style.display = 'none';
  });

  btn.addEventListener('click', async () => {
    try {
      setLoading(btn, true);

      if (sel.value === '__new__') {
        const name = input.value.trim();
        if (!name) { alert('Digite um nome para a nova playlist.'); setLoading(btn, false); return; }
        await createPlaylistAndAddTrack(name, item.id);
      } else if (sel.value) {
        await api(`/playlists/me/playlists/${sel.value}/tracks`, {
          method: 'POST',
          body: JSON.stringify({ track_id: item.id })
        });
        await onSelectPlaylist(sel.value); // abre a playlist onde foi adicionada
      } else {
        alert('Escolha uma playlist ou crie uma nova.');
        setLoading(btn, false);
        return;
      }

      closeModal();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(btn, false);
    }
  });

  closePopover();
  return;
}


  if (item.type === 'playlist') {
    try {
      const res = await fetch(`/playlists/${item.id}/export`);
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();

      const html = `
        <p><strong>${payload.name}</strong> ${item.mine ? '<span class="pill">minha</span>' : (payload.is_public ? '<span class="pill">pública</span>' : '')}</p>
        <div class="hr"></div>
        <div class="small" style="margin-bottom:6px;">Faixas</div>
        ${renderTracksList(payload.tracks)}
        <div class="modal-actions">
          ${item.mine
            ? `<button id="openMine" class="btn primary">Abrir no editor</button>`
            : `
              <button id="addToSelected" class="btn ok">Adicionar à playlist aberta</button>
              <button id="copyToNew" class="btn primary">Copiar para nova playlist</button>
            `}
          <button id="downloadJson" class="btn ghost">Baixar JSON</button>
        </div>
      `;
      openModal('Playlist', html);

      document.getElementById('downloadJson').addEventListener('click', async () => {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `playlist-${item.id}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });

      if (item.mine) {
        document.getElementById('openMine').addEventListener('click', async () => {
          await onSelectPlaylist(item.id);
          closeModal();
        });
      } else {
        document.getElementById('addToSelected').addEventListener('click', async () => {
          try {
            await addExportPayloadToSelected(payload);
            closeModal();
          } catch (e) { alert(e.message); }
        });
        document.getElementById('copyToNew').addEventListener('click', async () => {
          const n = prompt('Nome da nova playlist:', payload.name);
          if (!n) return;
          try {
            await copyExportPayloadToNew(payload, n);
            closeModal();
          } catch (e) { alert(e.message); }
        });
      }
    } catch (err) {
      alert('Falha ao abrir playlist: ' + err.message);
    }
    closePopover();
    return;
  }

  if (item.type === 'artist') {
    const html = `
      <p><strong>${item.name}</strong></p>
      <p class="small">Abrir no catálogo para ver álbuns e faixas.</p>
      <div class="modal-actions">
        <a class="btn primary" href="/catalog.html?artist_id=${encodeURIComponent(item.id)}">Ver no Catálogo</a>
      </div>
    `;
    openModal('Artista', html);
    closePopover();
  }
}

// input muda → busca em tempo real
const doLive = (e) => doLiveSearch(e.target.value.trim());
searchInput.addEventListener('input', doLive);

// teclado no popover
searchInput.addEventListener('keydown', (e) => {
  if (popover.style.display !== 'block') return;
  if (e.key === 'ArrowDown') { e.preventDefault(); if (popState.items.length) setActivePopover((popState.activeIndex + 1) % popState.items.length); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); if (popState.items.length) setActivePopover((popState.activeIndex - 1 + popState.items.length) % popState.items.length); }
  if (e.key === 'Enter')     { e.preventDefault(); if (popState.activeIndex >= 0) activateItem(popState.activeIndex); }
  if (e.key === 'Escape')    { closePopover(); }
});

// clique fora fecha popover
document.addEventListener('click', (e) => {
  if (!popover.contains(e.target) && e.target !== searchInput) closePopover();
});

// botão Buscar apenas força a renderização do popover com o termo atual
btnSearch.addEventListener('click', async () => {
  const q = searchInput.value.trim();
  if (!q) return;
  try {
    setLoading(btnSearch, true);
    const res = await fetch(`/search?q=${encodeURIComponent(q)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error(await res.text());
    const { artists, tracks, playlists_public, playlists_me } = await res.json();
    renderPopover({ artists, tracks, playlists_public, playlists_me });
  } catch (err) {
    alert('Erro na busca: ' + err.message);
  } finally {
    setLoading(btnSearch, false);
  }
});

// ===== Init / Logout =====
btnLogout.addEventListener('click', async () => {
  await supa.auth.signOut();
  window.location.href = '/';
});

async function init() {
  await ensureAuthOrRedirect();
  token = await getAccessToken();
  await loadMyPlaylists();

  //abrir a primeira playlist
  const first = myPlaylistsEl.querySelector('li[data-id]');
  if (first) await onSelectPlaylist(first.getAttribute('data-id'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
