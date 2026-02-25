import { Transaction, Filters } from './schema';
import { generateTransactions } from './generator';

let cachedTransactions: Transaction[] | null = null;

export function getTransactions(): Transaction[] {
  if (!cachedTransactions) {
    cachedTransactions = generateTransactions(5500, 42);
  }
  return cachedTransactions;
}

export function filterTransactions(transactions: Transaction[], filters: Filters): Transaction[] {
  return transactions.filter(t => {
    if (filters.country && filters.country !== 'all' && t.country !== filters.country) return false;
    if (filters.paymentMethod && filters.paymentMethod !== 'all' && t.paymentMethod !== filters.paymentMethod) return false;
    if (filters.processor && filters.processor !== 'all' && t.processor !== filters.processor) return false;
    if (filters.status && filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.dateFrom && t.timestamp < filters.dateFrom) return false;
    if (filters.dateTo && t.timestamp > filters.dateTo) return false;
    return true;
  });
}
