# ☕ Coffee POS - Enterprise-Grade Point of Sales

Selamat datang di **Coffee POS**, sistem aplikasi kasir cerdas dan responsif yang dirancang khusus untuk manajemen operasional kedai kopi kelas atas. Aplikasi ini mengusung pendekatan *"Modern SaaS"* (Software as a Service) dengan antarmuka yang sangat elegan, performa tinggi, dan ketat terhadap keamanan pencatatan keuangan.

---

## ✨ Fitur Utama (Features)

Aplikasi ini tidak sekadar alat hitung transaksi, melainkan pengelola ekosistem kasir yang utuh.

### 1. Manajemen Sesi Kasir (*Shift Management*)
- **Buka Laci (Open Shift)**: Setiap kasir diwajibkan untuk memasukkan modal fisik awal (Uang Laci) sebelum dapat melakukan transaksi apa pun.
- **Deteksi Sesi Gantung (*Smart Resume*)**: Jika aplikasi tertutup tidak sengaja atau kasir melakukan *logout* di tengah shift, sistem akan mendeteksi shift yang masih berjalan saat kasir kembali masuk (Pop-Up "Lanjutkan Shift").
- **Tutup Kasir (Close Shift)**: Proses rekonsiliasi yang mengharuskan kasir menghitung fisik uang. Sistem secara otomatis akan menampilkan selisih (*Difference*) antara hitungan mesin vs fisik kasir secara riil.

### 2. Kitchen Display System (KDS) Barista
- **Real-Time Polling**: Layar khusus di `/barista` yang otomatis menyinkronkan data pesanan masuk setiap 4 detik dari Kasir menggunakan arsitektur *local polling* (menghindari kompleksitas *WebSockets* pada perangkat tablet murah).
- **Batch Summary Mode**: Fitur perangkum ("Total Racikan") yang menghitung secara cerdas jumlah total item sejenis (misal: 5 Iced Latte sekaligus) untuk mempercepat proses pembuatan minuman (*batching*) saat *rush hour*.
- **Live Stopwatch (SLA)**: Fitur pengukur waktu (*timer*) berjalan otomatis sejak pesanan dibayar. Membantu barista menjaga Standar Mutu Pelayanan (SLA) tanpa penumpukan antrean.
- **Touchscreen Optimized UX**: Desain KDS dibuat khusus untuk perangkat tablet (*touch-first*) dengan tombol aksi besar (48x48px minimum target sentuh) dan interaksi kotak centang (*checkbox*) fisik yang mulus.

### 3. Hak Akses Berbasis Peran (*Role-Based Access*)
Sistem memiliki sekat yang jelas antara Pemilik (Admin) dan Karyawan (Kasir):
- **Admin**: Dapat *login* dan mengabaikan pembukaan shift untuk langsung meluncur ke **Dashboard Admin** (Melihat laporan, mengatur menu, dll). Admin juga sewaktu-waktu dapat membuka shift untuk turun tangan langsung menjadi kasir.
- **Kasir**: Terkunci murni pada layar terminal Point of Sales dan wajib mengelola laci uang tanpa akses ke fitur manajerial belakang layar.

### 4. Transaksi & Point of Sales (Terminal)
- **Menu Dinamis**: Pengelompokan kategori yang responsif (Kopi, Non-Kopi, Makanan) dengan visual kelas *Enterprise SaaS* (desain minimalis nan bersih tanpa *AI slop/generic glowing effects*).
- **Multi-Pembayaran**: Mendukung pembayaran **TUNAI** (dilengkapi kalkulator kembalian instan) dan integrasi **QRIS** (Dompet Digital/Transfer Bank).
- **Cetak Struk (*Thermal Print Ready*)**: Dilengkapi format cetak khusus (*Print Stylesheet*) yang langsung disesuaikan dengan ukuran standar mesin pencetak struk kasir termal kelas industri (ukuran 80mm).
- **Sequential Transaction Numbering**: Mekanisme penomoran struk kebal-*race-condition* berbasis *Sequential DB Query* harian (mengatasi *bug Prisma Unique Constraint* pada *High-Concurrency*).

