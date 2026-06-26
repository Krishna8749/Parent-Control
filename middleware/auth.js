const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const deviceAuth = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'];
    const deviceSecret = req.headers['x-device-secret'];
    if (!deviceId) return res.status(401).json({ error: 'No device ID' });

    req.deviceId = deviceId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Device auth failed' });
  }
};

module.exports = { auth, deviceAuth };
