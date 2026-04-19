# Arsitektur Bot Keuangan Telegram

## 1. Overview

Bot Telegram untuk mencatat pemasukan dan pengeluaran dengan fitur-ringan dan mudah digunakan.

## 2. Tech Stack

- **Runtime**: Node.js >= 18
- **Framework**: Telegraf (modern Telegram bot framework)
- **Database**: SQLite dengan better-sqlite3 (synchronous, fast)
- **Language**: TypeScript
- **Deployment**: PM2 / Docker

## 3. Fitur Utama

### 3.1 Manajemen Transaksi
- `/add` - Tambah transaksi (pemasukan/pengeluaran)
- `/delete` - Hapus transaksi
- `/edit` - Edit transaksi

### 3.2 Kategori
- Kategori default: Makanan, Transportasi, Belanja, Hiburan, Kesehatan, Lainnya
- Kategori kustom (user bisa tambah sendiri)

### 3.3 Laporan
- `/report` - Laporan bulanan
- `/stats` - Statistik spending

### 3.4 Lainnya
- `/start` - Register user
- `/help` - Panduan penggunaan

## 4. Struktur Data

### User
- id (telegram user id)
- name
- username
- created_at

### Transaction
- id
- user_id
- type (income/expense)
- amount
- category
- description
- date
- created_at

### Category
- id
- user_id (null = default category)
- name
- emoji

## 5. Command Flow

```
User → /add → Choose type (pemasukan/pengeluaran) → Input amount → Select category → (optional) description → Save → Confirm
```

## 6. API Responses

Inline keyboard untuk navigasi cepat. Format pesan yang konsisten dan informatif.

## 7. Keamanan

- User hanya bisa akses data sendiri
- Input validation untuk amount (positif, number)
- Rate limiting dasar

## 8. Deploy

- PM2 untuk production
- Environment variables untuk konfigurasi
- Log yang informatif