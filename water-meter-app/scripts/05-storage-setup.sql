-- สร้าง storage bucket สำหรับรูปภาพมิเตอร์
INSERT INTO storage.buckets (id, name, public)
VALUES ('meter-images', 'meter-images', true)
ON CONFLICT (id) DO NOTHING;

-- อนุญาตให้ผู้ใช้อัพโหลดรูปของตัวเอง
CREATE POLICY "Users can upload their own images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'meter-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- อนุญาตให้ผู้ใช้ดูรูปของตัวเอง
CREATE POLICY "Users can view their own images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'meter-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- อนุญาตให้ผู้ใช้ลบรูปของตัวเอง
CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'meter-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
