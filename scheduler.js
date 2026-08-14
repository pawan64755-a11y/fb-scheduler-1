const cron = require('node-cron');
const path = require('path');
const { load, save } = require('./db');
const { postImageToPage } = require('./facebook');

function getTodayInTZ(timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getCurrentHHMMInTZ(timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hh = parts.find((p) => p.type === 'hour').value;
  const mm = parts.find((p) => p.type === 'minute').value;
  return `${hh}:${mm}`;
}

async function checkAndPost() {
  const data = load();
  const settings = data.settings;
  if (!settings.page_id || !settings.page_access_token) return;

  const tz = settings.timezone || 'Asia/Kolkata';
  const currentHHMM = getCurrentHHMMInTZ(tz);
  const today = getTodayInTZ(tz);

  // Sirf set time par hi chalega
  if (currentHHMM !== settings.post_time) return;
  // Aaj already post ho chuka hai to skip
  if (settings.last_posted_date === today) return;

  const next = data.queue.find((item) => item.status === 'pending');

  if (!next) {
    console.log('Queue khaali hai, aaj post karne ko kuch nahi.');
    return;
  }

  try {
    const filePath = path.join(__dirname, 'uploads', next.filename);
    await postImageToPage({
      pageId: settings.page_id,
      pageAccessToken: settings.page_access_token,
      filePath,
      caption: next.caption,
    });

    next.status = 'posted';
    next.posted_at = new Date().toISOString();
    settings.last_posted_date = today;
    save(data);
    console.log(`Queue item #${next.id} post ho gaya.`);
  } catch (err) {
    next.status = 'failed';
    save(data);
    console.error('Post fail ho gaya:', err.message);
  }
}

function startScheduler() {
  // Har minute check karega ki set time hua ya nahi
  cron.schedule('* * * * *', checkAndPost);
  console.log('Scheduler start ho gaya, har minute check karega.');
}

module.exports = { startScheduler };
