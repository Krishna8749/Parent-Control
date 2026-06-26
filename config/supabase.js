let _db;

function getDb() {
  if (_db) return _db;

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  const hasSupabase = supabaseUrl && !supabaseUrl.includes('your-project');

  if (hasSupabase) {
    const { createClient } = require('@supabase/supabase-js');
    _db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    console.log('  Using Supabase at ' + supabaseUrl);
  } else {
    console.log('═══════════════════════════════════════');
    console.log('  No Supabase configured');
    console.log('  Using SQLite persistent store');
    console.log('  Data path: ' + (process.env.SQLITE_PATH || './data/parental_control.db'));
    console.log('═══════════════════════════════════════');
    const { supabase: sqliteSupabase } = require('./sqlite_store');
    _db = sqliteSupabase;
  }
  return _db;
}

module.exports = {
  get supabase() { return getDb(); },
  get isMemory() { return !process.env.SUPABASE_URL || !!process.env.SUPABASE_URL.includes('your-project'); }
};