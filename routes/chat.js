const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { app } = req.query;
    let query = supabase.from('chat_messages').select('*').eq('device_id', req.params.deviceId);
    if (app) query = query.eq('app_name', app);
    const { data, error } = await query.order('timestamp', { ascending: false }).limit(500);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sync', async (req, res) => {
  try {
    const { deviceId, appName, messages } = req.body;
    if (!deviceId || !appName || !messages) return res.status(400).json({ error: 'Missing data' });
    const inserts = messages.map(m => ({
      device_id: deviceId, app_name: appName, conversation_id: m.conversationId,
      contact_name: m.contactName, contact_avatar: m.contactAvatar,
      sender: m.sender, receiver: m.receiver, message: m.message,
      direction: m.direction, has_media: m.hasMedia, media_url: m.mediaUrl,
      media_type: m.mediaType, timestamp: m.timestamp || new Date()
    }));
    const { data, error } = await supabase.from('chat_messages').insert(inserts).select();
    if (error) throw error;
    res.json({ synced: data.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId/apps', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('chat_messages').select('app_name').eq('device_id', req.params.deviceId);
    if (error) throw error;
    const apps = [...new Set(data.map(d => d.app_name))];
    res.json(apps);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId/search', auth, async (req, res) => {
  try {
    const { q, app } = req.query;
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .or(`message.ilike.%${q}%,contact_name.ilike.%${q}%,sender.ilike.%${q}%`);
    if (app) query = query.eq('app_name', app);
    const { data, error } = await query.order('timestamp', { ascending: false }).limit(200);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('chat_messages').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
