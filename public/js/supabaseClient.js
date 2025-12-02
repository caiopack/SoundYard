// public/js/supabaseClient.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.__SUPABASE__;
if (!cfg?.url || !cfg?.anon) {
  console.error('Supabase URL/ANON key ausentes no index.html');
}

export const supa = createClient(cfg.url, cfg.anon, {
  auth: {
    persistSession: true, // mantém sessão no localStorage
    detectSessionInUrl: true
  }
});

// helper: retorna access_token atual (ou null)
export async function getAccessToken() {
  const { data: { session } } = await supa.auth.getSession();
  return session?.access_token ?? null;
}

// helper: redireciona logado/não logado
export async function ensureAuthOrRedirect() {
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    window.location.href = '/';
    return null;
  }
  return session;
}
