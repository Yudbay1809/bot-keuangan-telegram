# Deploy ke VPS (Node.js + PM2)

Panduan ini untuk Ubuntu/Debian.

## 1) Setup server (sekali saja)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential

# install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# install PM2 global
sudo npm i -g pm2
```

## 2) Pull source code

```bash
cd /opt
sudo git clone https://github.com/Yudbay1809/bot-keuangan-telegram.git bot-keuangan-tele
sudo chown -R $USER:$USER /opt/bot-keuangan-tele
cd /opt/bot-keuangan-tele
```

## 3) Set environment

```bash
cp .env.example .env
nano .env
```

Isi minimal:

```env
BOT_TOKEN=isi_token_bot_telegram
DB_PATH=./data/keuangan.db
```

## 4) Build dan start

```bash
npm ci
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 5) Update deploy berikutnya

```bash
cd /opt/bot-keuangan-tele
git pull
npm ci
npm run build
pm2 restart bot-keuangan-tele
pm2 save
```

## 6) Monitoring

```bash
pm2 ls
pm2 logs bot-keuangan-tele --lines 100
```
