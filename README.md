# 🚨 CheckDan TH - ระบบตรวจสอบและแจ้งเตือนด่านตรวจจราจรอัจฉริยะ (GitHub Pages Ready)

เว็บแอพพลิเคชันแบบตอบสนอง (Responsive Web App) สไตล์ **Cyber Dark Radar & Glassmorphism** สำหรับตรวจสอบและรายงานจุดตรวจด่านจราจร ด่านเป่าแอลกอฮอล์ ด่านตรวจควันดำ และกล้องตรวจจับความเร็วแบบเรียลไทม์ พร้อมเชื่อมต่อฐานข้อมูลผ่าน GitHub และรองรับการเปิดใช้งานบน **GitHub Pages ฟรี 100%** ทันทีโดยไม่ต้องมีเซิร์ฟเวอร์หลังบ้าน

---

## ✨ ฟีเจอร์เด่น (Key Features)

1. **แผนที่ Interactive อัจฉริยะ (Leaflet.js + OpenStreetMap)**
   - สลับโหมดแผนที่ได้ 3 สไตล์: **โหมดมืด (Cyber Dark)**, **โหมดถนน (Street View)** และ **ภาพถ่ายดาวเทียม (Satellite)**
   - หมุดจุดตรวจ (Custom Marker Pins) แยกตามประเภทพร้อมเอฟเฟกต์ไฟกระพริบ (Pulsing Radar Rings)
   - ปักหมุดพิกัด GPS ปัจจุบันของผู้ใช้งาน พร้อมวงเรดาร์ตรวจจับ

2. **ระบบเรดาร์เตือนด่านระยะประชิด (Proximity Warning HUD & Web Audio API)**
   - คำนวณระยะห่างระหว่างตำแหน่งปัจจุบันกับด่านที่ใกล้ที่สุดแบบเรียลไทม์ (สูตร Haversine)
   - ป้ายเตือนฉุกเฉิน (HUD Alert Banner) จะเลื่อนลงมาอัตโนมัติเมื่อเข้าใกล้ด่านในระยะที่กำหนด (1.5 กม. / 3.0 กม. / 5.0 กม.)
   - เสียงสังเคราะห์เสียงเตือนเรดาร์ (Sonar Ping & Siren Warning) ทำงานบน Web Audio API ในตัว ไม่ต้องโหลดไฟล์เสียงภายนอก

3. **พลังชุมชน & ระบบโหวตยืนยันสถานะด่าน (Community Crowd-Sourced Verification)**
   - สมาชิกผู้ใช้ทางสามารถกดโหวตยืนยัน: **"👍 ด่านยังอยู่"** หรือ **"👎 ย้าย/เคลียร์แล้ว"**
   - เมื่อมีผู้รายงานเคลียร์แล้ว ระบบจะปรับสถานะเป็น `เคลียร์แล้ว` โดยอัตโนมัติ
   - ลิงก์ตรงเปิดนำทางผ่าน Google Maps ได้ใน 1 คลิก

4. **ระบบแจ้งพิกัดด่านใหม่ (Report Checkpoint)**
   - ผู้ใช้สามารถกดปุ่ม **"+ แจ้งจุดตรวจด่าน"** หรือคลิกบนแผนที่ตรงจุดที่พบเห็นด่าน
   - มีฟอร์มระบุประเภทด่าน, ถนน, ทิศทาง (ขาเข้า/ขาออก), และรายละเอียดสภาพจราจร

5. **เชื่อมต่อและซิงค์ข้อมูลกับ GitHub (GitHub Integration)**
   - จัดเก็บข้อมูลด่านในรูปแบบไฟล์ JSON มาตรฐาน (`data/checkpoints.json`)
   - ปุ่ม **ดาวน์โหลดไฟล์ checkpoints.json** เพื่อนำไปอัปเดตลง Repository
   - ปุ่ม **GitHub Sync** ดึงข้อมูลสดผ่าน GitHub Raw URL
   - รองรับการ Commit ข้อมูลขึ้น GitHub Repo โดยตรงผ่าน GitHub REST API

---

## 🚀 วิธีเปิดใช้งานบนเครื่องของคุณ (Local Running)

โปรเจกต์นี้เขียนด้วยมาตรฐาน HTML5, Vanilla CSS และ Modern JavaScript จึงสามารถรันได้ทันทีโดยไม่ต้องติดตั้ง Node.js หรือ build step ใดๆ

### วิธีที่ 1: รันด้วย Python Web Server (แนะนำ)
เปิด PowerShell หรือ Terminal ในโฟลเดอร์นี้ แล้วพิมพ์:
```powershell
python -m http.server 8000
```
จากนั้นเปิดเบราว์เซอร์ไปที่: `http://localhost:8000`

