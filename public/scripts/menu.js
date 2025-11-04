const API_BASE = 'http://localhost:3000/soundyard';

let token = localStorage.getItem('soundyardToken') || '';
const tokenInput = document.getElementById('apiKey');
tokenInput.value = token;
tokenInput.addEventListener('input', e => {
    token = e.target.value.trim();
    localStorage.setItem('soundyardToken', token);
});

function getHeaders() {
    return { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) };
}

function showResult(obj) {
    document.getElementById('resultado').textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

async function fetchAPI(path, options = {}) {
    try {
        const res = await fetch(API_BASE + path, { headers: getHeaders(), ...options });
        if (res.status === 204) return showResult('Operação realizada com sucesso');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        showResult(data);
        return data;
    } catch (err) {
        showResult({ error: err.message });
    }
}

async function carregarPlaylists() {
    const playlists = await fetchAPI('/playlists');
    const select = document.getElementById('playlistSelect');
    select.innerHTML = '';
    if (Array.isArray(playlists)) {
        playlists.forEach(p => {
            const option = document.createElement('option');
            option.value = p.nome;
            option.textContent = p.nome;
            select.appendChild(option);
        });
    }
}

document.getElementById('btnListarArtistas').onclick = () => fetchAPI('/artistas');
document.getElementById('btnListarAlbuns').onclick = () => {
    const nome = document.getElementById('nomeArtistaAlbuns').value.trim();
    if (!nome) return alert('Informe o nome do artista.');
    fetchAPI(`/artistas/albuns?nome=${encodeURIComponent(nome)}`);
};
document.getElementById('btnListarPlaylists').onclick = () => fetchAPI('/playlists');
document.getElementById('btnListarMusicas').onclick = () => fetchAPI('/musicas');
document.getElementById('btnCriarPlaylist').onclick = () => {
    const nome = document.getElementById('playlistNome').value.trim();
    if (!nome) return alert('Informe o nome da playlist.');
    fetchAPI('/playlists', { method: 'POST', body: JSON.stringify({ nome }) }).then(() => carregarPlaylists());
};
document.getElementById('btnAdicionarMusica').onclick = () => {
    const nome_playlist = document.getElementById('playlistSelect').value;
    const nome_musica = document.getElementById('musicaNomeAdicionar').value.trim();
    if (!nome_playlist || !nome_musica) return alert('Informe playlist e música.');
    fetchAPI('/playlists/musicas', { method: 'POST', body: JSON.stringify({ nome_playlist, nome_musica }) });
};

window.onload = () => {
    if (token) {
        document.getElementById('btnListarPlaylists').click();
        carregarPlaylists();
    }
};
