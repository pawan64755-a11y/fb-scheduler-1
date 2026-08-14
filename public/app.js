const settingsForm = document.getElementById('settingsForm');
const uploadForm = document.getElementById('uploadForm');
const settingsStatus = document.getElementById('settingsStatus');
const uploadStatus = document.getElementById('uploadStatus');
const queueList = document.getElementById('queueList');
const tokenHint = document.getElementById('tokenHint');

async function loadSettings() {
  const res = await fetch('/api/settings');
  const s = await res.json();
  if (s.page_id) document.getElementById('page_id').value = s.page_id;
  if (s.post_time) document.getElementById('post_time').value = s.post_time;
  if (s.timezone) document.getElementById('timezone').value = s.timezone;
  tokenHint.textContent = s.has_token ? 'Token pehle se saved hai (khaali chhod sakte ho agar change nahi karna).' : '';
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    page_id: document.getElementById('page_id').value.trim(),
    page_access_token: document.getElementById('page_access_token').value.trim(),
    post_time: document.getElementById('post_time').value,
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
