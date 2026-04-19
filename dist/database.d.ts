import Database from 'better-sqlite3';
import { Category, User, Transaction } from './types';
export declare function getDb(): Database.Database;
export declare function initDatabase(): void;
export declare function getOrCreateUser(userId: number, name: string, username?: string): User;
export declare function getCategories(userId: number): Category[];
export declare function addCategory(userId: number, name: string, emoji: string): Category;
export declare function addTransaction(userId: number, type: 'income' | 'expense', amount: number, category: string, description?: string, date?: string): Transaction;
export declare function getTransactions(userId: number, startDate?: string, endDate?: string): Transaction[];
export declare function deleteTransaction(userId: number, transactionId: number): boolean;
export declare function getMonthlyStats(userId: number, year: number, month: number): {
    income: number;
    expense: number;
};
export declare function getCategoryStats(userId: number, startDate?: string, endDate?: string): {
    category: string;
    total: number;
    type: string;
}[];
//# sourceMappingURL=database.d.ts.map