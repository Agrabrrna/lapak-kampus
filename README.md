# KampusLapak

Marketplace berbasis web khusus mahasiswa untuk jual beli buku, laptop, alat praktikum, dan kebutuhan kampus.

## Tech Stack
- **Node.js**
- **Express.js**
- **Prisma** (ORM)
- **PostgreSQL** (Database)
- **Bootstrap 5** (Styling)

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
