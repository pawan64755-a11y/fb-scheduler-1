const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function defaultData() {
  return {
    settings: {
      page_id: null,
      page_access_token: null,
      post_time: '18:00',
      timezone: 'Asia/Kolkata',
      last_posted_date: null,
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
    return JSON.parse(raw);
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
