"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const telegraf_1 = require("telegraf");
const database_1 = require("./database");
const commands_1 = require("./commands");
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
    console.error('Error: BOT_TOKEN not found in .env file');
    process.exit(1);
}
async function main() {
    console.log('🚀 Starting Bot Keuangan...');
    // Initialize database
    (0, database_1.initDatabase)();
    console.log('✅ Database initialized');
    // Create bot instance
    const bot = new telegraf_1.Telegraf(botToken);
    // Register all commands
    (0, commands_1.registerCommands)(bot);
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
//# sourceMappingURL=index.js.map