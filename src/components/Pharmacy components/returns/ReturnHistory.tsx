import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

type ReturnHistoryItem = {
  id: string;
  date: Date;
  type: 'customer' | 'supplier';
  medicineName: string;
  quantity: number;
  reason: string;
  processedBy: string;
};

const columns: ColumnDef<ReturnHistoryItem>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => row.original.date.toLocaleDateString(),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant={row.original.type === 'customer' ? 'default' : 'destructive'}>
        {row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: 'medicineName',
    header: 'Medicine',
  },
  {
    accessorKey: 'quantity',
    header: 'Qty',
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
  },
  {
    accessorKey: 'processedBy',
    header: 'Processed By',
  },
];

export function ReturnHistory({ data }: { data: ReturnHistoryItem[] }) {
  return <DataTable columns={columns} data={data} />;
}
