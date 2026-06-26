const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

// Send SMS command to device
router.post('/send', auth, async (req, res) => {
  try {
    const { deviceId, commandText, targetNumber } = req.body;
    if (!deviceId || !commandText) return res.status(400).json({ error: 'Missing deviceId or commandText' });

    const { data, error } = await supabase.from('sms_commands').insert({
      device_id: deviceId, command_text: commandText, target_number: targetNumber,
      issued_by: req.userId, status: 'sent', sent_at: new Date()
    }).select().single();
    if (error) throw error;

    const io = req.app.get('io');
    io.to(`device:${deviceId}`).emit('command', { command: 'sms_command', params: { id: data.id, commandText, targetNumber } });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get SMS commands for device
router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sms_commands')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Device reports command result
router.post('/result/:id', async (req, res) => {
  try {
    const { status, response } = req.body;
    const update = { status };
    if (response) update.response = response;
    if (status === 'executed') update.executed_at = new Date();

    const { error } = await supabase.from('sms_commands').update(update).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete SMS command
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('sms_commands').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
