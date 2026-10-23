import { executePdfOcr } from './_shared.js';

export const maxDuration = 60;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    return await executePdfOcr(req, res);
  } catch (err: any) {
    console.error('Fatal handler error in /api/pdf-ocr:', err);
    return res.status(500).json({
      error: err?.message || 'Server error',
      details: String(err),
    });
  }
}
