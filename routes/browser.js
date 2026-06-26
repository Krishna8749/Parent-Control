const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('browser_history').select('*').eq('device_id', req.params.deviceId).order('last_visited', { ascending: false }).limit(500);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sync', async (req, res) => {
  try {
    const { deviceId, history } = req.body;
    if (!deviceId || !history) return res.status(400).json({ error: 'Missing data' });
    for (const h of history) {
      await supabase.from('browser_history').upsert({
        device_id: deviceId, url: h.url, title: h.title, visit_count: h.visitCount || 1,
        is_bookmarked: h.isBookmarked ? 1 : 0, last_visited: h.lastVisited || new Date()
      }, { onConflict: 'device_id,url' });
    }
    res.json({ synced: history.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const { data, error } = await supabase
      .from('browser_history')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .or(`url.ilike.%${q}%,title.ilike.%${q}%`)
      .order('last_visited', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('browser_history').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
