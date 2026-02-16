
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const GAS_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const SECRET_TOKEN = process.env.INTERNAL_PROXY_TOKEN;

  // Verificación detallada
  if (!GAS_URL || !SECRET_TOKEN) {
    const missing = [];
    if (!GAS_URL) missing.push('GOOGLE_SHEETS_WEBHOOK_URL');
    if (!SECRET_TOKEN) missing.push('INTERNAL_PROXY_TOKEN');
    
    return res.status(500).json({ 
      success: false, 
      error: `CONFIGURACIÓN INCOMPLETA EN VERCEL: Faltan las variables de entorno [${missing.join(', ')}]. Agrégalas en Settings > Environment Variables y haz un REDEPLOY.` 
    });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    const securePayload = {
      ...payload,
      proxyToken: SECRET_TOKEN
    };

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(securePayload),
      redirect: 'follow'
    });

    const data = await response.text();
    res.status(200).send(data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error en la pasarela de seguridad: ' + error.message });
  }
}
