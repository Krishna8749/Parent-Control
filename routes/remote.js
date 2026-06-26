const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.post('/command', auth, async (req, res) => {
  try {
    const { deviceId, command, params } = req.body;
    if (!deviceId || !command) return res.status(400).json({ error: 'Missing deviceId or command' });

    const { data, error } = await supabase.from('remote_commands').insert({
      device_id: deviceId, command, params: params ? JSON.stringify(params) : '{}', issued_by: req.userId
    }).select().single();
    if (error) throw error;

    const io = req.app.get('io');
    if (io) io.to(`device:${deviceId}`).emit('command', { id: data.id, command, params });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/commands/:deviceId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('remote_commands')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .eq('status', 'pending')
      .order('created_at');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/command/:id/execute', async (req, res) => {
  try {
    const { result } = req.body;
    const { error } = await supabase.from('remote_commands').update({
      status: 'executed', result, executed_at: new Date()
    }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/command/:id/fail', async (req, res) => {
  try {
    const { error_message } = req.body;
    const { error } = await supabase.from('remote_commands').update({
      status: 'failed', error_message, executed_at: new Date()
    }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history/:deviceId', auth, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = supabase
      .from('remote_commands')
      .select('*')
      .eq('device_id', req.params.deviceId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(+limit);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/command/:id/cancel', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('remote_commands').update({ status: 'failed', error_message: 'Cancelled by user' }).eq('id', req.params.id).eq('status', 'pending');
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
