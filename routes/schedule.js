const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('schedule_restrictions').select('*').eq('device_id', req.params.deviceId).order('day_of_week');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:deviceId', auth, async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, restrictionType, targetPackages, internetWhitelist, internetBlacklist } = req.body;
    if (dayOfWeek === undefined || !startTime || !endTime || !restrictionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const { data, error } = await supabase.from('schedule_restrictions').insert({
      device_id: req.params.deviceId, day_of_week: dayOfWeek, start_time: startTime,
      end_time: endTime, restriction_type: restrictionType,
      target_packages: targetPackages, internet_whitelist: internetWhitelist,
      internet_blacklist: internetBlacklist
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, restrictionType, isActive, targetPackages, internetWhitelist, internetBlacklist } = req.body;
    const update = {};
    if (dayOfWeek !== undefined) update.day_of_week = dayOfWeek;
    if (startTime !== undefined) update.start_time = startTime;
    if (endTime !== undefined) update.end_time = endTime;
    if (restrictionType !== undefined) update.restriction_type = restrictionType;
    if (isActive !== undefined) update.is_active = isActive;
    if (targetPackages !== undefined) update.target_packages = targetPackages;
    if (internetWhitelist !== undefined) update.internet_whitelist = internetWhitelist;
    if (internetBlacklist !== undefined) update.internet_blacklist = internetBlacklist;

    const { data, error } = await supabase.from('schedule_restrictions').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('schedule_restrictions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
