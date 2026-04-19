# Bot Keuangan Telegram

Bot Telegram untuk mencatat pemasukan dan pengeluaran dengan mudah.

## Fitur

- 💰 Catat pemasukan dan pengeluaran
- 📊 Laporan bulanan
- 📈 Statistik pengeluaran
- 📋 Daftar transaksi
- 🗑️ Hapus transaksi

## Cara Install

```bash
# Install dependencies
npm install

# Build project
npm run build

# Run bot
npm start
```

## Cara Menggunakan

1. Buat bot baru dari @BotFather di Telegram
2. Copy bot token ke file `.env`
3. Jalankan bot dengan `npm start`
4. Kirim `/start` ke bot

## Perintah

- `/start` - Register dan mulai bot
- `/add` - Tambah transaksi baru
- `/report` - Lihat laporan bulanan
- `/stats` - Statistik pengeluaran
- `/list` - Daftar transaksi terakhir
- `/delete [id]` - Hapus transaksi
- `/help` - Panduan penggunaan