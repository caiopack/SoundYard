// src/lib/supa.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.SUPABASE_URL;
const serviceRole  = process.env.SUPABASE_SERVICE_ROLE_KEY; // use a chave de serviço no backend

export const supa = createClient(supabaseUrl, serviceRole);
