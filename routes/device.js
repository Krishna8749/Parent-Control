const router = require('express').Router();
const { supabase } = require('../config/supabase');

router.post('/register', async (req, res) => {
  try {
    const { deviceName, deviceModel, osVersion, androidVersion, deviceId, phoneNumber, installationId, appVersion, userId } = req.body;
    if (!deviceId || !userId) return res.status(400).json({ error: 'Missing deviceId or userId' });

    const { data, error } = await supabase.from('devices').upsert({
      user_id: userId, device_name: deviceName, device_model: deviceModel,
      os_version: osVersion, android_version: androidVersion, device_id: deviceId,
      phone_number: phoneNumber, installation_id: installationId, app_version: appVersion,
      is_online: 1, last_seen: new Date()
    }, { onConflict: 'device_id' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/heartbeat', async (req, res) => {
  try {
    const { deviceId, batteryLevel, batteryCharging, latitude, longitude } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
    const update = { is_online: 1, last_seen: new Date(), battery_level: batteryLevel, battery_charging: batteryCharging ? 1 : 0 };
    if (latitude !== undefined) { update.latitude = latitude; update.longitude = longitude; update.location_updated_at = new Date(); }
    const { error } = await supabase.from('devices').update(update).eq('device_id', deviceId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/commands/:deviceId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('remote_commands')
      .select('*').eq('device_id', req.params.deviceId).eq('status', 'pending').order('created_at');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/command/:id/result', async (req, res) => {
  try {
    const { status, result } = req.body;
    const update = { status, executed_at: new Date() };
    if (result) update.result = result;
    const { error } = await supabase.from('remote_commands').update(update).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/schedule/:deviceId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('schedule_restrictions').select('*').eq('device_id', req.params.deviceId).eq('is_active', true);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/blocked/:deviceId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('blocked_numbers').select('*').eq('device_id', req.params.deviceId);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/blocked-apps/:deviceId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('installed_apps').select('package_name').eq('device_id', req.params.deviceId).eq('is_blocked', true);
    if (error) throw error;
    res.json(data.map(d => d.package_name));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/settings/:deviceId', async (req, res) => {
  try {
    const { settings } = req.body;
    const { data, error } = await supabase
      .from('device_settings')
      .upsert({ device_id: req.params.deviceId, ...settings, updated_at: new Date() }, { onConflict: 'device_id' })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/settings/:deviceId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('device_settings').select('*').eq('device_id', req.params.deviceId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sim/:deviceId', async (req, res) => {
  try {
    const { simCards } = req.body;
    for (const sim of simCards || []) {
      await supabase.from('sim_info').upsert({
        device_id: req.params.deviceId, sim_slot: sim.simSlot, phone_number: sim.phoneNumber,
        carrier_name: sim.carrierName, network_type: sim.networkType,
        country_code: sim.countryCode, is_active: sim.isActive !== false ? 1 : 0
      }, { onConflict: 'device_id,sim_slot' });
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sim/:deviceId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('sim_info').select('*').eq('device_id', req.params.deviceId);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/app-usage/:deviceId', async (req, res) => {
  try {
    const { usage } = req.body;
    for (const u of usage || []) {
      await supabase.from('app_usage_stats').upsert({
        device_id: req.params.deviceId, package_name: u.packageName,
        usage_date: u.date || new Date().toISOString().split('T')[0],
        usage_minutes: u.usageMinutes, open_count: u.openCount || 0,
        last_used: u.lastUsed
      }, { onConflict: 'device_id,package_name,usage_date' });
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/screen-time/:deviceId', async (req, res) => {
  try {
    const { date, totalMinutes, unlockCount } = req.body;
    const { error } = await supabase.from('screen_time_stats').upsert({
      device_id: req.params.deviceId, stat_date: date || new Date().toISOString().split('T')[0],
      total_minutes: totalMinutes, unlock_count: unlockCount || 0,
      last_use: new Date()
    }, { onConflict: 'device_id,stat_date' });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Clear all data for a device from a specific table
router.post('/clear/:table', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const allowed = ['sms_messages','mms_messages','call_logs','locations','installed_apps','contacts','calendar_events','browser_history','screenshots','pictures','chat_messages','remote_commands','device_files','alerts','geofence_zones','geofence_alerts','schedule_restrictions','blocked_numbers','sms_commands','sim_info','screen_time_stats','app_usage_stats','daily_summary'];
    if (!allowed.includes(req.params.table)) return res.status(400).json({ error: 'Invalid table' });
    if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });
    const { error } = await supabase.from(req.params.table).delete().eq('device_id', deviceId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/geofence-event', async (req, res) => {
  try {
    const { deviceId, zoneId, eventType, latitude, longitude } = req.body;
    const { data: zone } = await supabase.from('geofence_zones').select('name, zone_type, notify_on_enter, notify_on_exit').eq('id', zoneId).single();
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
          title: `${eventType === 'enter' ? 'Entered' : 'Left'}: ${zone?.name}`,
          message: `${device.device_name} ${eventType === 'enter' ? 'entered' : 'left'} zone "${zone?.name}"`,
          severity: zone?.zone_type === 'restricted' ? 'warning' : 'info'
        });
      }
    }
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
