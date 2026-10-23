import { executeDifferentiate, executeAddDokQuestion } from './_shared.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const isAddDokRequest =
      req.url?.includes('add-dok-question') ||
      req.query?.action === 'add-dok-question' ||
      req.body?.sourceQuestion !== undefined ||
      req.body?.dokLevel !== undefined;

    if (isAddDokRequest) {
      return await executeAddDokQuestion(req, res);
    }
    return await executeDifferentiate(req, res);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
