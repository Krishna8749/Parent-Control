const router = require('express').Router();
const { supabase } = require('../config/supabase');
const cloudinary = require('../config/cloudinary');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { path } = req.query;
    let query = supabase.from('device_files')
      .select('*').eq('device_id', req.params.deviceId);
    if (path) {
      query = query.eq('parent_path', path);
    } else {
      query = query.eq('parent_path', '/');
    }
    const { data, error } = await query.order('is_directory', { ascending: false }).order('file_name');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const { data, error } = await supabase
      .from('device_files')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .ilike('file_name', `%${q}%`)
      .order('file_name')
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId/download/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('device_files').select('file_url, file_name, mime_type').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'File not found' });
    res.json({ url: data.file_url, fileName: data.file_name, mimeType: data.mime_type });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload', async (req, res) => {
  try {
    const { deviceId, filePath, fileName, fileData, mimeType, fileSize, parentPath } = req.body;
    if (!deviceId || !fileName) return res.status(400).json({ error: 'Missing data' });
    let fileUrl = null;
    if (fileData) {
      const result = await cloudinary.uploader.upload(fileData, { folder: 'parental-control/files', resource_type: 'auto' });
      fileUrl = result.secure_url;
    }
    const { data, error } = await supabase.from('device_files').insert({
      device_id: deviceId, file_path: filePath, file_name: fileName,
      file_size: fileSize, mime_type: mimeType, file_url: fileUrl, parent_path: parentPath || '/'
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('device_files').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
