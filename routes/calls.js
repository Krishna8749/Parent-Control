const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact' })
      .eq('device_id', req.params.deviceId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json({ calls: data, total: count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sync', async (req, res) => {
  try {
    const { deviceId, calls } = req.body;
    const inserts = calls.map(c => ({
      device_id: deviceId, direction: c.direction || c.type || 'unknown',
      phone_number: c.number || c.phone || c.phoneNumber || '',
      contact_name: c.name || c.contact || c.contactName || 'Unknown',
      duration: c.duration || '0m 0s', timestamp: c.timestamp || c.time || new Date()
    }));
    const { data, error } = await supabase.from('call_logs').insert(inserts).select();
    if (error) throw error;
    res.json({ synced: data.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
