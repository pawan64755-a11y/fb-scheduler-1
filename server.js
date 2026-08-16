const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./db');
const { uploadToImgBB } = require('./imgbb');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Image ko seedha memory mein rakho, disk par save nahi karna (kyunki ImgBB par jaana hai)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/settings', async (req, res) => {
  try {
    const s = await db.getSettings();
    res.json({
      page_id: s.page_id,
      post_times: s.post_times,
      timezone: s.timezone,
      has_token: !!s.page_access_token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { page_id, page_access_token, post_times, timezone } = req.body;
    const updates = {};
    if (page_id) updates.page_id = page_id;
    if (page_access_token) updates.page_access_token = page_access_token;
    if (Array.isArray(post_times) && post_times.length > 0) {
      updates.post_times = [...new Set(post_times)].sort();
    }
    if (timezone) updates.timezone = timezone;
    await db.saveSettings(updates);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image chahiye' });
    const imageUrl = await uploadToImgBB(req.file.buffer);
    const caption = req.body.caption || '';
    const item = {
      id: Date.now(),
      image_url: imageUrl,
      caption,
      status: 'pending',
      created_at: new Date().toISOString(),
      posted_at: null,
    };
    await db.addQueueItem(item);
    res.json({ ok: true, id: item.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/queue', async (req, res) => {
  try {
    const items = await db.getQueue();
    res.json([...items].reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/queue/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.deleteQueueItem(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
  startScheduler();
});
