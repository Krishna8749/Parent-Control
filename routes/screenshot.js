const router = require('express').Router();
const { supabase } = require('../config/supabase');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { auth } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('screenshots').select('*').eq('device_id', req.params.deviceId).order('timestamp', { ascending: false }).limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload', upload.single('screenshot'), async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const b64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, { folder: 'parental-control/screenshots' });

    const { data, error } = await supabase.from('screenshots').insert({
      device_id: deviceId, image_url: result.secure_url, source: 'upload'
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/capture', async (req, res) => {
  try {
    const { deviceId, imageData } = req.body;
    const result = await cloudinary.uploader.upload(imageData, { folder: 'parental-control/screenshots' });
    const { data, error } = await supabase.from('screenshots').insert({
      device_id: deviceId, image_url: result.secure_url, source: 'remote'
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
