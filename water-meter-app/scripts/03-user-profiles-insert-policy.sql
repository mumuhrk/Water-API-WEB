-- 👇 อนุญาตให้ผู้ใช้สร้างโปรไฟล์ของตัวเอง
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

CREATE POLICY "Users can insert their own profile"
ON user_profiles
FOR INSERT
WITH CHECK ( auth.uid() = id );
