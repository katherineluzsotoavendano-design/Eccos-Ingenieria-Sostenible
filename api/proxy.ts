
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const GAS_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const SECRET_TOKEN = process.env.INTERNAL_PROXY_TOKEN;

  // Si falta alguna configuración, lo indicamos detalladamente para el usuario
  if (!GAS_URL || !SECRET_TOKEN) {
    const missing = [];
    if (!GAS_URL) missing.push('GOOGLE_SHEETS_WEBHOOK_URL');
    if (!SECRET_TOKEN) missing.push('INTERNAL_PROXY_TOKEN');
    
    return res.status(500).json({ 
      success: false, 
      error: `CONFIGURACIÓN INCOMPLETA: Faltan las variables [${missing.join(', ')}] en Vercel. Agrégalas en Settings > Environment Variables y realiza un REDEPLOY.` 
    });
  }

  try {
    // Manejo flexible del body (objeto o string)
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Inyectamos el token de seguridad que valida el Apps Script
    const securePayload = {
      ...payload,
      proxyToken: SECRET_TOKEN
    };

    // Llamada a Google Apps Script
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(securePayload),
      redirect: 'follow'
    });

    const data = await response.text();
    
    // Enviamos la respuesta de vuelta
    res.status(200).send(data);
  } catch (error: any) {
    console.error('Error en Proxy:', error);
    res.status(500).json({ success: false, error: 'Error en la pasarela de seguridad: ' + error.message });
  }
}
