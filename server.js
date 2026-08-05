'use strict';

const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Database Setup ───────────────────────────────────────
let db;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA busy_timeout=5000');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    phone TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    unit TEXT DEFAULT '',
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS permits (
    id TEXT PRIMARY KEY,
    permit_no TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    gender TEXT,
    id_card_no TEXT,
    id_card_front TEXT,
    id_card_back TEXT,
    unit TEXT,
    project_name TEXT,
    site_location TEXT,
    experience TEXT,
    job_types TEXT,
    exam_score INTEGER,
    exam_screenshot TEXT,
    catl_ehs_screenshot TEXT,
    photo TEXT,
    face_descriptor TEXT,
    face_method TEXT,
    start_date TEXT,
    expiry_date TEXT,
    filing_date TEXT,
    status TEXT DEFAULT '待审核',
    reviewed_by TEXT,
    reviewed_at TEXT,
    verify_count INTEGER DEFAULT 0,
    issued INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    photo TEXT,
    result TEXT,
    matched_permit_id TEXT,
    matched_name TEXT,
    matched_unit TEXT,
    similarity REAL,
    created_by TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // Seed admin account if not exists
  const admin = db.exec("SELECT phone FROM users WHERE phone = 'admin'");
  if (!admin.length || !admin[0].values.length) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run("INSERT INTO users (phone, password_hash, name, role, unit, created_at) VALUES (?,?,?,?,?,?)",
      ['admin', hash, '管理员', 'admin', '系统管理', new Date().toISOString()]);
    console.log('Admin account seeded: admin / admin123');
  }

  // Add missing columns for backward compatibility
  try { db.run("ALTER TABLE permits ADD COLUMN id_card_front TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE permits ADD COLUMN id_card_back TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE permits ADD COLUMN face_descriptor TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE permits ADD COLUMN face_method TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE permits ADD COLUMN created_by TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN unit TEXT DEFAULT ''"); } catch(e) {}

  saveDB();
  console.log('Database initialized');
}

function saveDB() {
  const data = db.export();
  const buf = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buf);
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

// ─── Auth Middleware ──────────────────────────────────────
function authMiddleware(req, res, next) {
  const phone = req.headers['x-user-phone'];
  const token = req.headers['x-auth-token'];
  if (!phone) return res.status(401).json({ error: '未登录' });
  const user = dbGet("SELECT * FROM users WHERE phone = ?", [phone]);
  if (!user) return res.status(401).json({ error: '用户不存在' });
  const expectedToken = user.phone + '_' + user.password_hash.substring(0, 16);
  if (token !== expectedToken) return res.status(401).json({ error: '认证失败' });
  req.user = user;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '无权限' });
  next();
}

// ─── Static Files ─────────────────────────────────────────
// Serve static files with proper caching
app.use(express.static(__dirname, {
  setHeaders: (res, filepath) => {
    // Don't cache HTML files - always get latest version
    if (filepath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Don't cache JS/CSS either - avoid loading stale code after updates
    if (filepath.endsWith('.js') || filepath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
app.use('/uploads', express.static(uploadDir));

// ─── Auth Routes ──────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: '请输入手机号和密码' });
  const user = dbGet("SELECT * FROM users WHERE phone = ?", [phone]);
  if (!user) return res.status(401).json({ error: '账号不存在' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: '密码错误' });
  const token = user.phone + '_' + user.password_hash.substring(0, 16);
  res.json({ phone: user.phone, name: user.name, role: user.role, unit: user.unit || '', token });
});

app.post('/api/auth/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '请输入新旧密码' });
  if (newPassword.length < 4) return res.status(400).json({ error: '新密码至少4位' });
  if (!bcrypt.compareSync(oldPassword, req.user.password_hash)) return res.status(400).json({ error: '原密码错误' });
  const hash = bcrypt.hashSync(newPassword, 10);
  dbRun("UPDATE users SET password_hash = ? WHERE phone = ?", [hash, req.user.phone]);
  res.json({ success: true });
});

// Non-admin user change password (from login page)
app.post('/api/auth/public-change-password', (req, res) => {
  const { phone, oldPassword, newPassword } = req.body;
  if (!phone || !oldPassword || !newPassword) return res.status(400).json({ error: '请填写完整信息' });
  if (newPassword.length < 4) return res.status(400).json({ error: '新密码至少4位' });
  const user = dbGet("SELECT * FROM users WHERE phone = ?", [phone]);
  if (!user) return res.status(401).json({ error: '账号不存在' });
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) return res.status(400).json({ error: '原密码错误' });
  const hash = bcrypt.hashSync(newPassword, 10);
  dbRun("UPDATE users SET password_hash = ? WHERE phone = ?", [hash, phone]);
  res.json({ success: true });
});

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0', timestamp: new Date().toISOString() });
});

