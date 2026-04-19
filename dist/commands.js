"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const telegraf_1 = require("telegraf");
const database_1 = require("./database");
const chart_1 = require("./chart");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const userConversations = new Map();
function getConversation(ctx) {
    const key = ctx.from?.id;
    if (!key)
        return undefined;
    return userConversations.get(key);
}
function setConversation(ctx, conv) {
    if (ctx.from?.id) {
        userConversations.set(ctx.from.id, conv);
    }
}
function clearConversation(ctx) {
    if (ctx.from?.id) {
        userConversations.delete(ctx.from.id);
    }
}
// Keyboard menu
const mainKeyboard = telegraf_1.Markup.keyboard([
    ['➕ Tambah', '📊 Laporan'],
    ['📈 Stats', '📋 Transaksi'],
    ['❓ Help']
]).oneTime().resize();
// Keyboard menu for time range
const timeKeyboard = telegraf_1.Markup.inlineKeyboard([
    [telegraf_1.Markup.button.callback('Bulan Ini', 'report_this_month')],
    [telegraf_1.Markup.button.callback('Bulan Lalu', 'report_last_month')],
    [telegraf_1.Markup.button.callback('Tahun Ini', 'report_this_year')],
    [telegraf_1.Markup.button.callback('Semua', 'report_all')],
]);
function registerCommands(bot) {
    // ========== BASIC COMMANDS ==========
    // Start command
    bot.start(async (ctx) => {
        const userId = ctx.from.id;
        const name = ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : '');
        const username = ctx.from.username;
        (0, database_1.getOrCreateUser)(userId, name, username);
        await ctx.reply(`👋 Halo ${ctx.from.first_name}!\n\n` +
            `Selamat datang di Bot Keuangan!\n\n` +
            `Pilih menu di bawah atau ketik perintah:`, { reply_markup: mainKeyboard });
    });
    // Help command
    bot.help(async (ctx) => {
        await ctx.reply(`📖 *Panduan Bot Keuangan*\n\n` +
            `• /add - Tambah transaksi\n` +
            `• /report - Pilih periode\n` +
            `• /stats - Statistik bulan ini\n` +
            `• /list - Transaksi terakhir\n` +
            `• /delete [id] - Hapus transaksi\n` +
            `• /export - Export data CSV`, { parse_mode: 'Markdown', reply_markup: mainKeyboard });
    });
    // Report command - with chart
    bot.command('report', async (ctx) => {
        try {
            const userId = ctx.from.id;
            const name = ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : '');
            (0, database_1.getOrCreateUser)(userId, name, ctx.from.username);
            let year, month;
            if (ctx.message && 'text' in ctx.message) {
                const args = ctx.message.text.split(' ');
                if (args[1]) {
                    const parts = args[1].split('-');
                    year = parseInt(parts[0]);
                    month = parseInt(parts[1]);
                }
                else {
                    const now = new Date();
                    year = now.getFullYear();
                    month = now.getMonth() + 1;
                }
            }
            else {
                const now = new Date();
                year = now.getFullYear();
                month = now.getMonth() + 1;
            }
            const stats = (0, database_1.getMonthlyStats)(userId, year, month);
            const balance = stats.income - stats.expense;
            const monthName = new Date(year, month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            let message = `📊 *Laporan ${monthName}*\n\n`;
            message += `💰 Pemasukan: Rp ${stats.income.toLocaleString('id-ID')}\n`;
            message += `💸 Pengeluaran: Rp ${stats.expense.toLocaleString('id-ID')}\n`;
            message += `──────────────\n`;
            message += `📉 Saldo: Rp ${balance.toLocaleString('id-ID')}\n`;
            await ctx.reply(message, { parse_mode: 'Markdown' });
            // Generate bar chart for income vs expense
            try {
                const chartText = await (0, chart_1.generateBarChart)({
                    labels: ['Pemasukan', 'Pengeluaran'],
                    values: [stats.income, stats.expense],
                    colors: ['#36A2EB', '#FF6384'],
                    title: `${monthName}`
                });
                await ctx.reply(chartText, { parse_mode: 'Markdown' });
            }
            catch (chartErr) {
                console.error('Error generating report chart:', chartErr);
            }
        }
        catch (err) {
            console.error('Error /report:', err);
            await ctx.reply('Terjadi kesalahan.');
        }
    });
    // Stats command - with charts
    bot.command('stats', async (ctx) => {
        try {
            const userId = ctx.from.id;
            const name = ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : '');
            (0, database_1.getOrCreateUser)(userId, name, ctx.from.username);
            const now = new Date();
            const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
            const categoryStats = (0, database_1.getCategoryStats)(userId, startDate, endDate);
            if (categoryStats.length === 0) {
                await ctx.reply('Belum ada transaksi bulan ini.');
                return;
            }
            let message = `📈 *Statistik Bulan Ini*\n\n`;
            const expenseCats = categoryStats.filter(c => c.type === 'expense');
            const totalExpense = expenseCats.reduce((sum, c) => sum + c.total, 0);
            message += `*Pengeluaran:*\n`;
            for (const cat of expenseCats) {
                const percent = totalExpense > 0 ? ((cat.total / totalExpense) * 100).toFixed(1) : '0';
                message += `${cat.category}: Rp ${cat.total.toLocaleString('id-ID')} (${percent}%)\n`;
            }
            const incomeCats = categoryStats.filter(c => c.type === 'income');
            const totalIncome = incomeCats.reduce((sum, c) => sum + c.total, 0);
            message += `\n*Pemasukan:*\n`;
            for (const cat of incomeCats) {
                const percent = totalIncome > 0 ? ((cat.total / totalIncome) * 100).toFixed(1) : '0';
                message += `${cat.category}: Rp ${cat.total.toLocaleString('id-ID')} (${percent}%)\n`;
            }
            await ctx.reply(message, { parse_mode: 'Markdown' });
            // Generate and send pie chart for expenses
            if (expenseCats.length > 0) {
                try {
                    const chartText = await (0, chart_1.generatePieChart)({
                        labels: expenseCats.map(c => c.category),
                        values: expenseCats.map(c => c.total),
                        title: 'Pengeluaran per Kategori'
                    });
                    await ctx.reply(chartText, { parse_mode: 'Markdown' });
                }
                catch (chartErr) {
                    console.error('Error generating expense chart:', chartErr);
                }
            }
            // Generate and send pie chart for income
            if (incomeCats.length > 0) {
                try {
                    const chartText = await (0, chart_1.generatePieChart)({
                        labels: incomeCats.map(c => c.category),
                        values: incomeCats.map(c => c.total),
                        title: 'Pemasukan per Kategori'
                    });
                    await ctx.reply(chartText, { parse_mode: 'Markdown' });
                }
                catch (chartErr) {
                    console.error('Error generating income chart:', chartErr);
                }
            }
        }
        catch (err) {
            console.error('Error /stats:', err);
            await ctx.reply('Terjadi kesalahan.');
        }
    });
    // List command
    bot.command('list', async (ctx) => {
        try {
            const userId = ctx.from.id;
            const name = ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : '');
            (0, database_1.getOrCreateUser)(userId, name, ctx.from.username);
            const transactions = (0, database_1.getTransactions)(userId);
            if (transactions.length === 0) {
                await ctx.reply('Belum ada transaksi.');
                return;
            }
            let message = `📋 *Transaksi Terakhir*\n\n`;
            for (const tx of transactions.slice(0, 10)) {
                const emoji = tx.type === 'income' ? '💰' : '💸';
                message += `${emoji} ${tx.type === 'expense' ? '-' : '+'}Rp ${tx.amount.toLocaleString('id-ID')} - ${tx.category}\n`;
                message += `   📅 ${tx.date} | ID: ${tx.id}\n`;
                if (tx.description)
                    message += `   📝 ${tx.description}\n`;
                message += `\n`;
            }
            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
        catch (err) {
            console.error('Error /list:', err);
            await ctx.reply('Terjadi kesalahan.');
        }
    });
    // Delete command
    bot.command('delete', async (ctx) => {
        try {
            const userId = ctx.from.id;
            const name = ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : '');
            (0, database_1.getOrCreateUser)(userId, name, ctx.from.username);
            const args = (ctx.message && 'text' in ctx.message) ? ctx.message.text.split(' ') : [];
            if (!args[1]) {
                await ctx.reply('Gunakan: /delete [id]\nKetik /list untuk melihat ID.');
                return;
            }
            const txId = parseInt(args[1]);
            const deleted = (0, database_1.deleteTransaction)(userId, txId);
            if (deleted) {
                await ctx.reply('✅ Transaksi dihapus.');
            }
            else {
                await ctx.reply('❌ Transaksi tidak ditemukan.');
            }
        }
        catch (err) {
            console.error('Error /delete:', err);
            await ctx.reply('Terjadi kesalahan.');
        }
    });
    // ========== ADD TRANSACTION FLOW ==========
    // Add command - start wizard
    bot.command('add', async (ctx) => {
        const userId = ctx.from.id;
        const name = ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : '');
        (0, database_1.getOrCreateUser)(userId, name, ctx.from.username);
        // Start new conversation
        setConversation(ctx, {
            step: 'type',
            data: {}
        });
        await ctx.reply('Pilih jenis transaksi:', telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('💰 Pemasukan', 'tx_type_income')],
            [telegraf_1.Markup.button.callback('💸 Pengeluaran', 'tx_type_expense')],
        ]));
    });
    // Handle income button
    bot.action('tx_type_income', async (ctx) => {
        const conv = getConversation(ctx);
        if (!conv) {
            await ctx.answerCbQuery('Session expired. Ketik /add lagi.');
            return;
        }
        conv.data.type = 'income';
        conv.step = 'amount';
        setConversation(ctx, conv);
        await ctx.answerCbQuery();
        await ctx.editMessageText('💰 Pemasukan\n\nMasukkan jumlah (contoh: 50000):');
    });
    // Handle expense button
    bot.action('tx_type_expense', async (ctx) => {
        const conv = getConversation(ctx);
        if (!conv) {
            await ctx.answerCbQuery('Session expired. Ketik /add lagi.');
            return;
        }
        conv.data.type = 'expense';
        conv.step = 'amount';
        setConversation(ctx, conv);
        await ctx.answerCbQuery();
        await ctx.editMessageText('💸 Pengeluaran\n\nMasukkan jumlah (contoh: 50000):');
    });
    // Handle message input (amount, description, custom category)
    bot.on('message', async (ctx) => {
        // Skip if not in conversation
        const conv = getConversation(ctx);
        if (!conv)
            return;
        // Skip commands except /skip in description step
        if (ctx.message && 'text' in ctx.message && ctx.message.text.startsWith('/')) {
            if (conv.step !== 'description' || ctx.message.text !== '/skip') {
                return;
            }
        }
        const text = (ctx.message && 'text' in ctx.message) ? ctx.message.text : '';
        // Handle amount step
        if (conv.step === 'amount') {
            const amount = parseInt(text.replace(/[^0-9]/g, ''));
            if (!amount || amount <= 0) {
                await ctx.reply('Jumlah tidak valid. Masukkan angka benar.');
                return;
            }
            conv.data.amount = amount;
            conv.step = 'category';
            setConversation(ctx, conv);
            // Show category buttons with emoji
            const allCategories = (0, database_1.getCategories)(ctx.from.id);
            const buttons = allCategories.map(cat => [telegraf_1.Markup.button.callback(`${cat.emoji} ${cat.name}`, `tx_cat_${cat.name}`)]);
            buttons.push([telegraf_1.Markup.button.callback('➕ Kategori Lain', 'tx_cat_custom')]);
            await ctx.reply('Pilih kategori:', telegraf_1.Markup.inlineKeyboard(buttons));
            return;
        }
        // Handle description step (including /skip)
        if (conv.step === 'description') {
            const description = text === '/skip' ? undefined : text;
            const transaction = (0, database_1.addTransaction)(ctx.from.id, conv.data.type, conv.data.amount, conv.data.category, description);
            const emoji = conv.data.type === 'income' ? '💰' : '💸';
            await ctx.reply(`${emoji} *Transaksi disimpan!*\n\n` +
                `Tipe: ${conv.data.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}\n` +
                `Jumlah: Rp ${conv.data.amount?.toLocaleString('id-ID')}\n` +
                `Kategori: ${conv.data.category}\n` +
                `Tanggal: ${transaction.date}`, { parse_mode: 'Markdown' });
            clearConversation(ctx);
            return;
        }
        // Handle custom category step
        if (conv.step === 'custom_category') {
            const customCat = text.trim();
            if (customCat.length < 2) {
                await ctx.reply('Nama kategori minimal 2 karakter.');
                return;
            }
            conv.data.category = customCat;
            conv.step = 'description';
            setConversation(ctx, conv);
            await ctx.reply('Masukkan deskripsi (opsional), atau ketik /skip:');
            return;
        }
    });
    // Handle category selection
    bot.action(/^tx_cat_(.+)$/, async (ctx) => {
        const conv = getConversation(ctx);
        if (!conv || conv.step !== 'category') {
            await ctx.answerCbQuery('Session expired. Ketik /add lagi.');
            return;
        }
        const categoryName = ctx.match[1];
        if (categoryName === 'custom') {
            conv.step = 'custom_category';
            setConversation(ctx, conv);
            await ctx.answerCbQuery();
            await ctx.editMessageText('Masukkan nama kategori baru:');
            return;
        }
        conv.data.category = categoryName;
        conv.step = 'description';
        setConversation(ctx, conv);
        await ctx.answerCbQuery();
        await ctx.editMessageText('Masukkan deskripsi (opsional), atau ketik /skip:');
    });
    // ========== KEYBOARD BUTTON HANDLERS ==========
    bot.hears('➕ Tambah', async (ctx) => {
        ctx.message.text = '/add';
        ctx.message.message_id = 0;
        // Trigger /add flow
        const userId = ctx.from.id;
        (0, database_1.getOrCreateUser)(userId, ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), ctx.from.username);
        setConversation(ctx, { step: 'type', data: {} });
        await ctx.reply('Pilih jenis transaksi:', telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('💰 Pemasukan', 'tx_type_income')],
            [telegraf_1.Markup.button.callback('💸 Pengeluaran', 'tx_type_expense')],
        ]));
    });
    bot.hears('📊 Laporan', async (ctx) => {
        ctx.message.text = '/report';
        ctx.message.message_id = 0;
        // Trigger /report flow
        try {
            const userId = ctx.from.id;
            (0, database_1.getOrCreateUser)(userId, ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), ctx.from.username);
            const now = new Date();
            const stats = (0, database_1.getMonthlyStats)(userId, now.getFullYear(), now.getMonth() + 1);
            const balance = stats.income - stats.expense;
            const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            let message = `📊 *Laporan ${monthName}*\n\n`;
            message += `💰 Pemasukan: Rp ${stats.income.toLocaleString('id-ID')}\n`;
            message += `💸 Pengeluaran: Rp ${stats.expense.toLocaleString('id-ID')}\n`;
            message += `──────────────\n`;
            message += `📉 Saldo: Rp ${balance.toLocaleString('id-ID')}\n`;
            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
        catch (err) {
            await ctx.reply('Terjadi kesalahan.');
        }
    });
    bot.hears('📈 Stats', async (ctx) => {
        ctx.message.text = '/stats';
        ctx.message.message_id = 0;
        // Trigger /stats flow
        try {
            const userId = ctx.from.id;
            (0, database_1.getOrCreateUser)(userId, ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), ctx.from.username);
            const now = new Date();
            const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
            const categoryStats = (0, database_1.getCategoryStats)(userId, startDate, endDate);
            if (categoryStats.length === 0) {
                await ctx.reply('Belum ada transaksi bulan ini.');
                return;
            }
            let message = `📈 *Statistik Bulan Ini*\n\n`;
            const expenseCats = categoryStats.filter(c => c.type === 'expense');
            const totalExpense = expenseCats.reduce((sum, c) => sum + c.total, 0);
            message += `*Pengeluaran:*\n`;
            for (const cat of expenseCats) {
                const percent = totalExpense > 0 ? ((cat.total / totalExpense) * 100).toFixed(1) : '0';
                message += `${cat.category}: Rp ${cat.total.toLocaleString('id-ID')} (${percent}%)\n`;
            }
            const incomeCats = categoryStats.filter(c => c.type === 'income');
            const totalIncome = incomeCats.reduce((sum, c) => sum + c.total, 0);
            message += `\n*Pemasukan:*\n`;
            for (const cat of incomeCats) {
                const percent = totalIncome > 0 ? ((cat.total / totalIncome) * 100).toFixed(1) : '0';
                message += `${cat.category}: Rp ${cat.total.toLocaleString('id-ID')} (${percent}%)\n`;
            }
            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
        catch (err) {
            await ctx.reply('Terjadi kesalahan.');
        }
    });
    bot.hears('📋 Transaksi', async (ctx) => {
        ctx.message.text = '/list';
        ctx.message.message_id = 0;
        // Trigger /list flow
        try {
            const userId = ctx.from.id;
            (0, database_1.getOrCreateUser)(userId, ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), ctx.from.username);
            const transactions = (0, database_1.getTransactions)(userId);
            if (transactions.length === 0) {
                await ctx.reply('Belum ada transaksi.');
                return;
            }
            let message = `📋 *Transaksi Terakhir*\n\n`;
            for (const tx of transactions.slice(0, 10)) {
                const emoji = tx.type === 'income' ? '💰' : '💸';
                message += `${emoji} ${tx.type === 'expense' ? '-' : '+'}Rp ${tx.amount.toLocaleString('id-ID')} - ${tx.category}\n`;
                message += `   📅 ${tx.date} | ID: ${tx.id}\n`;
                if (tx.description)
                    message += `   📝 ${tx.description}\n`;
                message += `\n`;
            }
            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
        catch (err) {
            await ctx.reply('Terjadi kesalahan.');
        }
    });
    bot.hears('❓ Help', async (ctx) => {
        ctx.message.text = '/help';
        ctx.message.message_id = 0;
        // Trigger /help flow
        await ctx.reply(`📖 *Panduan Bot Keuangan*\n\n` +
            `• /add - Tambah transaksi\n` +
            `• /report - Laporan bulan ini\n` +
            `• /stats - Statistik bulan ini\n` +
            `• /list - Transaksi terakhir\n` +
            `• /delete [id] - Hapus transaksi\n` +
            `• /export - Export data CSV`, { parse_mode: 'Markdown', reply_markup: mainKeyboard });
    });
    // ========== EXPORT COMMAND ==========
    bot.command('export', async (ctx) => {
        try {
            const userId = ctx.from.id;
            const name = ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : '');
            (0, database_1.getOrCreateUser)(userId, name, ctx.from.username);
            const transactions = (0, database_1.getTransactions)(userId);
            if (transactions.length === 0) {
                await ctx.reply('Belum ada transaksi untuk diexport.');
                return;
            }
            // Generate CSV
            const headers = ['ID', 'Tanggal', 'Jenis', 'Jumlah', 'Kategori', 'Deskripsi'];
            const rows = transactions.map(tx => [
                tx.id.toString(),
                tx.date,
                tx.type,
                tx.amount.toString(),
                tx.category,
                tx.description || ''
            ]);
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            // Save to temp file
            const tempDir = process.env.TEMP_DIR || './data';
            if (!fs_1.default.existsSync(tempDir)) {
                fs_1.default.mkdirSync(tempDir, { recursive: true });
            }
            const filePath = path_1.default.join(tempDir, `export_${userId}_${Date.now()}.csv`);
            fs_1.default.writeFileSync(filePath, csvContent, 'utf-8');
            // Send file
            await ctx.replyWithDocument({
                url: `file://${filePath}`,
                filename: 'keuangan.csv'
            });
            // Cleanup
            fs_1.default.unlinkSync(filePath);
        }
        catch (err) {
            console.error('Error /export:', err);
            await ctx.reply('Terjadi kesalahan. Pastikan bot bisa kirim file.');
        }
    });
    // ========== INLINE KEYBOARD HANDLERS ==========
    bot.action('report_this_month', async (ctx) => {
        const userId = ctx.from.id;
        (0, database_1.getOrCreateUser)(userId, ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), ctx.from.username);
        const now = new Date();
        const stats = (0, database_1.getMonthlyStats)(userId, now.getFullYear(), now.getMonth() + 1);
        const balance = stats.income - stats.expense;
        const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        let message = `📊 *Laporan ${monthName}*\n\n`;
        message += `💰 Pemasukan: Rp ${stats.income.toLocaleString('id-ID')}\n`;
        message += `💸 Pengeluaran: Rp ${stats.expense.toLocaleString('id-ID')}\n`;
        message += `──────────────\n`;
        message += `📉 Saldo: Rp ${balance.toLocaleString('id-ID')}\n`;
        await ctx.answerCbQuery();
        await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    });
    bot.action('report_last_month', async (ctx) => {
        const userId = ctx.from.id;
        (0, database_1.getOrCreateUser)(userId, ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), ctx.from.username);
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        const stats = (0, database_1.getMonthlyStats)(userId, now.getFullYear(), now.getMonth() + 1);
        const balance = stats.income - stats.expense;
        const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        let message = `📊 *Laporan ${monthName}*\n\n`;
        message += `💰 Pemasukan: Rp ${stats.income.toLocaleString('id-ID')}\n`;
        message += `💸 Pengeluaran: Rp ${stats.expense.toLocaleString('id-ID')}\n`;
        message += `──────────────\n`;
        message += `📉 Saldo: Rp ${balance.toLocaleString('id-ID')}\n`;
        await ctx.answerCbQuery();
        await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    });
    bot.action('report_this_year', async (ctx) => {
        const userId = ctx.from.id;
        (0, database_1.getOrCreateUser)(userId, ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), ctx.from.username);
        const now = new Date();
        let totalIncome = 0, totalExpense = 0;
        for (let m = 0; m < 12; m++) {
            const stats = (0, database_1.getMonthlyStats)(userId, now.getFullYear(), m + 1);
            totalIncome += stats.income;
            totalExpense += stats.expense;
        }
        const balance = totalIncome - totalExpense;
        const year = now.getFullYear();
        let message = `📊 *Laporan Tahun ${year}*\n\n`;
        message += `💰 Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}\n`;
        message += `💸 Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}\n`;
        message += `──────────────\n`;
        message += `📉 Saldo: Rp ${balance.toLocaleString('id-ID')}\n`;
        await ctx.answerCbQuery();
        await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    });
    bot.action('report_all', async (ctx) => {
        const userId = ctx.from.id;
        (0, database_1.getOrCreateUser)(userId, ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), ctx.from.username);
        const transactions = (0, database_1.getTransactions)(userId);
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIncome - totalExpense;
        let message = `📊 *Semua Transaksi*\n\n`;
        message += `💰 Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}\n`;
        message += `💸 Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}\n`;
        message += `──────────────\n`;
        message += `📉 Total Saldo: Rp ${balance.toLocaleString('id-ID')}\n`;
        message += `\n📋 Jumlah: ${transactions.length} transaksi`;
        await ctx.answerCbQuery();
        await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    });
}
//# sourceMappingURL=commands.js.map