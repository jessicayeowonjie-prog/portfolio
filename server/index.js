// ─────────────────────────────────────────────────────────────────────────────
// Express API for the site's content + edit mode.
//
// - GET  /api/content            → current site content (public, no auth)
// - POST /api/auth/login         → { password } -> { token }  (edit-mode gate)
// - GET  /api/auth/verify        → 200 if the x-edit-token header is valid
// - PUT  /api/content            → replace content (requires x-edit-token)
// - POST /api/uploads            → multipart file upload (requires x-edit-token)
// - /uploads/*                   → static files (photos, video, posters)
// - in production, also serves the built site from dist/
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const CONTENT_PATH = path.join(DATA_DIR, 'content.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DIST_DIR = path.join(ROOT, 'dist');

const PORT = process.env.API_PORT || 8787;
const EDIT_PASSWORD = process.env.EDIT_PASSWORD || 'change-me-please';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

if (!process.env.EDIT_PASSWORD) {
  console.warn(
    '[server] EDIT_PASSWORD is not set — using the default password.\n' +
    '         Anyone who finds /?edit could edit your live site. Set EDIT_PASSWORD\n' +
    '         in a .env file before hosting this anywhere public (see .env.example).'
  );
}

for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// ─── in-memory edit-mode session tokens ────────────────────────────────────
const tokens = new Map(); // token -> expiry timestamp
function issueToken() {
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}
function isValidToken(token) {
  if (!token) return false;
  const expiry = tokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    tokens.delete(token);
    return false;
  }
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [t, expiry] of tokens) if (now > expiry) tokens.delete(t);
}, 60 * 60 * 1000).unref();

function requireAuth(req, res, next) {
  const token = req.get('x-edit-token');
  if (!isValidToken(token)) return res.status(401).json({ error: 'Not authorized. Log in to edit mode again.' });
  next();
}

// ─── content store (a single JSON file acts as the database) ──────────────
let writeQueue = Promise.resolve();
async function readContent() {
  const raw = await fsp.readFile(CONTENT_PATH, 'utf8');
  return JSON.parse(raw);
}
async function writeContent(data) {
  // Serialize writes so two rapid saves can't interleave and corrupt the file.
  writeQueue = writeQueue.then(async () => {
    const tmp = CONTENT_PATH + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
    await fsp.rename(tmp, CONTENT_PATH);
  });
  await writeQueue;
}

// ─── uploads ────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path
        .basename(file.originalname, ext)
        .replace(/[^a-z0-9-_]+/gi, '-')
        .slice(0, 60);
      cb(null, `${base}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB (covers short presentation videos)
});

// ─── app ────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

app.get('/api/content', async (req, res) => {
  try {
    res.json(await readContent());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not read content.' });
  }
});

app.put('/api/content', requireAuth, async (req, res) => {
  const next = req.body;
  if (!next || typeof next !== 'object' || Array.isArray(next)) {
    return res.status(400).json({ error: 'Content must be a JSON object.' });
  }
  try {
    const stamped = { ...next, stamp: new Date().toISOString() };
    await writeContent(stamped);
    res.json(stamped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not save content.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password required.' });
  }
  // Constant-time-ish compare to avoid trivial timing leaks.
  const a = Buffer.from(password);
  const b = Buffer.from(EDIT_PASSWORD);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return res.status(401).json({ error: 'Wrong password.' });
  res.json({ token: issueToken() });
});

app.get('/api/auth/verify', (req, res) => {
  const token = req.get('x-edit-token');
  if (!isValidToken(token)) return res.status(401).json({ error: 'Invalid or expired session.' });
  res.json({ ok: true });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  tokens.delete(req.get('x-edit-token'));
  res.json({ ok: true });
});

app.post('/api/uploads', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// In production, serve the built frontend and support client-side routing.
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[server] content API listening on http://localhost:${PORT}`);
});