// ─── User Management (Admin) ──────────────────────────────
app.get('/api/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = dbAll("SELECT phone, name, role, unit, created_at FROM users ORDER BY created_at DESC");
  res.json(users);
});

app.post('/api/users', authMiddleware, adminMiddleware, (req, res) => {
  const { phone, name, password, role, unit } = req.body;
  if (!phone || !name || !password) return res.status(400).json({ error: '请填写完整信息' });
  if (!/^1\d{10}$/.test(phone)) return res.status(400).json({ error: '请输入正确的11位手机号' });
  const existing = dbGet("SELECT phone FROM users WHERE phone = ?", [phone]);
  if (existing) return res.status(400).json({ error: '该手机号已注册' });
  const hash = bcrypt.hashSync(password, 10);
  dbRun("INSERT INTO users (phone, password_hash, name, role, unit, created_at) VALUES (?,?,?,?,?,?)",
    [phone, hash, name, role || 'user', unit || '', new Date().toISOString()]);
  res.json({ success: true, phone, name, role: role || 'user' });
});

app.delete('/api/users/:phone', authMiddleware, adminMiddleware, (req, res) => {
  const { phone } = req.params;
  if (phone === 'admin') return res.status(400).json({ error: '不能删除管理员' });
  dbRun("DELETE FROM users WHERE phone = ?", [phone]);
  res.json({ success: true });
});

// ─── Unit List ────────────────────────────────────────────
app.get('/api/units', authMiddleware, (req, res) => {
  const rows = dbAll("SELECT DISTINCT unit FROM permits WHERE unit != '' ORDER BY unit");
  const units = rows.map(r => r.unit);
  res.json(units);
});

// ─── Permit Routes ────────────────────────────────────────
app.get('/api/permits', authMiddleware, (req, res) => {
  let sql = "SELECT * FROM permits";
  const params = [];
  if (req.user.role !== 'admin') {
    sql += " WHERE phone = ?";
    params.push(req.user.phone);
  }
  sql += " ORDER BY created_at DESC";
  const permits = dbAll(sql, params);
  permits.forEach(p => {
    if (p.job_types) {
      try { p.job_types = JSON.parse(p.job_types); } catch(e) { p.job_types = []; }
    }
    if (p.face_descriptor) {
      try { p.face_descriptor = JSON.parse(p.face_descriptor); } catch(e) { p.face_descriptor = null; }
    }
  });
  res.json(permits);
});

app.get('/api/permits/pending', authMiddleware, adminMiddleware, (req, res) => {
  const permits = dbAll("SELECT * FROM permits WHERE status = '待审核' ORDER BY created_at DESC");
  permits.forEach(p => {
    if (p.job_types) {
      try { p.job_types = JSON.parse(p.job_types); } catch(e) { p.job_types = []; }
    }
  });
  res.json(permits);
});

