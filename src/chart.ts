import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

// Register Chart.js components
Chart.register(...registerables);

interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
  title: string;
}

const DEFAULT_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
];

export async function generatePieChart(data: ChartData): Promise<string> {
  const { labels, values, title } = data;
  const colors = data.colors || DEFAULT_COLORS.slice(0, labels.length);
  
  // Create canvas
  const width = 600;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const config: ChartConfiguration = {
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
  
  const chart = new Chart(ctx as any, config);
  chart.update();
  
  // Save to file
  const tempDir = process.env.TEMP_DIR || './data';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const filePath = path.join(tempDir, `chart_${Date.now()}.png`);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);
  
  chart.destroy();
  
  return filePath;
}

export async function generateBarChart(data: ChartData): Promise<string> {
  const { labels, values, title } = data;
  const colors = data.colors || DEFAULT_COLORS.slice(0, labels.length);
  
  const width = 600;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const config: ChartConfiguration = {
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
            callback: (value: any) => 'Rp ' + Number(value).toLocaleString('id-ID')
          }
        }
      }
    }
  };
  
  const chart = new Chart(ctx as any, config);
  chart.update();
  
  const tempDir = process.env.TEMP_DIR || './data';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const filePath = path.join(tempDir, `chart_${Date.now()}.png`);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);
  
  chart.destroy();
  
  return filePath;
}

export async function cleanupChart(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error cleaning up chart:', err);
  }
}