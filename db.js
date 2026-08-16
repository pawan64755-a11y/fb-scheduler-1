const { MongoClient } = require('mongodb');

let client;
let dbInstance;

async function connect() {
  if (dbInstance) return dbInstance;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  dbInstance = client.db('fbscheduler');
  return dbInstance;
}

function defaultSettings() {
  return {
    _id: 'main',
    page_id: null,
    page_access_token: null,
    post_times: ['18:00'],
    timezone: 'Asia/Kolkata',
    posted_slots: [],
  };
}

async function getSettings() {
  const database = await connect();
  let settings = await database.collection('settings').findOne({ _id: 'main' });
  if (!settings) {
    settings = defaultSettings();
    await database.collection('settings').insertOne(settings);
  }
  if (!Array.isArray(settings.post_times)) settings.post_times = ['18:00'];
  if (!Array.isArray(settings.posted_slots)) settings.posted_slots = [];
  return settings;
}

async function saveSettings(updates) {
  const database = await connect();
  await database.collection('settings').updateOne(
    { _id: 'main' },
    { $set: updates },
    { upsert: true }
  );
}

async function getQueue() {
  const database = await connect();
  return database.collection('queue').find({}).sort({ id: 1 }).toArray();
}

async function addQueueItem(item) {
  const database = await connect();
  await database.collection('queue').insertOne(item);
}

async function updateQueueItem(id, updates) {
  const database = await connect();
  await database.collection('queue').updateOne({ id }, { $set: updates });
}

async function deleteQueueItem(id) {
  const database = await connect();
  await database.collection('queue').deleteOne({ id });
}

module.exports = {
  getSettings,
  saveSettings,
  getQueue,
  addQueueItem,
  updateQueueItem,
  deleteQueueItem,
};
