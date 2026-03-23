# Note_Key 🔑 - Smart UMKM Management System

Note_Key adalah solusi manajemen transaksi dan inventaris otomatis berbasis **Google Cloud Ecosystem**. Proyek ini dirancang untuk membantu pemilik UMKM mengelola data bisnis secara real-time dengan keamanan penuh di Google Drive pribadi mereka.

## ✨ Fitur Utama
- **Automated Database:** Sinkronisasi otomatis antara UI Web dan Google Sheets.
- **Smart Inventory:** Pemantauan stok otomatis dengan sistem peringatan dini.
- **Data Analytics:** Visualisasi performa penjualan harian dan mingguan.
- **Proactive Security:** Menggunakan Google LockService untuk mencegah duplikasi data.

## 🛠️ Prasyarat (Setup)
Agar aplikasi ini berjalan di akun Google Anda, ikuti langkah berikut:

1. **Siapkan Spreadsheet Template:**
   - Buat Google Spreadsheet baru.
   - Buat 4 Sheet di dalamnya dengan nama: `Profil`, `Master_Barang`, `Transaksi_Harian`, dan `Notifikasi`.
   - Ambil **ID Spreadsheet** tersebut (ada di URL antara `/d/` dan `/edit`).

2. **Pengaturan Google Apps Script:**
   - Buka [Google Apps Script](https://script.google.com/).
   - Buat proyek baru dan salin kode dari `Kode.gs` dan `Index.html` di repositori ini.
   - Ganti `TEMPLATE_ID` dan `CENTRAL_DB_ID` dengan ID Spreadsheet yang Anda buat tadi.

3. **Deploy:**
   - Klik **Deploy** > **New Deployment**.
   - Pilih jenis **Web App**.
   - Set "Execute as" ke **User accessing the web app**.
   - Set "Who has access" ke **Anyone with Google Account**.

## 💻 Tech Stack
- **Language:** JavaScript (Google Apps Script)
- **Frontend:** HTML5, CSS3, JavaScript (SweetAlert2, Chart.js)
- **Database:** Google Sheets API
- **Cloud Storage:** Google Drive API

## 📧 Kontak & Portofolio
- **LinkedIn:** https://www.linkedin.com/in/ryan-sofiyulloh/

---
*Proyek ini dikembangkan sebagai bagian dari portofolio pengembangan solusi berbasis Data & AI.*
