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

function pruneOldSlots(slots, today) {
  // Sirf pichle 3 din ke slots yaad rakho, purane hata do
  return slots.filter((s) => {
    const datePart = s.split('_')[0];
    return datePart >= today; // aaj se purane hata do (simple heuristic)
  }).slice(-500);
}

async function checkAndPost() {
  const data = load();
  const settings = data.settings;
  if (!settings.page_id || !settings.page_access_token) return;
  if (!settings.post_times || settings.post_times.length === 0) return;

  const tz = settings.timezone || 'Asia/Kolkata';
  const currentHHMM = getCurrentHHMMInTZ(tz);
  const today = getTodayInTZ(tz);
  const slotKey = `${today}_${currentHHMM}`;

  // Kya abhi koi scheduled time match ho raha hai?
  if (!settings.post_times.includes(currentHHMM)) return;
  // Ye slot aaj already use ho chuka hai to skip (duplicate post na ho)
  if (settings.posted_slots.includes(slotKey)) return;

  const next = data.queue.find((item) => item.status === 'pending');

  if (!next) {
    console.log(`[${slotKey}] Queue khaali hai, post karne ko kuch nahi.`);
    settings.posted_slots.push(slotKey);
    save(data);
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
    settings.posted_slots.push(slotKey);
    settings.posted_slots = pruneOldSlots(settings.posted_slots, today);
    save(data);
    console.log(`[${slotKey}] Queue item #${next.id} post ho gaya.`);
  } catch (err) {
    next.status = 'failed';
    settings.posted_slots.push(slotKey);
    save(data);
    console.error(`[${slotKey}] Post fail ho gaya:`, err.message);
  }
}

function startScheduler() {
  // Har minute check karega ki koi scheduled time match hua ya nahi
  cron.schedule('* * * * *', checkAndPost);
  console.log('Scheduler start ho gaya, har minute check karega.');
}

module.exports = { startScheduler };
