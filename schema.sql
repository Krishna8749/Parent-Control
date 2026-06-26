-- ============================================
-- PARENTAL CONTROL - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Users (Parents)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'parent' CHECK (role IN ('parent','admin')),
  password_changed_at TIMESTAMPTZ,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  notification_preferences JSONB DEFAULT '{"sms":true,"calls":true,"location":true,"apps":true,"alerts":true}',
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free','basic','premium')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active','expired','cancelled')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Child Devices
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_model TEXT,
  os_version TEXT,
  android_version TEXT,
  device_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  sim_number TEXT,
  sim_carrier TEXT,
  is_online BOOLEAN DEFAULT false,
  battery_level INT DEFAULT 100,
  battery_charging BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  location_updated_at TIMESTAMPTZ,
  installation_id TEXT,
  app_version TEXT,
  icon_hidden BOOLEAN DEFAULT false,
  camera_enabled BOOLEAN DEFAULT true,
  root_access BOOLEAN DEFAULT false,
  sms_alert_enabled BOOLEAN DEFAULT false,
  sms_alert_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SMS Messages
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('incoming','outgoing')),
  sender TEXT,
  receiver TEXT,
  body TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MMS Messages
CREATE TABLE IF NOT EXISTS mms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('incoming','outgoing')),
  sender TEXT,
  receiver TEXT,
  body TEXT,
  media_urls TEXT[],
  media_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Call Logs
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('incoming','outgoing','missed')),
  phone_number TEXT,
  contact_name TEXT,
  duration INT DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  address TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Geofence Zones
CREATE TABLE IF NOT EXISTS geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INT DEFAULT 100,
  zone_type TEXT DEFAULT 'safe' CHECK (zone_type IN ('safe','restricted')),
  is_active BOOLEAN DEFAULT true,
  notify_on_enter BOOLEAN DEFAULT true,
  notify_on_exit BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Geofence Alerts
CREATE TABLE IF NOT EXISTS geofence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES geofence_zones(id),
  event_type TEXT CHECK (event_type IN ('enter','exit')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Installed Apps
CREATE TABLE IF NOT EXISTS installed_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  app_name TEXT,
  version_name TEXT,
  version_code INT,
  size_bytes BIGINT,
  is_system_app BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  install_date TIMESTAMPTZ,
  last_used TIMESTAMPTZ,
  usage_minutes INT DEFAULT 0,
  last_synced TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, package_name)
);

-- App Usage Statistics
CREATE TABLE IF NOT EXISTS app_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  usage_date DATE NOT NULL,
  usage_minutes INT DEFAULT 0,
  open_count INT DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, package_name, usage_date)
);

-- Screen Time Stats
CREATE TABLE IF NOT EXISTS screen_time_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  total_minutes INT DEFAULT 0,
  unlock_count INT DEFAULT 0,
  first_use TIMESTAMPTZ,
  last_use TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, stat_date)
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  photo_url TEXT,
  is_blocked BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, name, phone_number)
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  is_all_day BOOLEAN DEFAULT false,
  reminder_minutes INT,
  recurrence TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Browser History
CREATE TABLE IF NOT EXISTS browser_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  visit_count INT DEFAULT 1,
  is_bookmarked BOOLEAN DEFAULT false,
  last_visited TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Screenshots
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  width INT,
  height INT,
  file_size BIGINT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pictures (from device)
CREATE TABLE IF NOT EXISTS pictures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  width INT,
  height INT,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Messages (WhatsApp, Facebook, etc.)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  conversation_id TEXT,
  contact_name TEXT,
  contact_avatar TEXT,
  sender TEXT,
  receiver TEXT,
  message TEXT,
  direction TEXT CHECK (direction IN ('incoming','outgoing')),
  has_media BOOLEAN DEFAULT false,
  media_url TEXT,
  media_type TEXT,
  read_status BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Remote Commands
CREATE TABLE IF NOT EXISTS remote_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  params JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','executing','executed','failed','timeout')),
  result JSONB,
  error_message TEXT,
  issued_by UUID REFERENCES users(id),
  timeout INT DEFAULT 30,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);

-- SIM Info
CREATE TABLE IF NOT EXISTS sim_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  sim_slot INT,
  phone_number TEXT,
  carrier_name TEXT,
  network_type TEXT,
  country_code TEXT,
  imsi TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Device Settings
