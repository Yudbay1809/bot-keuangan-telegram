import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { MyContext } from './types';
import { initDatabase } from './database';
import { registerCommands } from './commands';

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  console.error('Error: BOT_TOKEN not found in .env file');
  process.exit(1);
}

async function main() {
  console.log('🚀 Starting Bot Keuangan...');

  // Initialize database
  initDatabase();
  console.log('✅ Database initialized');

  // Create bot instance
  const bot = new Telegraf<MyContext>(botToken as string);

  // Register all commands
  registerCommands(bot);

  // Start bot with error handling
  bot.launch({
    dropPendingUpdates: true
  }, () => {
    console.log('✅ Bot started successfully!');
  }).catch(err => {
    console.error('❌ Bot launch error:', err);
  });

  // Enable graceful stop
  process.once('SIGINT', () => {
    console.log('⏹️ Stopping bot...');
    bot.stop('SIGINT');
  });

  process.once('SIGTERM', () => {
    console.log('⏹️ Stopping bot...');
    bot.stop('SIGTERM');
  });
}

main().catch((err) => {
  console.error('❌ Failed to start bot:', err);
  process.exit(1);
});