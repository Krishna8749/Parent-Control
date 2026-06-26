const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

// Get all notifications for user
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get unread count
router.get('/unread', auth, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('is_read', false);
    if (error) throw error;
    res.json({ unread: count || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', req.userId).eq('is_read', false);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
