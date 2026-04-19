interface ChartData {
    labels: string[];
    values: number[];
    colors?: string[];
    title: string;
}
export declare function generatePieChart(data: ChartData): Promise<string>;
export declare function generateBarChart(data: ChartData): Promise<string>;
export declare function cleanupChart(filePath: string): Promise<void>;
export {};
//# sourceMappingURL=chart.d.ts.map