app.get('/api/permits/:id', authMiddleware, (req, res) => {
  const permit = dbGet("SELECT * FROM permits WHERE id = ?", [req.params.id]);
  if (!permit) return res.status(404).json({ error: '证件不存在' });
  if (req.user.role !== 'admin' && permit.phone !== req.user.phone) {
    return res.status(403).json({ error: '无权限' });
  }
  if (permit.job_types) {
    try { permit.job_types = JSON.parse(permit.job_types); } catch(e) { permit.job_types = []; }
  }
  if (permit.face_descriptor) {
    try { permit.face_descriptor = JSON.parse(permit.face_descriptor); } catch(e) { permit.face_descriptor = null; }
  }
  res.json(permit);
});

app.post('/api/permits', authMiddleware, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'exam_screenshot', maxCount: 1 },
  { name: 'catl_ehs_screenshot', maxCount: 1 },
  { name: 'id_card_front', maxCount: 1 },
  { name: 'id_card_back', maxCount: 1 }
]), (req, res) => {
  try {
    const body = req.body;
    const id = uuidv4();
    const permitNo = 'LZT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    // Handle job_types
    let jobTypes = [];
    try {
      if (body.job_types) {
        jobTypes = typeof body.job_types === 'string' ? JSON.parse(body.job_types) : body.job_types;
      }
    } catch (e) { jobTypes = []; }

    // Process base64 images in jobTypes
    if (Array.isArray(jobTypes)) {
      jobTypes = jobTypes.map(jt => {
        if (typeof jt.certPhoto === 'string' && jt.certPhoto && jt.certPhoto.startsWith('data:')) {
          const ext = jt.certPhoto.match(/^data:image\/(\w+)/);
          const fname = uuidv4() + '.' + (ext ? ext[1] : 'png');
          const base64 = jt.certPhoto.replace(/^data:image\/\w+;base64,/, '');
          fs.writeFileSync(path.join(uploadDir, fname), Buffer.from(base64, 'base64'));
          return { ...jt, certPhoto: '/uploads/' + fname };
        }
        return jt;
      });
    }

    // Helper: save base64 image to file
    const saveBase64Image = (data, prefix) => {
      if (!data) return null;
      // If already a file path
      if (typeof data === 'string' && data.startsWith('/uploads/')) return data;
      // If base64
      if (typeof data === 'string' && data.startsWith('data:')) {
        const ext = data.match(/^data:image\/(\w+)/);
        const fname = uuidv4() + '.' + (ext ? ext[1] : 'png');
        const base64 = data.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(path.join(uploadDir, fname), Buffer.from(base64, 'base64'));
        return '/uploads/' + fname;
      }
      return data || null;
    };

    const photo = req.files && req.files.photo
      ? '/uploads/' + req.files.photo[0].filename
      : saveBase64Image(body.photo || body.photoDataUrl);

    const idCardFront = req.files && req.files.id_card_front
      ? '/uploads/' + req.files.id_card_front[0].filename
      : saveBase64Image(body.idCardFront);

    const idCardBack = req.files && req.files.id_card_back
      ? '/uploads/' + req.files.id_card_back[0].filename
      : saveBase64Image(body.idCardBack);

    const examScreenshot = req.files && req.files.exam_screenshot
      ? '/uploads/' + req.files.exam_screenshot[0].filename
      : saveBase64Image(body.examQRCode || body.exam_screenshot);

    const catlEhsScreenshot = req.files && req.files.catl_ehs_screenshot
      ? '/uploads/' + req.files.catl_ehs_screenshot[0].filename
      : saveBase64Image(body.catlEhs || body.catl_ehs_screenshot);

    // Save cert photos from job_types array (come as base64 from multipart fields)
    if (Array.isArray(jobTypes)) {
      const certPhotos = body.certPhotos ? JSON.parse(body.certPhotos) : {};
      jobTypes = jobTypes.map(jt => {
        if (certPhotos[jt.type] && certPhotos[jt.type].startsWith('data:')) {
          const ext = certPhotos[jt.type].match(/^data:image\/(\w+)/);
          const fname = uuidv4() + '.' + (ext ? ext[1] : 'png');
          const base64 = certPhotos[jt.type].replace(/^data:image\/\w+;base64,/, '');
          fs.writeFileSync(path.join(uploadDir, fname), Buffer.from(base64, 'base64'));
          return { ...jt, certPhoto: '/uploads/' + fname };
        }
        return jt;
      });
    }

    const status = req.user.role === 'admin' ? '有效' : '待审核';
    const faceDescriptor = body.faceDescriptor || null;

    dbRun(`INSERT INTO permits (id, permit_no, name, phone, gender, id_card_no,
      id_card_front, id_card_back, unit, project_name, site_location, experience,
      job_types, exam_score, exam_screenshot, catl_ehs_screenshot, photo,
      face_descriptor, face_method, start_date, expiry_date, filing_date, status,
      issued, created_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, permitNo, body.name, req.user.phone, body.gender, body.idCardNo,
       idCardFront, idCardBack, body.unit, body.projectName, body.siteLocation,
       body.experience, JSON.stringify(jobTypes),
       body.examScore ? parseInt(body.examScore) : null, examScreenshot,
       catlEhsScreenshot, photo,
       faceDescriptor, body.faceMethod || null,
       body.startDate, body.expiryDate,
       new Date().toISOString().split('T')[0], status,
       status === '有效' ? 1 : 0, req.user.phone, new Date().toISOString()]);

    res.json({ success: true, id, permitNo, status });
  } catch (err) {
    console.error('Create permit error:', err);
    res.status(500).json({ error: '创建失败: ' + err.message });
  }
});

app.put('/api/permits/:id/review', authMiddleware, adminMiddleware, (req, res) => {
  const { action } = req.body;
  const permit = dbGet("SELECT * FROM permits WHERE id = ?", [req.params.id]);
  if (!permit) return res.status(404).json({ error: '证件不存在' });
  if (permit.status !== '待审核') return res.status(400).json({ error: '该证件已审核' });

  const newStatus = action === 'approve' ? '有效' : '已驳回';
  dbRun("UPDATE permits SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
    [newStatus, req.user.name, new Date().toISOString(), req.params.id]);
  res.json({ success: true, status: newStatus });
});

app.put('/api/permits/:id/verify', authMiddleware, (req, res) => {
  const permit = dbGet("SELECT * FROM permits WHERE id = ?", [req.params.id]);
  if (!permit) return res.status(404).json({ error: '证件不存在' });
  dbRun("UPDATE permits SET verify_count = verify_count + 1 WHERE id = ?", [req.params.id]);
  res.json({ success: true, verifyCount: permit.verify_count + 1 });
});

app.put('/api/permits/:id/issue', authMiddleware, adminMiddleware, (req, res) => {
  dbRun("UPDATE permits SET issued = 1 WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

app.put('/api/permits/:id/exit', authMiddleware, adminMiddleware, (req, res) => {
  const permit = dbGet("SELECT * FROM permits WHERE id = ?", [req.params.id]);
  if (!permit) return res.status(404).json({ error: '证件不存在' });
  dbRun("UPDATE permits SET status = '已离场', photo = '', face_descriptor = NULL, face_method = NULL WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// ─── Verification Records ─────────────────────────────────
app.get('/api/verifications', authMiddleware, (req, res) => {
  let sql = "SELECT * FROM verifications";
  const params = [];
  if (req.user.role !== 'admin') {
    sql += " WHERE created_by = ?";
    params.push(req.user.phone);
  }
  sql += " ORDER BY timestamp DESC LIMIT 100";
  const records = dbAll(sql, params);
  res.json(records);
});

app.post('/api/verifications', authMiddleware, (req, res) => {
  const { photo, result, matchedPermitId, matchedName, matchedUnit, similarity } = req.body;
  const id = uuidv4();

  // Save photo
  let photoUrl = null;
  if (photo && photo.startsWith('data:')) {
    const ext = photo.match(/^data:image\/(\w+)/);
    const fname = uuidv4() + '.' + (ext ? ext[1] : 'png');
    const base64 = photo.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(uploadDir, fname), Buffer.from(base64, 'base64'));
    photoUrl = '/uploads/' + fname;
  }

  dbRun(`INSERT INTO verifications (id, timestamp, photo, result, matched_permit_id, matched_name, matched_unit, similarity, created_by)
    VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, new Date().toISOString(), photoUrl, result || 'unknown',
     matchedPermitId || null, matchedName || null, matchedUnit || null,
     similarity || 0, req.user.phone]);
  res.json({ success: true, id });
});

