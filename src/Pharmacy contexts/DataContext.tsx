import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuditLog } from './AuditLogContext';
import { api } from '@/lib/api';

export type Expense = {
  id: string;
  date: string;
  type: 'Rent' | 'Utilities' | 'Salaries' | 'Supplies' | 'Marketing' | 'Maintenance' | 'Insurance' | 'Taxes' | 'Other';
  amount: number;
  notes: string;
};

export type Sale = {
  id: string;
  date: string;
  items: Array<{
    medicineId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  customerId?: string;
};

type DataContextType = {
  expenses: Expense[];
  sales: Sale[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByDateRange: (from: string, to: string) => Expense[];
  addSale: (sale: Omit<Sale, 'id'>) => void;
  updateSale: (id: string, sale: Omit<Sale, 'id'>) => void;
  deleteSale: (id: string) => void;
  getSalesByDateRange: (from: string, to: string) => Sale[];
};

const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const { logAction } = useAuditLog();

  // Load initial data (prefer backend, fallback to localStorage)
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const res = await api.get('/pharmacy/expenses');
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setExpenses(data);
          localStorage.setItem('pharmacy_expenses', JSON.stringify(data));
          return;
        }
      } catch (e) {
        /* ignore – will fallback */
      }
      // fallback
      const storedExpenses = localStorage.getItem('pharmacy_expenses');
      if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
    };

    const loadSales = () => {
      try {
        const storedSales = localStorage.getItem('pharmacy_sales');
        if (storedSales) setSales(JSON.parse(storedSales));
      } catch (err) {
        console.error('Error loading sales:', err);
      }
    };

    loadExpenses();
    loadSales();
  }, []);

  // Save data when changed
  useEffect(() => {
    localStorage.setItem('pharmacy_expenses', JSON.stringify(expenses));
    localStorage.setItem('pharmacy_sales', JSON.stringify(sales));
  }, [expenses, sales]);

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const res = await api.post('/pharmacy/expenses', expense);
      const saved = res.data;
      setExpenses(prev => {
        const updated = [...prev, saved];
        localStorage.setItem('pharmacy_expenses', JSON.stringify(updated));
        return updated;
      });
    } catch {
      // offline fallback – local only
      const newExpense = { ...expense, id: Date.now().toString() } as Expense;
      setExpenses(prev => {
        const updated = [...prev, newExpense];
        localStorage.setItem('pharmacy_expenses', JSON.stringify(updated));
        return updated;
      });
    }
    logAction('EXPENSE_ADD', `Added expense: ${expense.type} (PKR ${expense.amount})`);
    window.dispatchEvent(new Event('expenseChanged'));
  };

  const updateExpense = async (id: string, expense: Omit<Expense, 'id'>) => {
    try {
      await api.put(`/pharmacy/expenses/${id}`, expense);
    } catch {/* ignore offline */}
    setExpenses(prev => {
      const updated = prev.map(e => e.id === id ? { ...expense, id } : e);
      localStorage.setItem('pharmacy_expenses', JSON.stringify(updated));
      return updated;
    });
    logAction('EXPENSE_UPDATE', `Updated expense: ${expense.type} (PKR ${expense.amount})`);
    window.dispatchEvent(new Event('expenseChanged'));
  };

  const deleteExpense = async (id: string) => {
    try {
      await api.delete(`/pharmacy/expenses/${id}`);
    } catch {/* ignore offline */}
    setExpenses(prev => {
      const updated = prev.filter(e => e.id !== id);
      localStorage.setItem('pharmacy_expenses', JSON.stringify(updated));
      return updated;
    });
    logAction('EXPENSE_DELETE', `Deleted expense ID: ${id}`);
    window.dispatchEvent(new Event('expenseChanged'));
  };

  const getExpensesByDateRange = (from: string, to: string) => {
    return expenses.filter(e => e.date >= from && e.date <= to);
  };

  const addSale = (sale: Omit<Sale, 'id'>) => {
    const newSale = { ...sale, id: Date.now().toString() };
    setSales(prev => [...prev, newSale]);
    logAction('SALE_ADD', `Added sale: PKR ${sale.total}`);
  };

  const updateSale = (id: string, sale: Omit<Sale, 'id'>) => {
    setSales(prev => prev.map(s => s.id === id ? { ...sale, id } : s));
    logAction('SALE_UPDATE', `Updated sale: PKR ${sale.total}`);
  };

  const deleteSale = (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
    logAction('SALE_DELETE', `Deleted sale ID: ${id}`);
  };

  const getSalesByDateRange = (from: string, to: string) => {
    return sales.filter(s => s.date >= from && s.date <= to);
  };

  return (
    <DataContext.Provider value={{
      expenses,
      sales,
      addExpense,
      updateExpense,
      deleteExpense,
      getExpensesByDateRange,
      addSale,
      updateSale,
      deleteSale,
      getSalesByDateRange
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
