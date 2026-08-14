const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function postImageToPage({ pageId, pageAccessToken, filePath, caption }) {
  const form = new FormData();
  form.append('source', fs.createReadStream(filePath));
  form.append('caption', caption || '');
  form.append('access_token', pageAccessToken);

  const url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || 'Facebook API error');
  }
  return data;
}

module.exports = { postImageToPage };
