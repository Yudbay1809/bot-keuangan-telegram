interface ChartData {
    labels: string[];
    values: number[];
    colors?: string[];
    title: string;
}
export declare function generateTextPieChart(data: ChartData): string;
export declare function generateTextBarChart(data: ChartData): string;
export declare function generatePieChart(data: ChartData): Promise<string>;
export declare function generateBarChart(data: ChartData): Promise<string>;
export declare function cleanupChart(_filePath: string): Promise<void>;
export {};
//# sourceMappingURL=chart.d.ts.map