
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Estas líneas aseguran que los valores de Vercel se inyecten físicamente en el código cliente
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
    'process.env.INTERNAL_PROXY_TOKEN': JSON.stringify(process.env.INTERNAL_PROXY_TOKEN || ''),
    'process.env.GOOGLE_SHEETS_WEBHOOK_URL': JSON.stringify(process.env.GOOGLE_SHEETS_WEBHOOK_URL || ''),
  }
});
