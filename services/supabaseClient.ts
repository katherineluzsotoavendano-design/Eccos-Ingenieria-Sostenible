
import { createClient } from '@supabase/supabase-js';

// Usamos las variables de entorno si están disponibles, de lo contrario usamos los valores proporcionados por el usuario
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nwdotglriwkgutqzlkye.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZG90Z2xyaXdrZ3V0cXpsa3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTcwNjMsImV4cCI6MjA4NjIzMzA2M30.FrVxGqJwYnreJSd45nY89Rv3dBSGFR0RE3NYR4wehFU';

if (!SUPABASE_ANON_KEY) {
  console.error("CRITICAL: Supabase Anon Key is missing. The application will not be able to connect to the database.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
