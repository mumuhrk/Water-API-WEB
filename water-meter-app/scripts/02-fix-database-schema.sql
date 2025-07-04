-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS meter_readings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table first
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create buildings table
CREATE TABLE buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table with proper foreign key
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meter_readings table with proper foreign keys
CREATE TABLE meter_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  meter_value DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their own buildings" ON buildings;
DROP POLICY IF EXISTS "Users can only see their own rooms" ON rooms;
DROP POLICY IF EXISTS "Users can only see their own meter readings" ON meter_readings;
DROP POLICY IF EXISTS "Users can only see their own profile" ON user_profiles;

-- Create RLS policies
CREATE POLICY "Users can only see their own buildings" ON buildings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own rooms" ON rooms
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own meter readings" ON meter_readings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_user_id ON rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_user_id ON meter_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_building_id ON meter_readings(building_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_room_id ON meter_readings(room_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_created_at ON meter_readings(created_at DESC);
