const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { load, save } = require('./db');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Current settings dekho (token nahi bhejta, sirf zaroori info)
app.get('/api/settings', (req, res) => {
  const data = load();
  const s = data.settings;
  res.json({
    page_id: s.page_id,
    post_time: s.post_time,
    timezone: s.timezone,
    last_posted_date: s.last_posted_date,
    has_token: !!s.page_access_token,
  });
});

// Settings save/update karo
app.post('/api/settings', (req, res) => {
  const data = load();
  const { page_id, page_access_token, post_time, timezone } = req.body;
  if (page_id) data.settings.page_id = page_id;
  if (page_access_token) data.settings.page_access_token = page_access_token;
  if (post_time) data.settings.post_time = post_time;
  if (timezone) data.settings.timezone = timezone;
  save(data);
  res.json({ ok: true });
});

// Naya image queue mein daalo
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image chahiye' });
  const data = load();
  const caption = req.body.caption || '';
  const id = data.nextId++;
  data.queue.push({
    id,
    filename: req.file.filename,
    caption,
    status: 'pending',
    created_at: new Date().toISOString(),
    posted_at: null,
  });
  save(data);
  res.json({ ok: true, id });
});

// Poori queue dekho (naya sabse upar)
app.get('/api/queue', (req, res) => {
  const data = load();
  res.json([...data.queue].reverse());
});

// Queue se item hatao
app.delete('/api/queue/:id', (req, res) => {
  const data = load();
  const id = parseInt(req.params.id, 10);
  const idx = data.queue.findIndex((q) => q.id === id);
  if (idx !== -1) {
    const item = data.queue[idx];
    const filePath = path.join(uploadsDir, item.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    data.queue.splice(idx, 1);
    save(data);
  }
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
  startScheduler();
});
