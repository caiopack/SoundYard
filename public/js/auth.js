// public/js/auth.js
import { supa, getAccessToken } from './supabaseClient.js';

const $ = (sel) => document.querySelector(sel);
const msg = $('#msg');
const ok  = $('#ok');

const btnLogin  = $('#btnLogin');
const btnSignup = $('#btnSignup');
const btnLogout = $('#btnLogout');
const btnGoApp  = $('#btnGoApp');

const emailEl = $('#email');
const passEl  = $('#password');

function showErr(text) { msg.textContent = text || ''; ok.textContent = ''; }
function showOk(text)  { ok.textContent  = text || ''; msg.textContent = ''; }

async function goIfLogged() {
  const { data: { session } } = await supa.auth.getSession();
  if (session) {
    btnLogout.style.display = 'block';
    btnGoApp.style.display = 'block';
    showOk(`Logado como ${session.user?.email}`);
  } else {
    btnLogout.style.display = 'none';
    btnGoApp.style.display = 'none';
  }
}

btnLogin?.addEventListener('click', async () => {
  showErr('');
  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) return showErr('Preencha e-mail e senha');

  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if (error) return showErr(error.message);

  showOk('Login realizado!');
  // opcional: validar acesso ao backend
  const token = await getAccessToken();
  if (token) window.location.href = '/playlists.html';
});

btnSignup?.addEventListener('click', async () => {
  showErr('');
  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) return showErr('Preencha e-mail e senha');

  const { data, error } = await supa.auth.signUp({ email, password });
  if (error) return showErr(error.message);

  showOk('Conta criada! Faça login para continuar.');
});

btnLogout?.addEventListener('click', async () => {
  await supa.auth.signOut();
  showOk('Sessão encerrada.');
  await goIfLogged();
});

btnGoApp?.addEventListener('click', () => {
  window.location.href = '/playlists.html';
});

// Atualiza UI ao carregar
goIfLogged();

// (Opcional) Listener de mudança de auth
supa.auth.onAuthStateChange(async (_event, session) => {
  if (session) {
    showOk(`Logado como ${session.user?.email}`);
    btnLogout.style.display = 'block';
    btnGoApp.style.display = 'block';
  } else {
    btnLogout.style.display = 'none';
    btnGoApp.style.display = 'none';
  }
});
