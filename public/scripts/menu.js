const API_URL = "http://localhost:3000/soundyard";

const inputApiKey = document.getElementById("apiKey");
const resultado = document.getElementById("resultado");

const btnListarArtistas = document.getElementById("btnListarArtistas");
const btnListarAlbuns = document.getElementById("btnListarAlbuns");
const btnListarPlaylists = document.getElementById("btnListarPlaylists");
const btnListarMusicas = document.getElementById("btnListarMusicas");

const btnCriarPlaylist = document.getElementById("btnCriarPlaylist");
const btnAdicionarMusica = document.getElementById("btnAdicionarMusica");

const selectPlaylist = document.getElementById("selectPlaylist");
const selectMusica = document.getElementById("selectMusica");

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${inputApiKey.value}`
  };
}

function mostrarResultado(data) {
  resultado.textContent = JSON.stringify(data, null, 2);
}

// ====== LISTAR ARTISTAS ======
btnListarArtistas.onclick = async () => {
  const res = await fetch(`${API_URL}/artistas`, { headers: getHeaders() });
  mostrarResultado(await res.json());
};

// ====== LISTAR ÁLBUNS ======
btnListarAlbuns.onclick = async () => {
  const nome = document.getElementById("nomeArtistaAlbuns").value;
  const res = await fetch(`${API_URL}/artistas/albuns?nome=${nome}`, {
    headers: getHeaders()
  });
  mostrarResultado(await res.json());
};

// ====== LISTAR PLAYLISTS ======
btnListarPlaylists.onclick = async () => {
  const res = await fetch(`${API_URL}/playlists`, { headers: getHeaders() });
  const data = await res.json();
  mostrarResultado(data);
  preencherSelectPlaylists(data);
};

// ====== LISTAR MÚSICAS ======
btnListarMusicas.onclick = async () => {
  const res = await fetch(`${API_URL}/musicas`, { headers: getHeaders() });
  const data = await res.json();
  mostrarResultado(data);
  preencherSelectMusicas(data);
};

// ====== CRIAR PLAYLIST ======
btnCriarPlaylist.onclick = async () => {
  const nome = document.getElementById("playlistNome").value;

  const res = await fetch(`${API_URL}/playlists`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ nome })
  });

  const data = await res.json();
  mostrarResultado(data);

  btnListarPlaylists.click();
};

// ====== ADICIONAR MÚSICA À PLAYLIST (AGORA VIA IDs) ======
btnAdicionarMusica.onclick = async () => {
  const playlist_id = selectPlaylist.value;
  const musica_id = selectMusica.value;

  if (!playlist_id || !musica_id) {
    return alert("Escolha playlist e música.");
  }

  const res = await fetch(`${API_URL}/playlists/musicas`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ playlist_id, musica_id })
  });

  const data = await res.json();
  mostrarResultado(data);

  btnListarPlaylists.click();
};

// ====== Preencher selects ======
function preencherSelectPlaylists(playlists) {
  selectPlaylist.innerHTML = `<option value="">Selecione uma Playlist</option>`;
  playlists.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;          // agora usa ID
    opt.textContent = p.nome;
    selectPlaylist.appendChild(opt);
  });
}

function preencherSelectMusicas(musicas) {
  selectMusica.innerHTML = `<option value="">Selecione uma Música</option>`;
  musicas.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;         // agora usa ID
    opt.textContent = m.titulo;
    selectMusica.appendChild(opt);
  });
}