### วิธีที่ 2: ดับเบิลคลิกเปิดไฟล์ `index.html`
สามารถดับเบิลคลิกเปิดไฟล์ `index.html` บน Chrome, Edge หรือ Safari ได้ทันที ตัวแอพมีระบบ Fallback ในตัวรองรับการทำงานแบบ Offline

---

## 🌐 วิธีนำขึ้นโฮสต์บน GitHub Pages ฟรี 100%

คุณสามารถนำเว็บแอพนี้ขึ้นออนไลน์ให้เพื่อนๆ หรือทุกคนเข้าใช้งานผ่านอินเทอร์เน็ตได้ฟรีผ่าน GitHub Pages ตามขั้นตอนง่ายๆ ดังนี้:

### ขั้นตอนการสร้างบน GitHub:
1. เข้าไปที่ [GitHub.com](https://github.com/) และล็อกอินเข้าสู่ระบบ
2. กดปุ่ม **New Repository** (หรือเครื่องหมาย `+` ด้านบนขวา &rarr; **New repository**)
3. ตั้งชื่อ Repository เช่น `checkdan-th` หรือ `traffic-checkpoint`
4. เลือกเป็น **Public**
5. กดปุ่ม **Create repository**

### การอัปโหลดไฟล์:
- หากใช้หน้าเว็บ GitHub:
  - ในหน้า Repository ให้กด **"uploading an existing file"**
  - ลากไฟล์และโฟลเดอร์ทั้งหมดในโปรเจกต์นี้ (`index.html`, `css/`, `js/`, `data/`, `.github/`, `README.md`) ไปวางบนหน้าเว็บ GitHub
  - เลื่อนลงมากดปุ่มสีเขียว **Commit changes**

### การเปิดใช้งาน GitHub Pages:
1. ในหน้า Repository ของคุณ ให้คลิกที่แท็บ **Settings** (รูปฟันเฟืองด้านบน)
2. เมนูด้านซ้าย เลือก **Pages** (อยู่ในหมวด Code and automation)
3. ในหัวข้อ **Build and deployment**:
   - Source: เลือก **Deploy from a branch**
   - Branch: เลือก **main** (หรือ `master`) และโฟลเดอร์เป็น `/(root)`
   - กดปุ่ม **Save**
4. รอระบบประมวลผลประมาณ 1-2 นาที คุณจะได้รับ URL เว็บไซต์ เช่น:
   ```text
   https://<your-username>.github.io/checkdan-th/
   ```
5. สามารถนำลิงก์นี้ไปเปิดบนสมาร์ตโฟนหรือแชร์ให้ผู้อื่นใช้งานได้ทันที!

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
36.checkpoint/
├── index.html                   # โค้ดโครงสร้างหน้าเว็บหลัก Responsive Web App
├── css/
│   └── style.css                # ดีไซน์สไตล์ Cyber Dark Glassmorphism, Animation, HUD
├── js/
│   ├── app.js                   # ตัวจัดการหลัก (State, Filter, Search, Proximity Radar)
│   ├── map.js                   # จัดการแผนที่ Leaflet, Custom Markers, Polling & Geolocation
│   ├── audio.js                 # ระบบสร้างเสียงเตือนเรดาร์ผ่าน Web Audio API
│   ├── github-sync.js           # ระบบเชื่อมต่อข้อมูล GitHub & LocalStorage
│   └── mock-data.js             # ชุดข้อมูลสำรองสำหรับรันแบบออฟไลน์
├── data/
│   └── checkpoints.json         # ฐานข้อมูลจุดตรวจด่านในรูปแบบ JSON
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions ช่วย Deploy อัตโนมัติเมื่อ push code
├── .gitignore                   # ตัวกรองไฟล์ที่ไม่จำเป็น
└── README.md                    # คู่มือการใช้งานและติดตั้ง
```

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend Core**: Semantic HTML5, Vanilla JavaScript (ES6+ Classes)
- **Styling**: Vanilla CSS3 (Custom Properties, Glassmorphism, Strobe Animations)
- **Mapping Engine**: [Leaflet.js 1.9.4](https://leafletjs.com/) + OpenStreetMap / CartoDB / Esri Satellite
- **Audio Synthesis**: Web Audio API (Sine/Triangle Oscillator Beeps)
- **Data & Hosting**: GitHub Pages & GitHub Raw API / LocalStorage
- **Typography & Icons**: Google Fonts (Prompt, Sarabun) & Font Awesome 6
