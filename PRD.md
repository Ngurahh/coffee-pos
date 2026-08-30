# Product Requirements Document

# Coffee Shop POS

## 1. Product Overview

Coffee Shop POS adalah sistem Point of Sale berbasis web untuk membantu operasional coffee shop.

Sistem digunakan oleh kasir untuk:
- Membuka dan menutup shift.
- Membuat pesanan.
- Mengelola cart.
- Menerima pembayaran.
- Menyimpan transaksi.
- Mencetak struk pelanggan.
- Mencetak tiket bar atau kitchen.
- Melihat riwayat transaksi.
- Melihat laporan penjualan.

Sistem harus cepat digunakan oleh kasir, akurat dalam perhitungan uang, dan siap dikembangkan untuk beberapa kasir serta beberapa printer.

## 2. Problem Statement

Operasional coffee shop membutuhkan proses transaksi yang cepat dan konsisten.

Masalah yang ingin diselesaikan:
- Kasir membutuhkan alur transaksi yang singkat.
- Perhitungan total dan kembalian harus akurat.
- Histori transaksi harus tersimpan dengan baik.
- Printer tidak boleh menjadi single point of failure untuk transaksi.
- Kasir membutuhkan proses open shift dan closing yang jelas.
- Pengelola membutuhkan data penjualan untuk operasional.

## 3. Goals

### Primary Goals

1. Mempercepat proses transaksi.
2. Mengurangi kesalahan perhitungan.
3. Menyimpan histori transaksi secara konsisten.
4. Mendukung thermal printer.
5. Mendukung cash session.
6. Menyediakan fondasi untuk pengembangan fitur lanjutan.

### Secondary Goals

Sistem nantinya dapat mendukung:
- Multiple cashier.
- Multiple printer.
- QRIS.
- Debit.
- Credit.
- E-wallet.
- Inventory.
- Modifier.
- Discount.
- Reporting yang lebih lengkap.

## 4. Target Users

### Cashier

**Device Target:** Tablet (Layar sentuh / Touchscreen)

Cashier menggunakan sistem untuk:
- Login.
- Membuka shift.
- Membuat order.
- Menerima pembayaran.
- Mencetak struk.
- Melihat transaksi.
- Menutup shift.

### Admin

**Device Target:** Komputer / Laptop (Mouse & Keyboard)

Admin menggunakan sistem untuk:
- Mengelola product.
- Mengelola category.
- Mengelola user.
- Melihat laporan (serta export rekap ke Excel).
- Melihat transaksi.
- Mengelola printer.
- Mengelola konfigurasi.

## 5. MVP Scope

### 5.1 Authentication

Fitur:
- Login.
- Logout.
- Session.
- Role.

Role minimum:
- CASHIER.
- ADMIN.

### 5.2 Product Management

Admin dapat:
- Membuat product.
- Mengubah product.
- Menonaktifkan product.
- Mengatur harga.
- Mengatur SKU.
- Mengatur category.

Product memiliki:
- Name.
- SKU.
- Price.
- Category.
- Active status.

### 5.3 Category Management

Admin dapat:
- Membuat category.
- Mengubah category.
- Mengaktifkan atau menonaktifkan category.

Contoh category:
- Coffee.
- Non Coffee.
- Food.
- Add On.

## 6. POS

POS adalah fitur utama sistem.

Cashier dapat:
- Melihat category.
- Melihat product.
- Menambahkan product ke cart.
- Mengubah quantity.
- Menghapus item.
- Mengosongkan cart.
- Melihat subtotal.
- Memasukkan discount jika fitur tersedia.
- Melihat total.
- Melanjutkan ke pembayaran.

Target flow:

Product
→ Add to Cart
→ Review Cart
→ Pay
→ Transaction Complete

Kasir sebaiknya dapat menyelesaikan transaksi tanpa berpindah halaman berkali-kali.

## 7. Cart

Cart menyimpan item sementara sebelum checkout.

Setiap item memiliki:
- Product.
- Product name.
- Quantity.
- Unit price.
- Subtotal.

Contoh:

Americano
2 × Rp18.000
Rp36.000

Croissant
1 × Rp18.000
Rp18.000

Total
Rp54.000

Frontend boleh menghitung preview.

Backend harus menghitung ulang nilai final berdasarkan database.

## 8. Checkout

Checkout membuat transaksi permanen.

Flow:

Cart
→ Checkout
→ Validate Product
→ Calculate Total
→ Create Order
→ Create Order Items
→ Create Payment
→ Create Print Jobs
→ Return Success

Checkout database harus atomic.

