import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Package, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';
import InventoryControl from './InventoryControl';
import ReturnsPage from './ReturnsPage';

interface InventoryAndReturnsProps {
  isUrdu: boolean;
}

const InventoryAndReturns: React.FC<InventoryAndReturnsProps> = ({ isUrdu }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Package className="h-6 w-6 mr-2" />
          {isUrdu ? 'انوینٹری' : 'Inventory'}
        </h1>
      </div>
      <Card>
        <CardContent className="p-4">
          <InventoryControl />
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryAndReturns;
