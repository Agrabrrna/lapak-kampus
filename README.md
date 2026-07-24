# KampusLapak

Marketplace berbasis web khusus mahasiswa untuk jual beli buku, laptop, alat praktikum, dan kebutuhan kampus.

## Tech Stack
- **Node.js** & **Express.js** (Backend)
- **Prisma** (ORM) & **PostgreSQL** (Database)
- **Bootstrap 5** (Styling & Responsive UI)
- **Midtrans** (Payment Gateway)
- **Cloudinary** (Media Storage)

## Fitur Utama
- **Multi-Role User:** Sistem autentikasi dengan peran Admin, Penjual, dan Pembeli.
- **Katalog Produk:** Manajemen produk lengkap dengan pencarian, filter kategori, dan kondisi barang (Baru/Bekas).
- **Keranjang & Checkout Terintegrasi:** Dukungan fitur "Masukkan Keranjang" dan "Beli Langsung", serta pembayaran otomatis menggunakan Midtrans.
- **Chat Real-Time:** Ruang obrolan interaktif antara pembeli dan penjual, dilengkapi *badge* notifikasi pesan belum terbaca yang *update* otomatis.
- **Sistem Notifikasi:** Pemberitahuan otomatis untuk status pesanan, pesan baru, dll., dengan sistem *mark-as-read*.
- **Ulasan & Penilaian (Mendukung Media):** 
  - Pembeli dapat memberikan *rating* dan mengunggah hingga 3 foto/video (maks 20MB) tanpa harus menyelesaikan pesanan terlebih dahulu.
  - Penjual dapat membalas ulasan pembeli dengan komentar dan juga foto/video balasan.
- **Tema Dinamis:** Dukungan penuh untuk transisi *Dark Mode* dan *Light Mode* (Tema Gelap/Terang).

## Instalasi Lokal

1. Clone repository ini:
   ```bash
   git clone <URL_REPOSITORY>
   cd kampuslapak
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Copy `.env.example` menjadi `.env` lalu sesuaikan konfigurasi database Anda.
   ```bash
   cp .env.example .env
   ```

4. Jalankan migrasi database:
   ```bash
   npx prisma migrate dev
   ```

5. Jalankan aplikasi:
   ```bash
   npm run dev
   # atau
   npm start
   ```
