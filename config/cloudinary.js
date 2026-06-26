let _client;
function getClient() {
  if (_client) return _client;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || cloudName.includes('your-cloud')) return null;
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  _client = cloudinary;
  return _client;
}

const handler = {
  get(_, prop) {
    const c = getClient();
    return c ? c[prop] : undefined;
  }
};

module.exports = new Proxy({}, handler);