Jika transaksi database gagal, perubahan database harus rollback.

Printer failure tidak boleh membatalkan transaksi yang sudah berhasil dibayar.

## 9. Payment

MVP payment:
- CASH.
- QRIS.

Cashier memasukkan:
- Total.
- Cash received.
- Change.

Contoh:

Total: Rp54.000
Cash: Rp60.000
Change: Rp6.000

Backend harus memvalidasi bahwa cash received mencukupi total.

Future payment methods:
- Debit.
- Credit.
- E-wallet.

## 10. Order

Order adalah representasi transaksi pelanggan.

Order menyimpan:
- Order ID.
- Transaction number.
- Cashier.
- Items.
- Subtotal.
- Discount.
- Tax.
- Total.
- Payment.
- Status.
- Created time.

Transaction number harus unik dan mudah dibaca manusia.

Contoh:
ORD-20260829-00142

## 11. Order Item

Order item menyimpan snapshot transaksi.

Minimal:
- Product ID.
- Product name snapshot.
- Unit price.
- Quantity.
- Subtotal.

Harga transaksi harus disimpan pada OrderItem.

Historical transaction tidak boleh bergantung pada Product.price yang terbaru.

Contoh:

Saat transaksi:
Latte = Rp22.000

Harga product berubah:
Latte = Rp25.000

Order lama tetap:
Latte = Rp22.000

## 12. Order Status

Status minimum:
- DRAFT.
- PENDING_PAYMENT.
- PAID.
- COMPLETED.
- CANCELLED.
- REFUNDED.

Expected flow:

DRAFT
→ PENDING_PAYMENT
→ PAID
→ COMPLETED

Transisi status harus memiliki aturan yang jelas.

Frontend tidak boleh bebas mengubah status order.

## 13. Cash Session

Cashier bekerja dalam cash session.

Flow:

Open Shift
→ Transactions
→ Close Shift

Saat membuka shift:
- Opening cash.
- Cashier.
- Open time.

Saat closing:
- Expected cash.
- Actual cash.
- Difference.
- Close time.

Expected cash:

Opening Cash
+ Cash Sales
+ Other Cash In
- Cash Refunds
- Cash Out

Difference:

Actual Cash - Expected Cash

## 14. Transaction History

Cashier atau admin dapat melihat transaksi.

Informasi minimum:
- Transaction number.
- Date.
- Cashier.
- Total.
- Payment method.
- Status.

Filter minimum:
- Date.
- Status.
- Cashier.

Transaction detail menampilkan:
- Items.
- Quantity.
- Price.
- Subtotal.
- Payment.
- Total.
- Transaction time.

## 15. Printing

Sistem harus mendukung:

### Customer Receipt

Struk untuk pelanggan.

### Bar Ticket

Tiket untuk barista.

### Kitchen Ticket

Tiket untuk kitchen.

Print flow:

Paid Order
→ Create Print Job
→ Print Agent
→ Thermal Printer

Printing bersifat asynchronous terhadap transaksi.

Jika printer gagal:
- Transaction tetap PAID.
- Print Job menjadi FAILED.
- Kasir dapat melakukan retry.

## 16. Print Job

Print Job memiliki:
- Order.
- Printer.
- Type.
- Status.
- Attempts.
- Error message.
- Created time.
- Printed time.

Status:
- PENDING.
- PRINTING.
- PRINTED.
- FAILED.

Print job harus tetap tersedia untuk retry ketika printing gagal.

## 17. Printer

Sistem harus mendukung konfigurasi printer.

Printer memiliki:
- Name.
- Type.
- Connection.
- Active status.

Connection yang direncanakan:
- USB.
- LAN.

Printer role:
- CASHIER_RECEIPT.
- BAR.
- KITCHEN.

## 18. Product Pricing

Product price dapat berubah.

Setiap transaksi harus menyimpan harga saat transaksi dibuat.

Perubahan harga product tidak boleh mengubah historical transaction.

## 19. Money Rules

Semua nominal uang harus diperlakukan sebagai nilai dengan presisi.

Database menggunakan Decimal.

Backend menjadi sumber final untuk:
- Unit price.
- Subtotal.
- Discount.
- Tax.
- Total.
- Change.

Client tidak dipercaya untuk nilai final.

## 20. Validation Rules

Backend harus memvalidasi:
- Product exists.
- Product active.
- Quantity valid.
- Price berasal dari database.
- Payment amount valid.
- Cash received cukup.
- Cash session aktif.
- Order status valid.

Input client tidak boleh dipercaya secara langsung.

## 21. Non-Functional Requirements

### Performance

