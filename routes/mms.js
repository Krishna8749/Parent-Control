const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

// Get MMS for device
router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from('mms_messages')
      .select('*', { count: 'exact' })
      .eq('device_id', req.params.deviceId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json({ messages: data, total: count, page: +page, limit: +limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Device uploads MMS
router.post('/sync', async (req, res) => {
  try {
    const { deviceId, messages } = req.body;
    if (!deviceId || !messages) return res.status(400).json({ error: 'Missing data' });
    const inserts = messages.map(m => ({
      device_id: deviceId, direction: m.direction, sender: m.sender, receiver: m.receiver,
      body: m.body, media_urls: m.mediaUrls, media_type: m.mediaType, timestamp: m.timestamp || new Date()
    }));
    const { data, error } = await supabase.from('mms_messages').insert(inserts).select();
    if (error) throw error;
    res.json({ synced: data.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Search MMS
router.get('/:deviceId/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const { data, error } = await supabase
      .from('mms_messages')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .or(`body.ilike.%${q}%,sender.ilike.%${q}%,receiver.ilike.%${q}%`)
      .order('timestamp', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
