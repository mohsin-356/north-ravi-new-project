import React from 'react';
import { Medicine } from '@/types/medicine';
import { Button } from '@/components/ui/button';

type CartItem = Medicine & { quantity: number };

type CartProps = {
  items: CartItem[];
  onRemove: (medicineId: string) => void;
  onUpdateQuantity: (medicineId: string, quantity: number) => void;
  onCheckout: () => void;
};

export function Cart({ items, onRemove, onUpdateQuantity, onCheckout }: CartProps) {
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="border-l p-4 h-full">
      <h2 className="text-xl font-bold mb-4">Cart</h2>
      
      {items.length === 0 ? (
        <p className="text-gray-500">Your cart is empty</p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {items.map(item => {
              const available = (item as any).stock ?? (item as any).currentStock ?? 0;
              const low = Number(available) < 10;
              return (
                <div key={item.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        min={1}
                        max={Math.max(0, Number(available) || 0)}
                        value={item.quantity}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value);
                          const maxAllowed = Math.max(0, Number(available) || 0);
                          const next = isNaN(raw) ? 1 : Math.min(Math.max(raw, 1), maxAllowed || 1);
                          onUpdateQuantity(item.id, next - item.quantity);
                        }}
                        className={`w-20 border rounded p-1 ${low ? 'border-red-400' : ''}`}
                      />
                      <span className="text-sm">× Rs. {item.price.toFixed(2)}</span>
                      <span className={`text-xs ${low ? 'text-red-600' : 'text-gray-500'}`}>
                        Avail: {Math.max(0, Number(available) || 0)}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onRemove(item.id)}
                    className="text-red-500"
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between font-bold mb-4">
              <span>Total:</span>
              <span>Rs. {total.toFixed(2)}</span>
            </div>
            <Button 
              className="w-full"
              onClick={onCheckout}
            >
              Checkout
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