// ─── Stats (with monthly trends) ──────────────────────────
app.get('/api/stats', authMiddleware, adminMiddleware, (req, res) => {
  const total = dbGet("SELECT COUNT(*) as c FROM permits")?.c || 0;
  const active = dbGet("SELECT COUNT(*) as c FROM permits WHERE status = '有效'")?.c || 0;
  const expired = dbGet("SELECT COUNT(*) as c FROM permits WHERE status = '已过期'")?.c || 0;
  const pending = dbGet("SELECT COUNT(*) as c FROM permits WHERE status = '待审核'")?.c || 0;
  const rejected = dbGet("SELECT COUNT(*) as c FROM permits WHERE status = '已驳回'")?.c || 0;
  const exited = dbGet("SELECT COUNT(*) as c FROM permits WHERE status = '已离场'")?.c || 0;
  const today = dbGet("SELECT COUNT(*) as c FROM permits WHERE filing_date = ?",
    [new Date().toISOString().split('T')[0]])?.c || 0;

  const verifyCount = dbGet("SELECT COUNT(*) as c FROM verifications")?.c || 0;

  // Monthly trend (last 6 months)
  const now = new Date();
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const m = d.getMonth() + 1;
    const count = dbAll(
      "SELECT COUNT(*) as c FROM permits WHERE filing_date >= ? AND filing_date < ?",
      [d.toISOString().split('T')[0], next.toISOString().split('T')[0]]
    );
    monthlyData.push({ month: m + '月', count: (count[0] && count[0].c) || 0 });
  }

  // Quarterly & yearly
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const quarter = dbGet("SELECT COUNT(*) as c FROM permits WHERE filing_date >= ?",
    [quarterStart.toISOString().split('T')[0]])?.c || 0;
  const year = dbGet("SELECT COUNT(*) as c FROM permits WHERE filing_date >= ?",
    [yearStart.toISOString().split('T')[0]])?.c || 0;
  const month = dbGet("SELECT COUNT(*) as c FROM permits WHERE filing_date >= ?",
    [monthStart.toISOString().split('T')[0]])?.c || 0;

  res.json({
    today, month, quarter, year,
    pending, rejected, valid: active, expired, exited,
    verifyCount, total, monthlyData
  });
});

