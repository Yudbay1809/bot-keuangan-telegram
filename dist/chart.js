"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePieChart = generatePieChart;
exports.generateBarChart = generateBarChart;
exports.cleanupChart = cleanupChart;
const chart_js_1 = require("chart.js");
const canvas_1 = require("canvas");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Register Chart.js components
chart_js_1.Chart.register(...chart_js_1.registerables);
const DEFAULT_COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
];
async function generatePieChart(data) {
    const { labels, values, title } = data;
    const colors = data.colors || DEFAULT_COLORS.slice(0, labels.length);
    // Create canvas
    const width = 600;
    const height = 400;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext('2d');
    const config = {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: { size: 14 },
                        color: '#333333'
                    }
                },
                title: {
                    display: true,
                    text: title,
                    font: { size: 18, weight: 'bold' },
                    color: '#333333'
                }
            }
        }
    };
    const chart = new chart_js_1.Chart(ctx, config);
    chart.update();
    // Save to file
    const tempDir = process.env.TEMP_DIR || './data';
    if (!fs_1.default.existsSync(tempDir)) {
        fs_1.default.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path_1.default.join(tempDir, `chart_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs_1.default.writeFileSync(filePath, buffer);
    chart.destroy();
    return filePath;
}
async function generateBarChart(data) {
    const { labels, values, title } = data;
    const colors = data.colors || DEFAULT_COLORS.slice(0, labels.length);
    const width = 600;
    const height = 400;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext('2d');
    const config = {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                    label: title,
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 1,
                    borderColor: '#333333'
                }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: title,
                    font: { size: 18, weight: 'bold' },
                    color: '#333333'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => 'Rp ' + Number(value).toLocaleString('id-ID')
                    }
                }
            }
        }
    };
    const chart = new chart_js_1.Chart(ctx, config);
    chart.update();
    const tempDir = process.env.TEMP_DIR || './data';
    if (!fs_1.default.existsSync(tempDir)) {
        fs_1.default.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path_1.default.join(tempDir, `chart_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs_1.default.writeFileSync(filePath, buffer);
    chart.destroy();
    return filePath;
}
async function cleanupChart(filePath) {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (err) {
        console.error('Error cleaning up chart:', err);
    }
}
//# sourceMappingURL=chart.js.map