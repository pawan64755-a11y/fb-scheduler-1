const settingsForm = document.getElementById('settingsForm');
const uploadForm = document.getElementById('uploadForm');
const settingsStatus = document.getElementById('settingsStatus');
const uploadStatus = document.getElementById('uploadStatus');
const queueList = document.getElementById('queueList');
const tokenHint = document.getElementById('tokenHint');
const timesList = document.getElementById('timesList');
const newTimeInput = document.getElementById('newTimeInput');
const addTimeBtn = document.getElementById('addTimeBtn');

let currentTimes = [];

function renderTimes() {
  if (currentTimes.length === 0) {
    timesList.innerHTML = '<div class="empty">Koi time add nahi kiya abhi tak.</div>';
    return;
  }
  timesList.innerHTML = currentTimes
    .sort()
    .map(
      (t) => `
      <div class="time-chip">
        <span>${t}</span>
        <button type="button" class="chip-remove" onclick="removeTime('${t}')">✕</button>
      </div>`
    )
    .join('');
}

function removeTime(t) {
  currentTimes = currentTimes.filter((x) => x !== t);
  renderTimes();
}
window.removeTime = removeTime;

addTimeBtn.addEventListener('click', () => {
  const t = newTimeInput.value;
  if (t && !currentTimes.includes(t)) {
    currentTimes.push(t);
    renderTimes();
  }
});

async function loadSettings() {
  const res = await fetch('/api/settings');
  const s = await res.json();
  if (s.page_id) document.getElementById('page_id').value = s.page_id;
  if (s.timezone) document.getElementById('timezone').value = s.timezone;
  currentTimes = Array.isArray(s.post_times) ? s.post_times : [];
  renderTimes();
  tokenHint.textContent = s.has_token ? 'Token pehle se saved hai (khaali chhod sakte ho agar change nahi karna).' : '';
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (currentTimes.length === 0) {
    settingsStatus.textContent = '❌ Kam se kam ek time add karo.';
    return;
  }
  const body = {
    page_id: document.getElementById('page_id').value.trim(),
    page_access_token: document.getElementById('page_access_token').value.trim(),
    post_times: currentTimes,
    timezone: document.getElementById('timezone').value,
  };
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    settingsStatus.textContent = '✅ Settings save ho gayi!';
    document.getElementById('page_access_token').value = '';
    loadSettings();
  } else {
    settingsStatus.textContent = '❌ Kuch galat hua, dubara try karo.';
  }
  setTimeout(() => (settingsStatus.textContent = ''), 3000);
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('image');
  const caption = document.getElementById('caption').value;
  if (!fileInput.files[0]) return;

  const formData = new FormData();
  formData.append('image', fileInput.files[0]);
  formData.append('caption', caption);

  uploadStatus.textContent = 'Upload ho raha hai...';
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (res.ok) {
    uploadStatus.textContent = '✅ Queue mein add ho gaya!';
    uploadForm.reset();
    loadQueue();
  } else {
    uploadStatus.textContent = '❌ Upload fail ho gaya.';
  }
  setTimeout(() => (uploadStatus.textContent = ''), 3000);
});

async function loadQueue() {
  const res = await fetch('/api/queue');
  const items = await res.json();
  if (items.length === 0) {
    queueList.innerHTML = '<div class="empty">Queue khaali hai. Upar se image upload karo.</div>';
    return;
  }
  queueList.innerHTML = items
    .map(
      (item) => `
      <div class="queue-item">
        <img src="/uploads/${item.filename}" alt="">
        <div class="info">
          <div class="caption">${item.caption || '(no caption)'}</div>
          <span class="badge ${item.status}">${item.status}</span>
        </div>
        ${item.status === 'pending' ? `<button class="del-btn" onclick="deleteItem(${item.id})">Remove</button>` : ''}
      </div>`
    )
    .join('');
}

async function deleteItem(id) {
  await fetch(`/api/queue/${id}`, { method: 'DELETE' });
  loadQueue();
}
window.deleteItem = deleteItem;

loadSettings();
loadQueue();
setInterval(loadQueue, 10000); // har 10 second mein queue refresh
