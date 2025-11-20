import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const ReceptionPortal: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reception Portal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-500">
            Welcome to the reception portal. This area is restricted to reception staff only.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceptionPortal;
