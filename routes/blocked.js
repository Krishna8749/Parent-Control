const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

// Get blocked numbers
router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('blocked_numbers').select('*').eq('device_id', req.params.deviceId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Block number
router.post('/:deviceId', auth, async (req, res) => {
  try {
    const { phoneNumber, reason, blockCalls, blockSms } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Missing phoneNumber' });
    const { data, error } = await supabase.from('blocked_numbers').insert({
      device_id: req.params.deviceId, phone_number: phoneNumber, reason,
      block_calls: blockCalls !== false, block_sms: blockSms !== false
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Unblock number
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('blocked_numbers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
