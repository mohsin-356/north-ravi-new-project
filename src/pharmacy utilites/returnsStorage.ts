export interface ReturnItem {
  id: number;
  customerName: string;
  companyName: string;
  medicineName: string;
  price: string;
  date: string;
}

export interface SupplierReturnItem {
  id: number;
  companyName: string;
  supplierName: string;
  totalStockPrice: number;
  totalStockQuantity: number;
  date: string;
}

const RETURNS_STORAGE_KEY = 'pharmacy_returns';
const SUPPLIER_RETURNS_KEY = 'pharmacy_supplier_returns';

export const saveReturn = (returnItem: Omit<ReturnItem, 'id' | 'date'>): ReturnItem => {
  const returns = getReturns();
  const newReturn: ReturnItem = {
    ...returnItem,
    id: Date.now(),
    date: new Date().toISOString(),
  };
  
  const updatedReturns = [...returns, newReturn];
  localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(updatedReturns));
  return newReturn;
};

export const getReturns = (): ReturnItem[] => {
  if (typeof window === 'undefined') return [];
  
  const savedReturns = localStorage.getItem(RETURNS_STORAGE_KEY);
  return savedReturns ? JSON.parse(savedReturns) : [];
};

export const deleteReturn = (id: number): void => {
  const returns = getReturns();
  const updatedReturns = returns.filter((item) => item.id !== id);
  localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(updatedReturns));
};

export const saveSupplierReturn = (data: Omit<SupplierReturnItem, 'id' | 'date'>): SupplierReturnItem => {
  const returns = getSupplierReturns();
  const newReturn: SupplierReturnItem = {
    ...data,
    id: Date.now(),
    date: new Date().toISOString(),
  };
  
  const updatedReturns = [...returns, newReturn];
  localStorage.setItem(SUPPLIER_RETURNS_KEY, JSON.stringify(updatedReturns));
  return newReturn;
};

export const getSupplierReturns = (): SupplierReturnItem[] => {
  if (typeof window === 'undefined') return [];
  
  const savedReturns = localStorage.getItem(SUPPLIER_RETURNS_KEY);
  return savedReturns ? JSON.parse(savedReturns) : [];
};

export const deleteSupplierReturn = (id: number): void => {
  const returns = getSupplierReturns();
  const updatedReturns = returns.filter((item) => item.id !== id);
  localStorage.setItem(SUPPLIER_RETURNS_KEY, JSON.stringify(updatedReturns));
};

export const clearReturns = (): void => {
  localStorage.removeItem(RETURNS_STORAGE_KEY);
};
