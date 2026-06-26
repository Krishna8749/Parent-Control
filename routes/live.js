const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Start live session
router.post('/start', auth, async (req, res) => {
  try {
    const { deviceId, sessionType } = req.body;
    const roomId = uuidv4();
    const { data, error } = await supabase.from('live_sessions').insert({
      device_id: deviceId, user_id: req.userId, session_type: sessionType,
      room_id: roomId, status: 'pending'
    }).select().single();
    if (error) throw error;

    const io = req.app.get('io');
    io.to(`device:${deviceId}`).emit('command', {
      command: 'start_live', params: { sessionId: data.id, roomId, sessionType }
    });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// End live session
router.post('/:id/end', auth, async (req, res) => {
  try {
    const { data: session } = await supabase.from('live_sessions').select('*').eq('id', req.params.id).single();
    const duration = session.started_at ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000) : 0;

    const { error } = await supabase.from('live_sessions').update({
      status: 'ended', ended_at: new Date(), duration_seconds: duration
    }).eq('id', req.params.id);
    if (error) throw error;

    const io = req.app.get('io');
    io.to(`device:${session.device_id}`).emit('command', { command: 'end_live', params: { sessionId: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get active sessions
router.get('/:deviceId/active', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('live_sessions')
      .select('*').eq('device_id', req.params.deviceId).in('status', ['pending', 'active']).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get session history
router.get('/:deviceId/history', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('live_sessions')
      .select('*').eq('device_id', req.params.deviceId).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
