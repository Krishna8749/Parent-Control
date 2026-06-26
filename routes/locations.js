const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('timestamp', { ascending: false })
      .limit(500);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId/live', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('latitude, longitude, location_updated_at, battery_level, battery_charging, is_online, last_seen')
      .eq('id', req.params.deviceId)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sync', async (req, res) => {
  try {
    const { deviceId, locations } = req.body;
    const inserts = locations.map(l => ({
      device_id: deviceId, latitude: l.latitude, longitude: l.longitude,
      accuracy: l.accuracy, address: l.address, timestamp: l.timestamp || new Date()
    }));
    const { data, error } = await supabase.from('locations').insert(inserts).select();
    if (error) throw error;
    res.json({ synced: data.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
