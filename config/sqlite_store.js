const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'parental_control.db');
let db;

function getDb() {
  if (db) return db;
  const fs = require('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initTables();
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'parent',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      device_name TEXT NOT NULL,
      device_model TEXT,
      os_version TEXT,
      android_version TEXT,
      device_id TEXT UNIQUE NOT NULL,
      phone_number TEXT,
      sim_number TEXT,
      sim_carrier TEXT,
      is_online INTEGER DEFAULT 0,
      battery_level INTEGER DEFAULT 100,
      battery_charging INTEGER DEFAULT 0,
      last_seen TEXT DEFAULT (datetime('now')),
      latitude REAL,
      longitude REAL,
      address TEXT,
      location_updated_at TEXT,
      installation_id TEXT,
      app_version TEXT,
      icon_hidden INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sms_messages (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      direction TEXT,
      sender TEXT,
      receiver TEXT,
      body TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS mms_messages (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      direction TEXT,
      sender TEXT,
      receiver TEXT,
      body TEXT,
      media_urls TEXT DEFAULT '[]',
      media_type TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS call_logs (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      direction TEXT,
      phone_number TEXT,
      contact_name TEXT,
      duration INTEGER DEFAULT 0,
      timestamp TEXT DEFAULT (datetime('now')),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      altitude REAL,
      speed REAL,
      address TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS geofence_zones (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters INTEGER DEFAULT 100,
      zone_type TEXT DEFAULT 'safe',
      is_active INTEGER DEFAULT 1,
      notify_on_enter INTEGER DEFAULT 1,
      notify_on_exit INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS geofence_alerts (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      zone_id TEXT REFERENCES geofence_zones(id),
      event_type TEXT,
      latitude REAL,
      longitude REAL,
      timestamp TEXT DEFAULT (datetime('now')),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS installed_apps (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      package_name TEXT NOT NULL,
      app_name TEXT,
      version_name TEXT,
      version_code INTEGER,
      size_bytes INTEGER,
      is_system_app INTEGER DEFAULT 0,
      is_blocked INTEGER DEFAULT 0,
      install_date TEXT,
      last_used TEXT,
      usage_minutes INTEGER DEFAULT 0,
      last_synced TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS app_usage_stats (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      package_name TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      usage_minutes INTEGER DEFAULT 0,
      open_count INTEGER DEFAULT 0,
      last_used TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS screen_time_stats (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      stat_date TEXT NOT NULL,
      total_minutes INTEGER DEFAULT 0,
      unlock_count INTEGER DEFAULT 0,
      first_use TEXT,
      last_use TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone_number TEXT,
      email TEXT,
      photo_url TEXT,
      is_blocked INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      group_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      is_all_day INTEGER DEFAULT 0,
      reminder_minutes INTEGER,
      recurrence TEXT,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS browser_history (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      title TEXT,
      visit_count INTEGER DEFAULT 1,
      is_bookmarked INTEGER DEFAULT 0,
      last_visited TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS screenshots (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      width INTEGER,
      height INTEGER,
      file_size INTEGER,
      timestamp TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pictures (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      thumbnail_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      width INTEGER,
      height INTEGER,
      taken_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      app_name TEXT NOT NULL,
      conversation_id TEXT,
      contact_name TEXT,
      contact_avatar TEXT,
      sender TEXT,
      receiver TEXT,
      message TEXT,
      direction TEXT,
      has_media INTEGER DEFAULT 0,
      media_url TEXT,
      media_type TEXT,
      read_status INTEGER DEFAULT 0,
      timestamp TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS remote_commands (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      command TEXT NOT NULL,
      params TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      result TEXT,
      error_message TEXT,
      issued_by TEXT REFERENCES users(id),
      timeout INTEGER DEFAULT 30,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      created_at TEXT DEFAULT (datetime('now')),
      sent_at TEXT,
      executed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sim_info (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      sim_slot INTEGER,
      phone_number TEXT,
      carrier_name TEXT,
      network_type TEXT,
      country_code TEXT,
      imsi TEXT,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS device_settings (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE UNIQUE,
      camera_enabled INTEGER DEFAULT 1,
      microphone_enabled INTEGER DEFAULT 1,
      location_enabled INTEGER DEFAULT 1,
      bluetooth_enabled INTEGER DEFAULT 1,
      wifi_enabled INTEGER DEFAULT 1,
      mobile_data_enabled INTEGER DEFAULT 1,
      icon_hidden INTEGER DEFAULT 0,
      usb_debugging_enabled INTEGER DEFAULT 0,
      install_unknown_apps INTEGER DEFAULT 0,
      screen_capture_enabled INTEGER DEFAULT 1,
      notification_access INTEGER DEFAULT 0,
      accessibility_enabled INTEGER DEFAULT 0,
      device_admin_enabled INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS schedule_restrictions (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      day_of_week INTEGER,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      restriction_type TEXT,
      target_packages TEXT DEFAULT '[]',
      internet_whitelist TEXT DEFAULT '[]',
      internet_blacklist TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS blocked_numbers (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      phone_number TEXT NOT NULL,
      reason TEXT,
      block_calls INTEGER DEFAULT 1,
      block_sms INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sms_commands (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      command_text TEXT NOT NULL,
      target_number TEXT,
      response TEXT,
      status TEXT DEFAULT 'pending',
      issued_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      sent_at TEXT,
      executed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      title TEXT,
      message TEXT,
      severity TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      action_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT,
      data TEXT DEFAULT '{}',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS device_files (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      is_directory INTEGER DEFAULT 0,
      parent_path TEXT,
      file_url TEXT,
      permissions TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS live_sessions (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      session_type TEXT,
      status TEXT DEFAULT 'pending',
      room_id TEXT,
      camera_facing TEXT DEFAULT 'rear',
      audio_enabled INTEGER DEFAULT 1,
      record_enabled INTEGER DEFAULT 0,
      max_duration INTEGER DEFAULT 60,
      quality TEXT DEFAULT 'medium',
      started_at TEXT,
      ended_at TEXT,
      duration_seconds INTEGER DEFAULT 0,
      recording_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS webrtc_signals (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES live_sessions(id) ON DELETE CASCADE,
      signal_type TEXT NOT NULL,
      signal_data TEXT NOT NULL,
      from_device INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS daily_summary (
      id TEXT PRIMARY KEY,
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      summary_date TEXT NOT NULL,
      total_screen_time INTEGER DEFAULT 0,
      total_sms_count INTEGER DEFAULT 0,
      total_call_count INTEGER DEFAULT 0,
      total_pictures INTEGER DEFAULT 0,
      total_app_opens INTEGER DEFAULT 0,
      top_app TEXT,
      top_app_minutes INTEGER DEFAULT 0,
      locations_visited INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('[SQLite] Tables initialized');
}

function sanitize(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'string' || typeof val === 'number' || Buffer.isBuffer(val)) return val;
  if (typeof val.toISOString === 'function') return val.toISOString();
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

class QueryBuilder {
  constructor(tableName) {
    this._table = tableName;
    this._type = null;
    this._cols = '*';
    this._data = null;
    this._updateData = null;
    this._filters = [];
    this._orderCol = null;
    this._orderAsc = true;
    this._rangeFrom = null;
    this._rangeTo = null;
    this._limitN = null;
    this._singleFlag = false;
    this._countFlag = false;
    this._headFlag = false;
    this._onConflict = null;
    this._lastResult = null;
  }

  select(cols, opts) {
    if (this._type === 'insert' || this._type === 'upsert') {
      if (opts?.count === 'exact') this._countFlag = true;
      if (opts?.head) this._headFlag = true;
      if (typeof cols === 'string' && cols !== '*') this._cols = cols;
      return this;
    }
    this._type = 'select';
    this._cols = typeof cols === 'string' ? cols : '*';
    if (opts?.count === 'exact') this._countFlag = true;
    if (opts?.head) this._headFlag = true;
    return this;
  }

  insert(data) {
    this._type = 'insert';
    this._data = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this._type = 'update';
    this._updateData = data;
    return this;
  }

  delete() {
    this._type = 'delete';
    return this;
  }

  upsert(data, opts) {
    this._type = 'upsert';
    this._data = Array.isArray(data) ? data : [data];
    this._onConflict = opts?.onConflict;
    return this;
  }

  eq(col, val) { this._filters.push({ col, op: '=', val }); return this; }
  in(col, vals) { this._filters.push({ col, op: 'IN', val: vals }); return this; }
  order(col, opts) { this._orderCol = col; this._orderAsc = opts?.ascending !== false; return this; }
  range(from, to) { this._rangeFrom = from; this._rangeTo = to; return this; }
  limit(n) { this._limitN = n; return this; }
  single() { this._singleFlag = true; return this; }

  then(resolve) {
    try {
      const result = this._exec();
      resolve(result);
    } catch (e) {
      resolve({ data: null, error: e });
    }
  }

  _exec() {
    const localDb = getDb();
    const table = this._table;

    const sv = (v) => sanitize(v);
    const sva = (arr) => arr.map(v => sv(v));

    if (this._type === 'upsert') {
      const conflictCols = this._onConflict ? this._onConflict.split(',').map(s => s.trim()) : ['id'];
      const results = [];
      for (const item of this._data) {
        const id = item.id || crypto.randomUUID();
        const existing = localDb.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(id);
        if (existing) {
          const keys = Object.keys(item).filter(k => k !== 'id' && k !== 'created_at');
          const setClause = keys.map(k => `"${k}" = ?`).join(', ');
          const vals = sva(keys.map(k => item[k]));
          localDb.prepare(`UPDATE "${table}" SET ${setClause} WHERE id = ?`).run(...vals, id);
          results.push(localDb.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(id));
        } else {
          const keys = ['id', ...Object.keys(item).filter(k => k !== 'id')];
          const placeholders = keys.map(() => '?').join(', ');
          const vals = sva(keys.map(k => (k === 'id' ? id : item[k])));
          localDb.prepare(`INSERT OR REPLACE INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`).run(...vals);
          results.push(localDb.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(id));
        }
      }
      this._lastResult = results;
      if (this._singleFlag) {
        const r = results[0] || null;
        return { data: r, error: r ? null : { code: 'PGRST116', message: 'Not found' } };
      }
      return { data: results, error: null };
    }

    if (this._type === 'insert') {
      const results = [];
      for (const item of this._data) {
        const id = item.id || crypto.randomUUID();
        const keys = ['id', ...Object.keys(item).filter(k => k !== 'id')];
        const placeholders = keys.map(() => '?').join(', ');
        const vals = sva(keys.map(k => (k === 'id' ? id : item[k])));
        localDb.prepare(`INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`).run(...vals);
        results.push(localDb.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(id));
      }
      this._lastResult = results;
      if (this._singleFlag) {
        const r = results[0] || null;
        return { data: r, error: r ? null : { code: 'PGRST116', message: 'Not found' } };
      }
      return { data: results, error: null };
    }

    if (this._type === 'update' && this._updateData) {
      const where = this._buildWhere();
      let rows = localDb.prepare(`SELECT * FROM "${table}" ${where.sql}`).all(...sva(where.vals));
      const keys = Object.keys(this._updateData);
      if (keys.length > 0) {
        const setClause = keys.map(k => `"${k}" = ?`).join(', ');
        const vals = sva(keys.map(k => this._updateData[k]));
        localDb.prepare(`UPDATE "${table}" SET ${setClause} ${where.sql}`.trim()).run(...vals, ...sva(where.vals));
        rows = localDb.prepare(`SELECT * FROM "${table}" ${where.sql}`).all(...sva(where.vals));
      }
      if (this._singleFlag) {
        const r = rows[0] || null;
        return { data: r, error: r ? null : { code: 'PGRST116', message: 'Not found' } };
      }
      return { data: rows, error: null };
    }

    if (this._type === 'delete') {
      const where = this._buildWhere();
      localDb.prepare(`DELETE FROM "${table}" ${where.sql}`.trim()).run(...sva(where.vals));
      return { data: null, error: null };
    }

    // SELECT
    const where = this._buildWhere();
    const cols = this._cols === '*' ? '*' : this._cols.split(',').map(c => c.trim()).map(c => `"${c}"`).join(', ');
    let sql = `SELECT ${cols} FROM "${table}" ${where.sql}`;
    if (this._orderCol) sql += ` ORDER BY "${this._orderCol}" ${this._orderAsc ? 'ASC' : 'DESC'}`;
    if (this._rangeFrom != null) sql += ` LIMIT ${this._rangeTo - this._rangeFrom + 1} OFFSET ${this._rangeFrom}`;
    if (this._limitN != null && this._rangeFrom == null) sql += ` LIMIT ${this._limitN}`;

    let rows = localDb.prepare(sql).all(...sva(where.vals));

    if (this._orExpr) {
      const parts = this._orExpr.split(',');
      rows = rows.filter(r => {
        return parts.some(p => {
          const m = p.match(/(\w+)\.ilike\.(.+)/);
          if (m) {
            const [, col, pattern] = m;
            const clean = pattern.replace(/%/g, '').toLowerCase();
            return String(r[col] || '').toLowerCase().includes(clean);
          }
          return false;
        });
      });
    }

    if (this._headFlag) {
      const count = rows.length;
      rows = [];
      if (this._countFlag) {
        return { data: null, error: null, count };
      }
    }

    if (this._countFlag) {
      return { data: rows, error: null, count: rows.length };
    }

    if (this._singleFlag) {
      const r = rows[0] || null;
      return { data: r, error: r ? null : { code: 'PGRST116', message: 'Not found' } };
    }

    return { data: rows, error: null, count: rows.length };
  }

  _buildWhere() {
    if (this._filters.length === 0) return { sql: '', vals: [] };
    const clauses = [];
    const vals = [];
    for (const f of this._filters) {
      if (f.op === 'IN') {
        const placeholders = f.val.map(() => '?').join(', ');
        clauses.push(`"${f.col}" IN (${placeholders})`);
        vals.push(...f.val);
      } else {
        clauses.push(`"${f.col}" ${f.op} ?`);
        vals.push(f.val);
      }
    }
    return { sql: 'WHERE ' + clauses.join(' AND '), vals };
  }
}

const supabase = { from: (table) => new QueryBuilder(table) };

module.exports = { supabase, db: () => getDb() };
