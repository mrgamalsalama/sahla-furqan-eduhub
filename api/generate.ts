import { executeGenerate } from './_shared.js';

// ضبط الحد الأقصى الزمني لمعالجة الطلب (60 ثانية) كتصدير مستقل وفق معايير Vercel
export const maxDuration = 60;

// إعدادات الـ API وحجم الـ Payload
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  // إعداد ترويسات CORS للسماح بالوصول
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // التعامل مع طلبات التحقق المسبق (Preflight request)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // رفض أي طلب بغير طريقة POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    return await executeGenerate(req, res);
  } catch (err: any) {
    console.error('Fatal handler error in /api/generate:', err);
    return res.status(500).json({
      error: err?.message || 'Server error',
      details: String(err),
    });
  }
}
