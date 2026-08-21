/**
 * Server for Dr. Hazini and Mehr Golestan Website
 * Express.js Backend with REST API, File Uploads, Submissions Inbox & Auto-Sync
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const DATA_JS_PATH = path.join(__dirname, 'assets', 'js', 'data.js');

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname)));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadSubfolder = 'images';
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ext === '.pdf') {
      if (req.body.type === 'report' || req.originalUrl.includes('report')) {
        uploadSubfolder = 'reports';
      } else {
        uploadSubfolder = 'docs';
      }
    } else if (['.doc', '.docx'].includes(ext)) {
      uploadSubfolder = 'docs';
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) {
      uploadSubfolder = 'images';
    }
    
    const targetDir = path.join(__dirname, 'assets', 'uploads', uploadSubfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    // Generate safe timestamped filename
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_')
      .substring(0, 40);
    const uniqueSuffix = Date.now();
    cb(null, `${cleanName}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

// Helper: Read DB
function getDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB:', err);
    return {};
  }
}

// Helper: Save DB and Auto-Sync to data.js
function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    
    // Auto-sync client data.js (excluding admin password)
    const clientData = JSON.parse(JSON.stringify(data));
    delete clientData.adminConfig;
    
    const jsContent = `/**
 * Data store for Dr. Hazini and Mehr Golestan Cancer Support Association
 * Auto-synced from Admin Panel Database
 */