CREATE TABLE IF NOT EXISTS device_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE UNIQUE,
  camera_enabled BOOLEAN DEFAULT true,
  microphone_enabled BOOLEAN DEFAULT true,
  location_enabled BOOLEAN DEFAULT true,
  bluetooth_enabled BOOLEAN DEFAULT true,
  wifi_enabled BOOLEAN DEFAULT true,
  mobile_data_enabled BOOLEAN DEFAULT true,
  icon_hidden BOOLEAN DEFAULT false,
  usb_debugging_enabled BOOLEAN DEFAULT false,
  install_unknown_apps BOOLEAN DEFAULT false,
  screen_capture_enabled BOOLEAN DEFAULT true,
  notification_access BOOLEAN DEFAULT false,
  accessibility_enabled BOOLEAN DEFAULT false,
  device_admin_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Schedule Restrictions
CREATE TABLE IF NOT EXISTS schedule_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  restriction_type TEXT CHECK (restriction_type IN ('screen_time','app_block','internet','calls','sms')),
  target_packages TEXT[],
  internet_whitelist TEXT[],
  internet_blacklist TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blocked Numbers
CREATE TABLE IF NOT EXISTS blocked_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  reason TEXT,
  block_calls BOOLEAN DEFAULT true,
  block_sms BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SMS Commands
CREATE TABLE IF NOT EXISTS sms_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  command_text TEXT NOT NULL,
  target_number TEXT,
  response TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','executed','failed')),
  issued_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','danger','critical')),
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications (push)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- File Explorer
CREATE TABLE IF NOT EXISTS device_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  is_directory BOOLEAN DEFAULT false,
  parent_path TEXT,
  file_url TEXT,
  permissions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Live Sessions
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  session_type TEXT CHECK (session_type IN ('video','audio','screen','voice_call','video_call')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','ended','failed')),
  room_id TEXT,
  camera_facing TEXT DEFAULT 'rear' CHECK (camera_facing IN ('front','rear')),
  audio_enabled BOOLEAN DEFAULT true,
  record_enabled BOOLEAN DEFAULT false,
  max_duration INT DEFAULT 60,
  quality TEXT DEFAULT 'medium' CHECK (quality IN ('low','medium','high')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WebRTC Signaling
CREATE TABLE IF NOT EXISTS webrtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer','answer','ice-candidate')),
  signal_data JSONB NOT NULL,
  from_device BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily Summary
CREATE TABLE IF NOT EXISTS daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  total_screen_time INT DEFAULT 0,
  total_sms_count INT DEFAULT 0,
  total_call_count INT DEFAULT 0,
  total_pictures INT DEFAULT 0,
  total_app_opens INT DEFAULT 0,
  top_app TEXT,
  top_app_minutes INT DEFAULT 0,
  locations_visited INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, summary_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_sms_device_id ON sms_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_sms_timestamp ON sms_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_mms_device_id ON mms_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_calls_device_id ON call_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON call_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_locations_device_id ON locations(device_id);
CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_apps_device_id ON installed_apps(device_id);
CREATE INDEX IF NOT EXISTS idx_chat_device_id ON chat_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_chat_app ON chat_messages(app_name);
CREATE INDEX IF NOT EXISTS idx_commands_device_id ON remote_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON remote_commands(status);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_browser_device_id ON browser_history(device_id);
CREATE INDEX IF NOT EXISTS idx_files_device_id ON device_files(device_id);
CREATE INDEX IF NOT EXISTS idx_files_parent ON device_files(device_id, parent_path);
CREATE INDEX IF NOT EXISTS idx_geofence_device_id ON geofence_zones(device_id);
CREATE INDEX IF NOT EXISTS idx_sms_commands_device_id ON sms_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_daily_summary_device ON daily_summary(device_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_screen_time_device ON screen_time_stats(device_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_webrtc_session ON webrtc_signals(session_id);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE installed_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pictures ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

-- Service role policies (allow all operations for backend)
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'sms_messages','mms_messages','call_logs','locations','geofence_zones','geofence_alerts',
    'installed_apps','app_usage_stats','screen_time_stats','contacts','calendar_events',
    'browser_history','screenshots','pictures','chat_messages','remote_commands',
    'sim_info','device_settings','schedule_restrictions','blocked_numbers','sms_commands',
    'alerts','device_files','live_sessions','webrtc_signals','daily_summary'
  ]) LOOP
    EXECUTE format('CREATE POLICY "Service all %I" ON %I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- User policies
CREATE POLICY "Users view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Devices parent access" ON devices FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Notifications user access" ON notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
