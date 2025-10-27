import { API_TOKEN } from '../config.js';

function authMiddleware(req, res, next) {
  console.log("Authorization header:", req.headers['authorization']); // 👈 novo
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  const token = parts[1];
  if (token !== API_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  next();
}


export default authMiddleware;