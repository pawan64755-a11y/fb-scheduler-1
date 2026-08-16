const FormData = require('form-data');
const fetch = require('node-fetch');

async function uploadToImgBB(fileBuffer) {
  const form = new FormData();
  form.append('image', fileBuffer.toString('base64'));

  const url = `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`;
  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json();

  if (!data.success) {
    throw new Error('ImgBB par image upload fail ho gaya');
  }

  return data.data.url; // Ye permanent public image URL hai
}

module.exports = { uploadToImgBB };