window.SITE_DATA = ${JSON.stringify(clientData, null, 2)};
`;
    fs.writeFileSync(DATA_JS_PATH, jsContent, 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving DB:', err);
    return false;
  }
}

// Helper: Get Persian Shamsi Date String
function getShamsiDateString() {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(now).replace(',', ' -');
  } catch (e) {
    return now.toISOString().replace('T', ' ').substring(0, 16);
  }
}

// ----------------------------------------------------
// AUTH & ADMIN APIS
// ----------------------------------------------------

// Simple token auth header or query check
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.replace('Bearer ', '');
  const db = getDB();
  const validPass = (db.adminConfig && db.adminConfig.password) || 'admin';
  
  if (token === validPass || token === 'admin_session_token_' + validPass) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' });
}

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const db = getDB();
  const currentPass = (db.adminConfig && db.adminConfig.password) || 'admin';
  
  if (password === currentPass) {
    if (!db.adminConfig) db.adminConfig = {};
    db.adminConfig.lastLogin = new Date().toISOString();
    saveDB(db);
    return res.json({
      success: true,
      token: 'admin_session_token_' + currentPass,
      message: 'ورود موفقیت‌آمیز'
    });
  }
  return res.status(401).json({ success: false, message: 'رمز عبور اشتباه است.' });
});

// Change Password
app.post('/api/change-password', authenticateAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDB();
  const currentPass = (db.adminConfig && db.adminConfig.password) || 'admin';

  if (currentPassword !== currentPass) {
    return res.status(400).json({ success: false, message: 'رمز عبور فعلی نادرست است.' });
  }
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
  }

  db.adminConfig.password = newPassword;
  saveDB(db);
  res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
});

// ----------------------------------------------------
// DATA APIS (Public & Admin)
// ----------------------------------------------------

// Get All Public Site Data
app.get('/api/data', (req, res) => {
  const db = getDB();
  const safeData = JSON.parse(JSON.stringify(db));
  delete safeData.adminConfig;
  res.json(safeData);
});

// ----------------------------------------------------
// SUBMISSIONS / INBOX APIS
// ----------------------------------------------------

// Get All Submissions (Admin Only)
app.get('/api/submissions', authenticateAdmin, (req, res) => {
  const db = getDB();
  res.json(db.submissions || []);
});

// Submit Form (Public)
app.post('/api/submissions', (req, res) => {
  const db = getDB();
  if (!db.submissions) db.submissions = [];

  const newId = db.submissions.length > 0 ? Math.max(...db.submissions.map(s => s.id || 0)) + 1 : 1;
  const dateStr = getShamsiDateString();

  const submission = {
    id: newId,
    date: dateStr,
    status: 'unread',
    ...req.body
  };

  db.submissions.unshift(submission); // Newest first
  saveDB(db);

  res.json({
    success: true,
    message: 'اطلاعات با موفقیت ثبت شد.',
    id: newId
  });
});

// Toggle / Update Submission Status (Admin Only)
app.put('/api/submissions/:id/status', authenticateAdmin, (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  const item = (db.submissions || []).find(s => s.id === id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'موردی یافت نشد.' });
  }

  item.status = status || (item.status === 'read' ? 'unread' : 'read');
  saveDB(db);
  res.json({ success: true, message: 'وضعیت به‌روزرسانی شد.', item });
});

// Delete Submission (Admin Only)
app.delete('/api/submissions/:id', authenticateAdmin, (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id, 10);
  const initialLen = (db.submissions || []).length;
  db.submissions = (db.submissions || []).filter(s => s.id !== id);

  if (db.submissions.length === initialLen) {
    return res.status(404).json({ success: false, message: 'موردی یافت نشد.' });
  }

  saveDB(db);
  res.json({ success: true, message: 'فرم با موفقیت حذف شد.' });
});

// ----------------------------------------------------
// ARTICLES APIS
// ----------------------------------------------------

app.post('/api/articles', authenticateAdmin, upload.fields([
  { name: 'imageFile', maxCount: 1 },
  { name: 'pdfAttachment', maxCount: 1 }
]), (req, res) => {
  const db = getDB();
  if (!db.articles) db.articles = [];

  const newId = db.articles.length > 0 ? Math.max(...db.articles.map(a => a.id || 0)) + 1 : 1;
  let imagePath = req.body.image || 'assets/images/100-15-600x400.jpg';
  let pdfPath = req.body.pdfFile || null;

  if (req.files && req.files['imageFile'] && req.files['imageFile'][0]) {
    const f = req.files['imageFile'][0];
    imagePath = `assets/uploads/images/${f.filename}`;
  }

  if (req.files && req.files['pdfAttachment'] && req.files['pdfAttachment'][0]) {
    const f = req.files['pdfAttachment'][0];
    pdfPath = `assets/uploads/docs/${f.filename}`;
  }

  const newArticle = {
    id: newId,
    title: req.body.title || 'بدون عنوان',
    category: req.body.category || 'مقالات و سلامت',
    date: req.body.date || getShamsiDateString().split('-')[0].trim(),
    image: imagePath,
    aparatId: req.body.aparatId || null,
    pdfFile: pdfPath,
    summary: req.body.summary || '',
    content: req.body.content || req.body.summary || ''
  };

  db.articles.unshift(newArticle);
  saveDB(db);
  res.json({ success: true, message: 'مقاله با موفقیت ایجاد شد.', article: newArticle });
});

app.put('/api/articles/:id', authenticateAdmin, upload.fields([
  { name: 'imageFile', maxCount: 1 },
  { name: 'pdfAttachment', maxCount: 1 }
]), (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id, 10);
  const article = (db.articles || []).find(a => a.id === id);

  if (!article) {
    return res.status(404).json({ success: false, message: 'مقاله یافت نشد.' });
  }

  if (req.files && req.files['imageFile'] && req.files['imageFile'][0]) {
    article.image = `assets/uploads/images/${req.files['imageFile'][0].filename}`;
  } else if (req.body.image) {
    article.image = req.body.image;
  }

  if (req.files && req.files['pdfAttachment'] && req.files['pdfAttachment'][0]) {
    article.pdfFile = `assets/uploads/docs/${req.files['pdfAttachment'][0].filename}`;
  } else if (req.body.pdfFile !== undefined) {
    article.pdfFile = req.body.pdfFile || null;
  }

  article.title = req.body.title || article.title;
  article.category = req.body.category || article.category;
  article.date = req.body.date || article.date;
  article.summary = req.body.summary !== undefined ? req.body.summary : article.summary;
  article.content = req.body.content !== undefined ? req.body.content : article.content;
  article.aparatId = req.body.aparatId !== undefined ? req.body.aparatId : article.aparatId;

  saveDB(db);
  res.json({ success: true, message: 'مقاله با موفقیت ویرایش شد.', article });
});

app.delete('/api/articles/:id', authenticateAdmin, (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id, 10);
  db.articles = (db.articles || []).filter(a => a.id !== id);
  saveDB(db);
  res.json({ success: true, message: 'مقاله با موفقیت حذف شد.' });
});

// ----------------------------------------------------
// REPORTS APIS
// ----------------------------------------------------

app.post('/api/reports', authenticateAdmin, upload.single('reportPdf'), (req, res) => {
  const db = getDB();
  if (!db.reports) db.reports = [];

  const newId = db.reports.length > 0 ? Math.max(...db.reports.map(r => r.id || 0)) + 1 : 1;
  let filePath = req.body.file || '';
  let fileName = req.body.fileName || 'report.pdf';
  let size = req.body.size || '۱ MB';

  if (req.file) {
    filePath = `assets/uploads/reports/${req.file.filename}`;
    fileName = req.file.originalname;
    const mb = (req.file.size / (1024 * 1024)).toFixed(2);
    size = req.file.size > 1024 * 1024 ? `${mb} MB` : `${Math.round(req.file.size / 1024)} KB`;
  }

  const newReport = {
    id: newId,
    title: req.body.title || `گزارش عملکرد سال ${req.body.year || '۱۴۰۲'}`,
    year: req.body.year || '۱۴۰۲',
    file: filePath,
    fileName: fileName,
    size: size,
    type: req.body.type || 'سالیانه',
    desc: req.body.desc || '',
    highlights: req.body.highlights ? (Array.isArray(req.body.highlights) ? req.body.highlights : [req.body.highlights]) : []
  };

  db.reports.unshift(newReport);
  saveDB(db);
  res.json({ success: true, message: 'گزارش عملکرد با موفقیت افزوده شد.', report: newReport });
});

app.delete('/api/reports/:id', authenticateAdmin, (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id, 10);
  db.reports = (db.reports || []).filter(r => r.id !== id);
  saveDB(db);
  res.json({ success: true, message: 'گزارش با موفقیت حذف شد.' });
});

// ----------------------------------------------------
// VIDEOS APIS
// ----------------------------------------------------

app.post('/api/videos', authenticateAdmin, upload.single('thumbFile'), (req, res) => {
  const db = getDB();
  if (!db.videos) db.videos = [];

  const newId = db.videos.length > 0 ? Math.max(...db.videos.map(v => v.id || 0)) + 1 : 1;
  let imagePath = req.body.image || 'assets/images/mmmm-600x400.jpg';

  if (req.file) {
    imagePath = `assets/uploads/images/${req.file.filename}`;
  }

  const newVideo = {
    id: newId,
    title: req.body.title || 'ویدیو جدید',
    subtitle: req.body.subtitle || '',
    aparatId: req.body.aparatId || '',
    date: req.body.date || getShamsiDateString().split('-')[0].trim(),
    image: imagePath
  };

  db.videos.unshift(newVideo);
  saveDB(db);
  res.json({ success: true, message: 'ویدیو با موفقیت افزوده شد.', video: newVideo });
});

app.delete('/api/videos/:id', authenticateAdmin, (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id, 10);
  db.videos = (db.videos || []).filter(v => v.id !== id);
  saveDB(db);
  res.json({ success: true, message: 'ویدیو با موفقیت حذف شد.' });
});

// ----------------------------------------------------
// BROCHURES & BOOKS APIS
// ----------------------------------------------------

app.post('/api/brochures', authenticateAdmin, upload.single('docFile'), (req, res) => {
  const db = getDB();
  if (!db.brochures) db.brochures = [];

  const newId = db.brochures.length > 0 ? Math.max(...db.brochures.map(b => b.id || 0)) + 1 : 1;
  let filePath = req.body.file || '';
  let fileName = req.body.fileName || 'brochure.docx';
  let size = req.body.size || '۱۰۰ KB';

  if (req.file) {
    filePath = `assets/uploads/docs/${req.file.filename}`;
    fileName = req.file.originalname;
    const mb = (req.file.size / (1024 * 1024)).toFixed(2);
    size = req.file.size > 1024 * 1024 ? `${mb} MB` : `${Math.round(req.file.size / 1024)} KB`;
  }

  const newBrochure = {
    id: newId,
    title: req.body.title || 'بروشور جدید',
    category: req.body.category || 'آموزش عمومی',
    file: filePath,
    fileName: fileName,
    size: size,
    desc: req.body.desc || ''
  };

  db.brochures.unshift(newBrochure);
  saveDB(db);
  res.json({ success: true, message: 'بروشور با موفقیت افزوده شد.', brochure: newBrochure });
});

app.delete('/api/brochures/:id', authenticateAdmin, (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id, 10);
  db.brochures = (db.brochures || []).filter(b => b.id !== id);
  saveDB(db);
  res.json({ success: true, message: 'بروشور با موفقیت حذف شد.' });
});

app.post('/api/pdf-books', authenticateAdmin, upload.single('bookPdf'), (req, res) => {
  const db = getDB();
  if (!db.pdfBooks) db.pdfBooks = [];

  const newId = db.pdfBooks.length > 0 ? Math.max(...db.pdfBooks.map(b => b.id || 0)) + 1 : 1;
  let filePath = req.body.file || '';
  let size = req.body.size || '۱ MB';

  if (req.file) {
    filePath = `assets/uploads/docs/${req.file.filename}`;
    const mb = (req.file.size / (1024 * 1024)).toFixed(2);
    size = `${mb} مگابایت`;
  }

  const newBook = {
    id: newId,
    title: req.body.title || 'کتاب جدید',
    titleEn: req.body.titleEn || '',
    author: req.body.author || 'دکتر عبدالرحیم حزینی',
    dateShamsi: req.body.dateShamsi || '۱۴۰۲',
    size: size,
    desc: req.body.desc || '',
    file: filePath
  };

  db.pdfBooks.unshift(newBook);
  saveDB(db);
  res.json({ success: true, message: 'کتاب مرجع با موفقیت افزوده شد.', book: newBook });
});

app.delete('/api/pdf-books/:id', authenticateAdmin, (req, res) => {
  const db = getDB();
  const id = parseInt(req.params.id, 10);
  db.pdfBooks = (db.pdfBooks || []).filter(b => b.id !== id);
  saveDB(db);
  res.json({ success: true, message: 'کتاب با موفقیت حذف شد.' });
});

// ----------------------------------------------------
// SETTINGS & STATS APIS
// ----------------------------------------------------

app.post('/api/settings', authenticateAdmin, (req, res) => {
  const db = getDB();
  if (!db.meta) db.meta = {};

  if (req.body.meta) {
    db.meta = { ...db.meta, ...req.body.meta };
  }
  if (req.body.stats) {
    db.meta.stats = { ...db.meta.stats, ...req.body.stats };
  }

  saveDB(db);
  res.json({ success: true, message: 'تنظیمات و آمار سایت با موفقیت به‌روزرسانی شد.', meta: db.meta });
});

// General File Upload Endpoint
app.post('/api/upload', authenticateAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'هیچ فایلی انتخاب نشده است.' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  let folder = 'images';
  if (ext === '.pdf') folder = 'reports';
  else if (['.doc', '.docx'].includes(ext)) folder = 'docs';

  const relPath = `assets/uploads/${folder}/${req.file.filename}`;
  res.json({
    success: true,
    message: 'فایل با موفقیت بارگذاری شد.',
    url: relPath,
    filename: req.file.originalname,
    size: req.file.size
  });
});

// Fallback to index.html
app.get('*', (req, res) => {
  const reqPath = path.join(__dirname, req.path);
  if (fs.existsSync(reqPath) && fs.statSync(reqPath).isFile()) {
    return res.sendFile(reqPath);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌐 Hazini.ir Portal & Admin Server is running!`);
  console.log(`🔗 Website:      http://localhost:${PORT}`);
  console.log(`🔑 Admin Panel:  http://localhost:${PORT}/admin`);
  console.log(`====================================================`);
});
