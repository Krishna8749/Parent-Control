const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('contacts').select('*').eq('device_id', req.params.deviceId).order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sync', async (req, res) => {
  try {
    const { deviceId, contacts } = req.body;
    if (!deviceId || !contacts) return res.status(400).json({ error: 'Missing data' });
    for (const c of contacts) {
      const phone = c.phone || c.number || c.phoneNumber || '';
      const name = c.name || 'Unknown';
      if (!phone && name === 'Unknown') continue;
      await supabase.from('contacts').upsert({
        device_id: deviceId, name: name, phone_number: phone,
        email: c.email || '', photo_url: c.photo || c.photoUrl || '', is_favorite: c.isFavorite ? 1 : 0,
        group_name: c.groupName || ''
      }, { onConflict: 'device_id,name,phone_number' });
    }
    res.json({ synced: contacts.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .or(`name.ilike.%${q}%,phone_number.ilike.%${q}%,email.ilike.%${q}%`)
      .order('name')
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:deviceId/block', auth, async (req, res) => {
  try {
    const { contactId, block } = req.body;
    const { error } = await supabase.from('contacts').update({ is_blocked: block ? 1 : 0 }).eq('id', contactId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('contacts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
