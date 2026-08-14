const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function postImageToPage({ pageId, pageAccessToken, filePath, caption }) {
  // Step 1: Photo ko upload karo lekin abhi publish mat karo
  const uploadForm = new FormData();
  uploadForm.append('source', fs.createReadStream(filePath));
  uploadForm.append('published', 'false');
  uploadForm.append('access_token', pageAccessToken);

  const uploadUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: uploadForm });
  const uploadData = await uploadRes.json();

  if (uploadData.error) {
    throw new Error(uploadData.error.message || 'Photo upload fail ho gaya');
  }

  const photoId = uploadData.id;

  // Step 2: Ab is photo ko ek proper Timeline post ke roop mein publish karo
  const feedParams = new URLSearchParams();
  feedParams.append('message', caption || '');
  feedParams.append('attached_media[0]', JSON.stringify({ media_fbid: photoId }));
  feedParams.append('access_token', pageAccessToken);

  const feedUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;
  const feedRes = await fetch(feedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: feedParams,
  });
  const feedData = await feedRes.json();

  if (feedData.error) {
    throw new Error(feedData.error.message || 'Timeline post fail ho gaya');
  }

  return feedData;
}

module.exports = { postImageToPage };