---

## 🛠 Teknologi yang Digunakan (*Tech Stack*)

Aplikasi ini dibangun menggunakan tumpukan teknologi web paling modern (Sistem 2026):

*   **Framework Utama**: Next.js 14+ (App Router, Server Components).
*   **Otentikasi**: Better Auth (Cepat, Aman, Sistem Kriptografi Modern).
*   **Database ORM**: Prisma (Aman dari injeksi tipe data, stabil).
*   **Database Mesin**: PostgreSQL (Handal untuk pencatatan transaksi uang yang intens).
*   **Styling (UI/UX)**: Tailwind CSS (Menggunakan prinsip *Glassmorphism* dan *Premium Tech Aesthetics* dengan paduan warna dominan *Indigo/Blue*).
*   **State Management**: Zustand (Cepat, ringan, untuk manajemen keranjang belanja kasir).

---

## 📖 Panduan Penggunaan (*Quick Start Guide*)

### Kredensial Bawaan (Default Login)
Sistem memiliki dua akun bawaan yang bisa digunakan untuk uji coba:
1. **Admin / Pemilik Kedai**
   - **Email:** `admin@coffee.com`
   - **Password:** `password123`
2. **Kasir**
   - **Email:** `kasir@coffee.com`
   - **Password:** `password123`

> **Catatan Pemilik**: Anda bisa mengatur *database* ulang atau menanam kembali akun awal dengan mengakses *endpoint* API rahasia: `http://localhost:3000/api/setup-auth`.

### Alur Operasional Harian (Topologi Kedai)

Idealnya sistem ini dijalankan pada satu **Local Server (Mini PC / Raspberry Pi / Laptop Induk)** di dalam jaringan LAN (WiFi) kedai lokal. 

1. **Buka Kedai**: Kasir datang dan *login* menggunakan tablet/PC di depan meja (*Front of House*). Sistem otomatis memunculkan *pop-up* **Buka Shift**. Kasir menghitung dan memasukkan jumlah modal awal fisik di laci (misal: Rp 500.000,-).
2. **Koneksi Barista**: Tablet kedua di area dapur (*Back of House*) dinyalakan, *login* sebagai Kasir, lalu menekan tombol **"☕ Layar Barista"** (di kiri bawah menu). Tablet Barista ini akan terus menyala (menyinkronkan data pesanan secara pasif).
3. **Transaksi & Alur Pemesanan**: 
   - Kasir melayani pelanggan, memproses pembayaran (Tunai/QRIS), dan mencetak struk.
   - Detik itu juga, pesanan muncul di Layar Barista.
   - Barista meracik minuman dengan bantuan *Batch Summary Mode* jika sedang ramai. Setelah selesai, Barista menekan "Selesai & Sajikan", menghilangkan pesanan dari antrean.
4. **Tutup Kedai**: Kasir kembali ke menu utama, memilih **Tutup Shift**, dan menginput jumlah seluruh fisik uang di laci. Sistem akan menghitung selisih dan mencetak laporan *End of Day*.
5. **Pengecekan Admin**: Owner dapat masuk secara *remote* dari rumah (bila server menggunakan *Tunneling* seperti Ngrok/Cloudflare Tunnels) untuk melihat laporan pendapatan harian di *Dashboard Admin*.

---

## 🛡 Kebijakan Sistem (Untuk Pemilik Kedai)
*   **Keamanan Data**: Dilarang memberikan akun *Admin* kepada kasir.
*   **Sistem Tidak Terkunci (Offline/Online)**: Selama peramban (*browser*) masih memori, keranjang pesanan bisa bertahan (berkat local-state), namun pemrosesan ke *database* wajib membutuhkan koneksi ke *server* lokal atau *cloud* yang disetel.
*   **Perawatan (*Maintenance*)**: Disarankan secara berkala mem-filter riwayat transaksi lama pada *Dashboard Admin* jika kapasitas data sudah melewati batas wajar (ribuan transaksi per hari) demi mempertahankan responsivitas *loading* halaman utama.