import { supa } from './supabaseClient.js';

const $ = (s) => document.querySelector(s);

const nameInput = $('#name');
const emailInput = $('#email');
const passInput  = $('#password');
const btn        = $('#btnRegister');
const msg        = $('#msg');

function setLoading(loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Aguarde...' : btn.getAttribute('data-label');
}

btn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passInput.value.trim();

  msg.style.display = 'none';
  msg.textContent = '';

  if (!name || !email || !password) {
    msg.style.display = 'block';
    msg.textContent = 'Preencha todos os campos.';
    return;
  }

  setLoading(true);

  try {
    // 1. Criar usuário no Supabase Auth
    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) throw error;

    // 2. Exibir mensagem
    msg.style.display = 'block';
    msg.textContent = 'Conta criada com sucesso! Redirecionando...';

    // 3. Redirecionar após 1s
    setTimeout(() => {
      window.location.href = '/playlists.html';
    }, 1000);

  } catch (err) {
    msg.style.display = 'block';
    msg.textContent = 'Erro: ' + err.message;
  }

  setLoading(false);
});
