import React, { createContext, useContext, useMemo, useState } from 'react';

export type CartLine = { id: string; name: string; price: number; quantity: number };

type Ctx = {
  items: CartLine[];
  addItem: (item: { id: string; name: string; price: number }, quantity?: number, maxStock?: number) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  subtotal: number;
};

const CartContext = createContext<Ctx | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartLine[]>([]);

  const addItem: Ctx['addItem'] = (item, quantity = 1, maxStock) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        const max = typeof maxStock === 'number' ? maxStock : Number.POSITIVE_INFINITY;
        next[idx] = { ...next[idx], quantity: Math.min(next[idx].quantity + quantity, max) };
        return next;
      }
      return [...prev, { ...item, quantity: Math.max(1, quantity) }];
    });
  };

  const updateQty: Ctx['updateQty'] = (id, qty) => {
    setItems(prev => prev.map(p => p.id === id ? { ...p, quantity: Math.max(1, qty) } : p));
  };

  const removeItem: Ctx['removeItem'] = (id) => setItems(prev => prev.filter(p => p.id !== id));
  const clear: Ctx['clear'] = () => setItems([]);
  const subtotal = useMemo(() => items.reduce((s, p) => s + p.price * p.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clear, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
