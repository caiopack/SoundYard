// src/middleware/supaAuth.js
import { supa } from '../lib/supa.js';

/**
 * Middleware de autenticação com Supabase.
 * - Espera header: Authorization: Bearer <JWT>
 * - Valida o token no Supabase (auth.getUser)
 * - Em caso de sucesso, injeta req.user = { id, email, ... }
 * - Em caso de falha, responde 401 com JSON
 *
 * Use:
 *   r.use('/me', supaAuth);
 */
export default async function supaAuth(req, res, next) {
  try {
    // Permite preflight CORS passar
    if (req.method === 'OPTIONS') return next();

    const header = req.headers.authorization || '';
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header ausente ou inválido' });
    }

    const token = header.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: 'Token ausente' });
    }

    // Valida o token com o Supabase
    const { data, error } = await supa.auth.getUser(token);
    if (error || !data?.user) {
      // Observação: error pode conter informações adicionais do Supabase
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    const user = data.user;

    // Injeta um objeto "limpo" no req para uso nas rotas
    req.user = {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      app_metadata: user.app_metadata ?? {},
      user_metadata: user.user_metadata ?? {},
    };

    return next();
  } catch (err) {
    // Em caso de erro inesperado, retorne 500 para não expor detalhes
    console.error('[supaAuth] Erro inesperado:', err);
    return res.status(500).json({ error: 'Falha na autenticação' });
  }
}