POS harus terasa responsif untuk penggunaan kasir.

Hindari request yang tidak diperlukan dalam alur transaksi.

### Reliability

Transaksi yang sudah PAID harus tetap tersimpan walaupun printer gagal.

### Maintainability

Kode harus modular dan mudah dikembangkan.

### Security

- Password tidak boleh disimpan plaintext.
- Authorization harus dilakukan di server.
- Secret tidak boleh dikirim ke client.
- `.env` tidak boleh masuk Git.

### Auditability

Transaksi harus dapat dilacak minimal berdasarkan:
- Who.
- What.
- When.
- Amount.

## 22. UX Requirements

POS dirancang untuk penggunaan kasir.

Prioritas:
1. Speed.
2. Accuracy.
3. Clarity.

Layout utama secara konseptual:

Categories | Product Grid | Cart

Karena POS akan digunakan di Tablet, kasir harus dapat mengoperasikan POS dengan nyaman menggunakan layar sentuh (touchscreen). Area *tap* dan tombol-tombol harus berukuran proporsional agar mudah ditekan.

Sedangkan untuk dashboard Admin diakses menggunakan Komputer, sehingga mendukung interaksi menggunakan mouse dan keyboard. Keyboard support di sisi kasir menjadi nilai tambah.

## 23. Operational Scenarios

### Normal Sale

Cashier login
→ Open shift
→ Select products
→ Checkout
→ Receive payment
→ Order PAID
→ Print receipt

### Printer Failure

Checkout
→ Payment successful
→ Order PAID
→ Print Job FAILED

Kasir tetap dapat melanjutkan operasional.

### Product Price Change

Existing order
→ Price snapshot preserved

### Cash Closing

Open shift
→ Transactions
→ Close shift
→ Calculate expected cash
→ Enter actual cash
→ Calculate difference

## 24. MVP Acceptance Criteria

### Product
- Admin dapat membuat product.
- Product memiliki category.
- Product dapat diaktifkan atau dinonaktifkan.
- Product price tersimpan dengan benar.

### POS
- Cashier dapat melihat product.
- Cashier dapat memasukkan product ke cart.
- Quantity dapat diubah.
- Total dihitung benar.
- Cart dapat dikosongkan.

### Payment
- Cashier dapat melakukan pembayaran cash.
- Cashier dapat melakukan pembayaran QRIS.
- Sistem menghitung change dengan benar.
- Order menjadi PAID setelah pembayaran valid.

### Transaction
- Order tersimpan.
- Order items tersimpan.
- Harga historis tersimpan.
- Transaction number unik.

### Cash Session
- Cashier dapat membuka shift.
- Transaksi terhubung ke shift.
- Cashier dapat melakukan closing.
- Expected cash dihitung.

### Printing
- Receipt dapat dibuat sebagai print job.
- Print job memiliki status.
- Printer failure tidak membatalkan transaksi.
- Print job dapat di-retry.

## 25. Out of Scope for Initial MVP

Fitur berikut tidak masuk MVP pertama:
- Inventory management.
- Stock opname.
- Supplier.
- Purchase order.
- Loyalty.
- Membership.
- Advanced discount engine.
- Accounting integration.
- Multi-store.
- Offline-first architecture.
- Advanced analytics.
- Kitchen display system.
- Customer display.
- Mobile application.

## 26. Future Roadmap

Phase 1:
Product + POS

Phase 2:
Order + Payment

Phase 3:
Cash Session

Phase 4:
Printing

Phase 5:
Authentication + Roles

Phase 6:
Reports

Phase 7:
Inventory

Phase 8:
Advanced payment methods

Phase 9:
Multi-cashier

Phase 10:
Multi-store

## 27. Current Development Status

Completed:
- Next.js project initialized.
- TypeScript enabled.
- Tailwind configured.
- PostgreSQL installed natively on Windows.
- PostgreSQL database `coffee_pos` created.
- Prisma 7.10 configured.
- PostgreSQL driver adapter configured.
- Prisma migration created.
- Category model created.
- Product model created.
- Prisma Client generated.
- Prisma database connection tested.
- Seed data created.
- Prisma Studio verified.

Current focus:
- Product API.
- Category API.
- POS screen.
- Cart.
- Checkout.

## 28. Product Decisions

Current technical baseline:
- Next.js.
- TypeScript.
- Tailwind CSS.
- App Router.
- Zustand.
- Zod.
- Prisma 7.
- PostgreSQL.
- `@prisma/adapter-pg`.
- `pg`.
- Local Print Agent for operational printing.

Do not introduce a new framework or replace the core stack without an explicit project decision.