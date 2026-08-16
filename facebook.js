const fetch = require('node-fetch');

async function postImageToPage({ pageId, pageAccessToken, imageUrl, caption }) {
  // Step 1: Photo ko image URL se upload karo, abhi publish mat karo
  const uploadParams = new URLSearchParams();
  uploadParams.append('url', imageUrl);
  uploadParams.append('published', 'false');
  uploadParams.append('access_token', pageAccessToken);

  const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: uploadParams,
  });
  const uploadData = await uploadRes.json();

  if (uploadData.error) {
    throw new Error(uploadData.error.message || 'Photo upload fail ho gaya');
  }

  const photoId = uploadData.id;

  // Step 2: Is photo ko ek proper Timeline post ke roop mein publish karo
  const feedParams = new URLSearchParams();
  feedParams.append('message', caption || '');
  feedParams.append('attached_media[0]', JSON.stringify({ media_fbid: photoId }));
  feedParams.append('access_token', pageAccessToken);

  const feedRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
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
