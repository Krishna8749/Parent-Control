const router = require('express').Router();
const { supabase } = require('../config/supabase');
const cloudinary = require('../config/cloudinary');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('pictures').select('*').eq('device_id', req.params.deviceId).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload', async (req, res) => {
  try {
    const { deviceId, imageData, fileName, mimeType, width, height, takenAt } = req.body;
    if (!deviceId || !imageData) return res.status(400).json({ error: 'Missing data' });
    const result = await cloudinary.uploader.upload(imageData, { folder: 'parental-control/pictures' });
    const { data, error } = await supabase.from('pictures').insert({
      device_id: deviceId, image_url: result.secure_url, thumbnail_url: result.eager?.[0]?.secure_url,
      file_name: fileName, file_size: result.bytes, mime_type: mimeType,
      width: width || result.width, height: height || result.height, taken_at: takenAt
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('pictures').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
