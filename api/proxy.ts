
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const GAS_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const SECRET_TOKEN = process.env.INTERNAL_PROXY_TOKEN;

  if (!GAS_URL || !SECRET_TOKEN) {
    return res.status(500).json({ 
      success: false, 
      error: 'Configuración incompleta: Faltan variables de entorno en Vercel (URL o Token).' 
    });
  }

  try {
    // Vercel puede parsear el body automáticamente o recibirlo como string
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Inyectamos el token de seguridad que valida el Apps Script
    const securePayload = {
      ...payload,
      proxyToken: SECRET_TOKEN
    };

    // Llamada a Google Apps Script desde el servidor (IP segura)
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(securePayload),
      redirect: 'follow' // CRÍTICO: Google suele redireccionar la respuesta del script
    });

    const data = await response.text();
    
    // Enviamos la respuesta de vuelta al frontend
    res.status(200).send(data);
  } catch (error: any) {
    console.error('Error en Proxy:', error);
    res.status(500).json({ success: false, error: 'Error en la pasarela de seguridad: ' + error.message });
  }
}
