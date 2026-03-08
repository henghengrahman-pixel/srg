# Affiliate Web

Template website affiliate Shopee dengan:
- grid produk profesional
- tampilan mewah dark luxury
- SEO ready
- artikel SEO
- admin upload produk
- tracking klik affiliate
- tanpa tombol admin di halaman depan

## Jalankan lokal

```bash
npm install
npm run dev
```

## Environment

Salin `.env` lalu ganti nilainya:

- `PORT`
- `BASE_URL`
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `DATA_DIR`

## Link admin rahasia

- Login: `/secure-admin-login-rmz9x`
- Dashboard: `/secure-admin-dashboard-rmz9x`

Tidak ada tombol admin di home / header / footer.

## Deploy Railway

1. Upload project ini ke GitHub atau langsung deploy ke Railway.
2. Set environment variables sesuai `.env`.
3. Pastikan `DATA_DIR=/data` agar data JSON tersimpan di volume Railway.
4. Set `BASE_URL` ke domain Railway kamu.

## Catatan

- Produk bisa pakai URL gambar atau upload manual.
- Tombol affiliate mengarah ke route tracking `/go/:id` lalu redirect ke Shopee.
- `robots.txt` dan `sitemap.xml` sudah aktif.
