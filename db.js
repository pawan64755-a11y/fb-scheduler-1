const fs = require('fs');
const path = require('path');

// Agar DATA_DIR environment variable set hai (Render persistent disk),
// to wahan data save hoga, warna normal folder mein
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'data.json');

function defaultData() {
  return {
    settings: {
      page_id: null,
      page_access_token: null,
      post_times: ['18:00'],
      timezone: 'Asia/Kolkata',
      posted_slots: [],
    },
    queue: [],
    nextId: 1,
  };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    save(defaultData());
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.settings.post_times)) {
      data.settings.post_times = data.settings.post_time ? [data.settings.post_time] : ['18:00'];
    }
    if (!Array.isArray(data.settings.posted_slots)) {
      data.settings.posted_slots = [];
    }
    return data;
  } catch (e) {
    const fresh = defaultData();
    save(fresh);
    return fresh;
  }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { load, save };
