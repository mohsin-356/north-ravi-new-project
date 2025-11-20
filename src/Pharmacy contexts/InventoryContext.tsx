import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getInventory, addInventoryItem, InventoryItem } from '@/pharmacy utilites/inventoryService';

interface InventoryContextType {
  inventory: InventoryItem[];
  lastRefreshedAt: Date | null;
  refreshInventory: () => Promise<void>;
  addItemToInventory: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const refreshInventory = async () => {
    try {
      const data = await getInventory();
      if (data && data.length) console.log('Fetched inventory sample', data[0]);
      setInventory(data);
      setLastRefreshedAt(new Date());
    } catch (error) {
      console.error('Failed to refresh inventory:', error);
    }
  };

  const addItemToInventory = async (item: Omit<InventoryItem, 'id'>) => {
    try {
      await addInventoryItem(item);
      await refreshInventory();
    } catch (error) {
      console.error('Failed to add item to inventory:', error);
      throw error;
    }
  };

  // Load inventory on mount
  useEffect(() => {
    refreshInventory();
    // eslint-disable-next-line
  }, []);

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        lastRefreshedAt,
        refreshInventory,
        addItemToInventory,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
