import { Context } from 'telegraf';

export interface MyContext extends Context {
  // Additional context properties if needed
}

export interface TempTransactionData {
  type: 'income' | 'expense';
  amount?: number;
  category?: string;
  description?: string;
}

export interface User {
  id: number;
  name: string;
  username?: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  date: string;
  created_at: string;
}

export interface Category {
  id: number;
  user_id: number | null;
  name: string;
  emoji: string;
}

// Default categories
export const DEFAULT_CATEGORIES = [
  { name: 'Makanan', emoji: '🍔' },
  { name: 'Transportasi', emoji: '🚗' },
  { name: 'Belanja', emoji: '🛒' },
  { name: 'Hiburan', emoji: '🎮' },
  { name: 'Kesehatan', emoji: '🏥' },
  { name: 'Gaji', emoji: '💰' },
  { name: 'Lainnya', emoji: '📦' },
];