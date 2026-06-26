const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

// Get SIM info for device
router.get('/:deviceId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sim_info')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('sim_slot');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Device syncs SIM info
router.post('/sync', async (req, res) => {
  try {
    const { deviceId, simCards } = req.body;
    if (!deviceId || !simCards) return res.status(400).json({ error: 'Missing data' });

    for (const sim of simCards) {
      await supabase.from('sim_info').upsert({
        device_id: deviceId, sim_slot: sim.simSlot, phone_number: sim.phoneNumber,
        carrier_name: sim.carrierName, network_type: sim.networkType,
        country_code: sim.countryCode, imsi: sim.imsi, is_active: sim.isActive !== false ? 1 : 0
      }, { onConflict: 'device_id,sim_slot' });
    }
    res.json({ synced: simCards.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete SIM info
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('sim_info').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
