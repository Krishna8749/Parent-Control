const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('installed_apps')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('app_name');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sync', async (req, res) => {
  try {
    const { deviceId, apps } = req.body;
    for (const app of apps) {
      const pkg = app.package || app.pkg || app.packageName || '';
      const name = app.name || app.appName || app.app_name || '';
      const ver = app.version || app.versionName || '';
      const isSys = app.isSystem || app.isSystemApp || app.is_system_app || false;
      if (!pkg) continue;
      await supabase.from('installed_apps').upsert({
        device_id: deviceId, package_name: pkg, app_name: name,
        version_name: ver, is_system_app: isSys, is_blocked: app.blocked || false
      }, { onConflict: 'device_id,package_name' });
    }
    res.json({ synced: apps.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generic block/unblock by app record ID
router.put('/:deviceId', auth, async (req, res) => {
  try {
    const { appId, isBlocked } = req.body;
    if (!appId) return res.status(400).json({ error: 'Missing appId' });
    const { error } = await supabase.from('installed_apps').update({ is_blocked: isBlocked }).eq('id', appId).eq('device_id', req.params.deviceId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:deviceId/block', auth, async (req, res) => {
  try {
    const { packageName, block } = req.body;
    const { error } = await supabase
      .from('installed_apps')
      .update({ is_blocked: block })
      .eq('device_id', req.params.deviceId)
      .eq('package_name', packageName);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId/usage', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_usage_stats')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('usage_date', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
