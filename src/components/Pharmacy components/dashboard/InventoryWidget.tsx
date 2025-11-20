import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useInventoryData } from '@/hooks/useInventoryData';

export function InventoryWidget() {
  const { totalItems, lowStockItems, isLoading } = useInventoryData();
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Inventory Summary
        </CardTitle>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="h-4 w-4 text-muted-foreground"
        >
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalItems}</div>
        <p className="text-xs text-muted-foreground">
          {isLoading ? 'Loading...' : `${lowStockItems} items low in stock`}
        </p>
      </CardContent>
    </Card>
  );
}
