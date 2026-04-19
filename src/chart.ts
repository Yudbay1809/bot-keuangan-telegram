// Text-based chart visualization
// Railway doesn't support native modules - using ASCII/text charts instead

interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
  title: string;
}

export function generateTextPieChart(data: ChartData): string {
  const { labels, values, title } = data;
  const total = values.reduce((a, b) => a + b, 0);
  
  let result = `📊 *${title}*\n\n`;
  
  const emojis = ['🟣', '🔵', '🟡', '🟢', '🟣', '🟠', '⚫', '⚪'];
  
  for (let i = 0; i < labels.length; i++) {
    const percent = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0';
    const barLength = Math.round((values[i] / total) * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    
    result += `${emojis[i % emojis.length]} ${labels[i]}\n`;
    result += `   ${bar} ${percent}%\n`;
    result += `   Rp ${values[i].toLocaleString('id-ID')}\n\n`;
  }
  
  return result;
}

export function generateTextBarChart(data: ChartData): string {
  const { labels, values, title } = data;
  const maxValue = Math.max(...values);
  
  let result = `📊 *${title}*\n\n`;
  
  for (let i = 0; i < labels.length; i++) {
    const barLength = maxValue > 0 ? Math.round((values[i] / maxValue) * 20) : 0;
    const bar = '▓'.repeat(barLength) + '░'.repeat(20 - barLength);
    
    result += `${labels[i]}\n`;
    result += `   ${bar} Rp ${values[i].toLocaleString('id-ID')}\n\n`;
  }
  
  return result;
}

export async function generatePieChart(data: ChartData): Promise<string> {
  return generateTextPieChart(data);
}

export async function generateBarChart(data: ChartData): Promise<string> {
  return generateTextBarChart(data);
}

export async function cleanupChart(_filePath: string) {
  // No cleanup needed for text charts
}