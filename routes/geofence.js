const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

// Get geofence zones for device
router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('geofence_zones')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create geofence zone
router.post('/:deviceId', auth, async (req, res) => {
  try {
    const { name, latitude, longitude, radiusMeters, zoneType, notifyOnEnter, notifyOnExit } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing name, latitude, or longitude' });
    }
    const { data, error } = await supabase.from('geofence_zones').insert({
      device_id: req.params.deviceId, name, latitude, longitude,
      radius_meters: radiusMeters || 100, zone_type: zoneType || 'safe',
      notify_on_enter: notifyOnEnter !== false, notify_on_exit: notifyOnExit !== false
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update geofence zone
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, latitude, longitude, radiusMeters, zoneType, isActive, notifyOnEnter, notifyOnExit } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (latitude !== undefined) update.latitude = latitude;
    if (longitude !== undefined) update.longitude = longitude;
    if (radiusMeters !== undefined) update.radius_meters = radiusMeters;
    if (zoneType !== undefined) update.zone_type = zoneType;
    if (isActive !== undefined) update.is_active = isActive;
    if (notifyOnEnter !== undefined) update.notify_on_enter = notifyOnEnter;
    if (notifyOnExit !== undefined) update.notify_on_exit = notifyOnExit;

    const { data, error } = await supabase.from('geofence_zones').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete geofence zone
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('geofence_zones').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get geofence alerts for device
router.get('/:deviceId/alerts', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('geofence_alerts')
      .select('*, geofence_zones(name)')
      .eq('device_id', req.params.deviceId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Device reports geofence event
router.post('/event', async (req, res) => {
  try {
    const { deviceId, zoneId, eventType, latitude, longitude } = req.body;
    const { data: zone } = await supabase.from('geofence_zones').select('notify_on_enter, notify_on_exit, zone_type, name').eq('id', zoneId).single();

    const shouldNotify = (eventType === 'enter' && zone?.notify_on_enter) || (eventType === 'exit' && zone?.notify_on_exit);

    const { data, error } = await supabase.from('geofence_alerts').insert({
      device_id: deviceId, zone_id: zoneId, event_type: eventType, latitude, longitude
    }).select().single();
    if (error) throw error;

    if (shouldNotify) {
      const { data: device } = await supabase.from('devices').select('user_id, device_name').eq('device_id', deviceId).single();
      if (device) {
        await supabase.from('alerts').insert({
          device_id: deviceId, alert_type: 'geofence',
          title: `Geofence ${eventType}: ${zone?.name || 'Unknown'}`,
          message: `${device.device_name} ${eventType === 'enter' ? 'entered' : 'left'} zone "${zone?.name}"`,
          severity: zone?.zone_type === 'restricted' ? 'warning' : 'info'
        });
      }
    }

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
