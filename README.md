# ระบบอ่านมิเตอร์น้ำด้วย AI (Water Meter Reading System)

เว็บแอปพลิเคชันสำหรับ **ถ่ายรูปมิเตอร์น้ำแล้วให้ AI อ่านค่าตัวเลขให้อัตโนมัติ** แทนการจดด้วยมือ
เหมาะกับงานเก็บค่าน้ำของหอพัก/อพาร์ตเมนต์ที่มีหลายอาคารและหลายห้อง

> 🔗 เว็บใช้งานจริง: https://water-api-web.vercel.app/

เป็น Project ระดับปริญญาตรี และต่อยอดเป็นงานวิจัย *"Water meter reading system with Deep learning"*

---

## ✨ ฟีเจอร์หลัก

- 📷 **อ่านค่ามิเตอร์อัตโนมัติ** — อัปโหลดรูปมิเตอร์ ระบบส่งภาพไปยัง AI API แล้วได้ค่าตัวเลขกลับมา
- 🏢 **จัดการอาคารและห้อง** — เพิ่ม/ลบ/แก้ไข อาคาร (buildings) และห้อง (rooms)
- 📊 **ประวัติการอ่านค่า** — ดูค่ามิเตอร์ย้อนหลังพร้อมรูปภาพต้นฉบับ
- 🔐 **ระบบสมาชิก** — สมัคร / เข้าสู่ระบบ / โปรไฟล์ ด้วย Supabase Auth (ข้อมูลแยกตามผู้ใช้ด้วย Row Level Security)
- 🌗 **Dark / Light mode**
- ✍️ **กรอกค่าด้วยตนเอง** — กรณี AI อ่านไม่สำเร็จหรือ API timeout รูปจะถูกบันทึกไว้ให้กรอกค่าเองภายหลัง

---

## 🛠️ เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|------|-----------|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| UI | Tailwind CSS + shadcn/ui (Radix UI) + lucide-react |
| Database / Auth / Storage | Supabase (PostgreSQL) |
| AI Inference | External API บน Google Cloud Run |
| Deploy | Vercel |

---

## 📁 โครงสร้างโปรเจกต์

```
water-meter-app/
├── app/
│   ├── api/                  # API Routes (server-side)
│   │   ├── buildings/        # CRUD อาคาร
│   │   ├── rooms/            # CRUD ห้อง
│   │   ├── read-meter/       # ส่งภาพไป AI แบบ synchronous
│   │   ├── submit-task/      # ส่ง task ไป AI แบบ async
│   │   ├── task-status/      # เช็คสถานะ task
│   │   └── save-reading/     # บันทึกค่ามิเตอร์
│   ├── auth/                 # login / register / callback
│   ├── dashboard/            # หน้าอัปโหลดรูป
│   ├── history/              # หน้าประวัติ
│   ├── manage/               # หน้าจัดการอาคาร/ห้อง
│   └── profile/              # หน้าโปรไฟล์
├── components/               # UI components
├── lib/supabase/             # client / server / types ของ Supabase
├── middleware.ts             # ตรวจสอบ session
└── scripts/                  # SQL สำหรับสร้างตารางและ policy
```

### ตารางฐานข้อมูล (Supabase)

- `buildings` — อาคาร
- `rooms` — ห้อง (ผูกกับ building)
- `meter_readings` — ค่ามิเตอร์ + ลิงก์รูป + รายละเอียดตัวเลข
- `user_profiles` — โปรไฟล์ผู้ใช้

ทุกตารางเปิด **Row Level Security** ให้ผู้ใช้เห็นเฉพาะข้อมูลของตัวเองเท่านั้น

---

## 🚀 วิธีติดตั้งและรัน

```bash
cd water-meter-app
pnpm install        # หรือ npm install
pnpm dev            # รันที่ http://localhost:3000
```

### ตั้งค่า Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
WATER_METER_API_BASE=https://water-meter-api-732977633142.asia-southeast1.run.app
```

### ตั้งค่าฐานข้อมูล

รันไฟล์ SQL ในโฟลเดอร์ `scripts/` ตามลำดับ (`01` → `06`) บน Supabase SQL Editor
เพื่อสร้างตาราง, RLS policy, trigger สร้างโปรไฟล์อัตโนมัติ และ storage bucket (`meter-images`)

---

## 🔄 การทำงานของระบบอ่านมิเตอร์

```
ผู้ใช้อัปโหลดรูป
   → บันทึกรูปลง Supabase Storage
   → ส่งภาพไป AI API (Cloud Run)
   → ได้ค่าตัวเลขกลับ → บันทึกลง meter_readings
   → ถ้า timeout / อ่านไม่ได้ → บันทึก placeholder ให้กรอกค่าเองภายหลัง
```

มี 2 โหมดการเรียก AI:
- **Synchronous** (`/api/read-meter`) — รอผลทันที (timeout 60 วินาที)
- **Asynchronous** (`/api/submit-task` + `/api/task-status`) — ส่ง task แล้ว poll สถานะภายหลัง

---

## 📝 หมายเหตุ

โปรเจกต์นี้เป็นเฉพาะส่วน **Web Application** เท่านั้น ส่วนโมเดล AI ที่อ่านตัวเลข
ถูก deploy แยกเป็น service บน Google Cloud Run
