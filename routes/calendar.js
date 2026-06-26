const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('calendar_events').select('*').eq('device_id', req.params.deviceId).order('start_time');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sync', async (req, res) => {
  try {
    const { deviceId, events } = req.body;
    if (!deviceId || !events) return res.status(400).json({ error: 'Missing data' });
    const inserts = events.map(e => ({
      device_id: deviceId, title: e.title || '', description: e.description || '',
      start_time: e.start || e.startTime || e.date || e.timestamp || new Date(),
      end_time: e.end || e.endTime || '', location: e.location || '',
      is_all_day: e.isAllDay || false, reminder_minutes: e.reminderMinutes || 0,
      recurrence: e.recurrence || '', color: e.color || ''
    }));
    const { data, error } = await supabase.from('calendar_events').insert(inserts).select();
    if (error) throw error;
    res.json({ synced: data.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('calendar_events').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