// ─── Settings ─────────────────────────────────────────────
app.get('/api/settings', authMiddleware, (req, res) => {
  const rows = dbAll("SELECT * FROM settings");
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.post('/api/settings', authMiddleware, adminMiddleware, (req, res) => {
  const { key, value } = req.body;
  const existing = dbGet("SELECT key FROM settings WHERE key = ?", [key]);
  if (existing) {
    dbRun("UPDATE settings SET value = ? WHERE key = ?", [value, key]);
  } else {
    dbRun("INSERT INTO settings (key, value) VALUES (?,?)", [key, value]);
  }
  res.json({ success: true });
});

// ─── File Upload (generic base64) ─────────────────────────
app.post('/api/upload', authMiddleware, (req, res) => {
  const { data } = req.body;
  if (!data || !data.startsWith('data:')) return res.status(400).json({ error: '无效数据' });
  const ext = data.match(/^data:image\/(\w+)/);
  const fname = uuidv4() + '.' + (ext ? ext[1] : 'png');
  const base64 = data.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(path.join(uploadDir, fname), Buffer.from(base64, 'base64'));
  res.json({ url: '/uploads/' + fname });
});

// ─── SPA fallback ─────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') ||
      req.path.includes('.')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('落站通服务已启动: http://0.0.0.0:' + PORT);
  });
}).catch(err => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});
