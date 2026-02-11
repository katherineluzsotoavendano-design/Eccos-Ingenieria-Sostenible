
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nwdotglriwkgutqzlkye.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZG90Z2xyaXdrZ3V0cXpsa3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTcwNjMsImV4cCI6MjA4NjIzMzA2M30.FrVxGqJwYnreJSd45nY89Rv3dBSGFR0RE3NYR4wehFU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
