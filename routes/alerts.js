const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('alerts').select('*').eq('device_id', req.params.deviceId).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId/unread', auth, async (req, res) => {
  try {
    const { count, error } = await supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('device_id', req.params.deviceId).eq('is_read', false);
    if (error) throw error;
    res.json({ unread: count || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sync', async (req, res) => {
  try {
    const { deviceId, alerts } = req.body;
    if (!deviceId || !alerts) return res.status(400).json({ error: 'Missing data' });
    const inserts = alerts.map(a => ({
      device_id: deviceId, alert_type: a.type, title: a.title, message: a.message,
      severity: a.severity || 'info', action_url: a.actionUrl
    }));
    const { data, error } = await supabase.from('alerts').insert(inserts).select();
    if (error) throw error;
    res.json({ synced: data.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    const { deviceId } = req.body;
    let query = supabase.from('alerts').update({ is_read: true }).eq('is_read', false);
    if (deviceId) query = query.eq('device_id', deviceId);
    const { error } = await query;
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('alerts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
