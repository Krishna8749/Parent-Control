const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

// Get all devices for user
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single device
router.get('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register new device
router.post('/', auth, async (req, res) => {
  try {
    const { deviceName, deviceModel, osVersion, androidVersion, deviceId, phoneNumber, installationId, appVersion } = req.body;

    const { data, error } = await supabase
      .from('devices')
      .upsert({
        user_id: req.userId,
        device_name: deviceName,
        device_model: deviceModel,
        os_version: osVersion,
        android_version: androidVersion,
        device_id: deviceId,
        phone_number: phoneNumber,
        installation_id: installationId,
        app_version: appVersion,
        is_online: 1,
        last_seen: new Date()
      }, { onConflict: 'device_id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update device heartbeat
router.post('/:deviceId/heartbeat', async (req, res) => {
  try {
    const { batteryLevel, batteryCharging, latitude, longitude } = req.body;

    const update = {
      is_online: 1,
      last_seen: new Date(),
      battery_level: batteryLevel,
      battery_charging: batteryCharging
    };

    if (latitude !== undefined && longitude !== undefined) {
      update.latitude = latitude;
      update.longitude = longitude;
      update.location_updated_at = new Date();
    }

    const { data, error } = await supabase
      .from('devices')
      .update(update)
      .eq('device_id', req.params.deviceId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete device
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
