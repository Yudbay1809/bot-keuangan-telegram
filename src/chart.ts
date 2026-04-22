// Text-based chart visualization for environments without native canvas support.

interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
  title: string;
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0.0";
  return ((value / total) * 100).toFixed(1);
}

function makeBarByPercent(percent: number, width = 24): string {
  const raw = Math.round((percent / 100) * width);
  const filled = percent > 0 ? Math.max(1, raw) : 0;
  const clampedFilled = Math.min(width, filled);
  const empty = width - clampedFilled;
  return `[${"#".repeat(clampedFilled)}${"-".repeat(empty)}]`;
}

export function generateTextPieChart(data: ChartData): string {
  const { labels, values, title } = data;
  const total = values.reduce((a, b) => a + b, 0);

  let result = `*${title}*\n\n`;

  for (let i = 0; i < labels.length; i++) {
    const value = values[i] ?? 0;
    const percent = Number(formatPercent(value, total));
    const bar = makeBarByPercent(percent);

    result += `${labels[i]}\n`;
    result += `${bar} ${percent.toFixed(1)}%\n`;
    result += `Rp ${value.toLocaleString("id-ID")}\n\n`;
  }

  return result;
}

export function generateTextBarChart(data: ChartData): string {
  const { labels, values, title } = data;
  const maxValue = Math.max(...values, 0);
  const total = values.reduce((a, b) => a + b, 0);

  let result = `*${title}*\n\n`;

  for (let i = 0; i < labels.length; i++) {
    const value = values[i] ?? 0;
    const relativePercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const sharePercent = Number(formatPercent(value, total));
    const bar = makeBarByPercent(relativePercent);

    result += `${labels[i]}\n`;
    result += `${bar} ${sharePercent.toFixed(1)}%\n`;
    result += `Rp ${value.toLocaleString("id-ID")}\n\n`;
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
  // No cleanup needed for text charts.
}
