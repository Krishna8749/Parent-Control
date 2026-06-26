const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const [sms, mms, calls, apps, screenshots, locations, chat, contacts, calendar, browser, pictures, files, geofence, smsCmd, sim, screenTime, appUsage] = await Promise.all([
      supabase.from('sms_messages').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('mms_messages').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('call_logs').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('installed_apps').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('screenshots').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('locations').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('calendar_events').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('browser_history').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('pictures').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('device_files').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('geofence_zones').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('sms_commands').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('sim_info').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
      supabase.from('screen_time_stats').select('total_minutes, unlock_count').eq('device_id', deviceId).order('stat_date', { ascending: false }).limit(7),
      supabase.from('app_usage_stats').select('package_name, usage_minutes').eq('device_id', deviceId).order('usage_date', { ascending: false }).limit(100)
    ]);

    const screenTimeToday = (screenTime.data || []).slice(0, 1).reduce((sum, r) => sum + (r.total_minutes || 0), 0);
    const screenTimeWeek = (screenTime.data || []).reduce((sum, r) => sum + (r.total_minutes || 0), 0);

    const appUsageAgg = {};
    (appUsage.data || []).forEach(u => {
      appUsageAgg[u.package_name] = (appUsageAgg[u.package_name] || 0) + (u.usage_minutes || 0);
    });
    const topApps = Object.entries(appUsageAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

    res.json({
      sms: sms.count || 0, mms: mms.count || 0, calls: calls.count || 0,
      apps: apps.count || 0, screenshots: screenshots.count || 0, locations: locations.count || 0,
      chatMessages: chat.count || 0, contacts: contacts.count || 0, calendarEvents: calendar.count || 0,
      browserHistory: browser.count || 0, pictures: pictures.count || 0, files: files.count || 0,
      geofenceZones: geofence.count || 0, smsCommands: smsCmd.count || 0, simCards: sim.count || 0,
      screenTimeToday, screenTimeWeek, topApps
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
