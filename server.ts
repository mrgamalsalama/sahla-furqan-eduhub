import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { executeGenerate, executeAdvisor, executeRubric, executeGrade, executeConvertQti } from './api/_shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Endpoints
app.post('/api/generate', executeGenerate);
app.post('/api/convert-qti', executeConvertQti);
app.post('/api/advisor', executeAdvisor);
app.post('/api/rubric', executeRubric);
app.post('/api/grade', executeGrade);

// Dev / Local Server with Vite
async function startServer() {
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else if (!process.env.VERCEL) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(templatePath)) {
          let template = fs.readFileSync(templatePath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        }
        next();
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
