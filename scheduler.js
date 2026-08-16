const cron = require('node-cron');
const db = require('./db');
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
  const settings = await db.getSettings();
  if (!settings.page_id || !settings.page_access_token) return;
  if (!settings.post_times || settings.post_times.length === 0) return;

  const tz = settings.timezone || 'Asia/Kolkata';
  const currentHHMM = getCurrentHHMMInTZ(tz);
  const today = getTodayInTZ(tz);
  const slotKey = `${today}_${currentHHMM}`;

  if (!settings.post_times.includes(currentHHMM)) return;
  if (settings.posted_slots.includes(slotKey)) return;

  const queue = await db.getQueue();
  const next = queue.find((item) => item.status === 'pending');

  const updatedSlots = [...settings.posted_slots, slotKey].slice(-500);

  if (!next) {
    console.log(`[${slotKey}] Queue khaali hai, post karne ko kuch nahi.`);
    await db.saveSettings({ posted_slots: updatedSlots });
    return;
  }

  try {
    await postImageToPage({
      pageId: settings.page_id,
      pageAccessToken: settings.page_access_token,
      imageUrl: next.image_url,
      caption: next.caption,
    });

    await db.updateQueueItem(next.id, {
      status: 'posted',
      posted_at: new Date().toISOString(),
    });
    await db.saveSettings({ posted_slots: updatedSlots });
    console.log(`[${slotKey}] Queue item #${next.id} post ho gaya.`);
  } catch (err) {
    await db.updateQueueItem(next.id, { status: 'failed' });
    await db.saveSettings({ posted_slots: updatedSlots });
    console.error(`[${slotKey}] Post fail ho gaya:`, err.message);
  }
}

function startScheduler() {
  cron.schedule('* * * * *', checkAndPost);
  console.log('Scheduler start ho gaya, har minute check karega.');
}

module.exports = { startScheduler };
