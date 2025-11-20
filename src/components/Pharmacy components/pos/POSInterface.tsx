import React from 'react';
import { Medicine } from '@/types/medicine';

type POSInterfaceProps = {
  medicines: Medicine[];
  onAddToCart: (medicine: Medicine) => void;
  onRemoveFromCart: (medicineId: string) => void;
};

export function POSInterface({ medicines, onAddToCart, onRemoveFromCart }: POSInterfaceProps) {
  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto">
      {medicines.map(medicine => (
        <div 
          key={medicine.id} 
          className="border rounded-lg p-3 w-full flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => onAddToCart(medicine)}
        >
          <h3 className="font-medium">{medicine.name}</h3>
          <p className="text-sm text-gray-600">{medicine.category}</p>
          <p className="text-sm">Rs. {medicine.price.toFixed(2)}</p>
          {(() => {
            const available = (medicine as any).stock ?? (medicine as any).currentStock ?? 0;
            const low = Number(available) < 10;
            return (
              <p className={`text-xs ${low ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                Stock: {Math.max(0, Number(available) || 0)}
              </p>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
