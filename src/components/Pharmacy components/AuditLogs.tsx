import React, { useState } from 'react';
import { useAuditLog } from '@/Pharmacy contexts/AuditLogContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import { reportExporter } from '@/pharmacy utilites/reportExporter';
import { toast } from '@/components/ui/use-toast';

interface AuditLogsProps {
  isUrdu: boolean;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ isUrdu }) => {
  const { logs, refreshLogs } = useAuditLog();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const text = {
    en: {
      title: 'Audit Logs',
      searchPlaceholder: 'Search logs...',
      user: 'User',
      action: 'Action',
      entity: 'Entity',
      timestamp: 'Timestamp',
      details: 'Details',
      filterAll: 'All Actions',
      start: 'Start',
      end: 'End',
      export: 'Export Logs'
    },
    ur: {
      title: 'آڈٹ لاگز',
      searchPlaceholder: 'لاگز تلاش کریں...',
      user: 'صارف',
      action: 'عمل',
      entity: 'ادارہ',
      timestamp: 'وقت',
      details: 'تفصیلات',
      filterAll: 'تمام اعمال',
      export: 'لاگز ایکسپورٹ کریں'
    }
  };

  const t = isUrdu ? text.ur : text.en;

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DELETE')) return 'destructive';
    if (action.includes('ADD')) return 'default';
    if (action.includes('EDIT')) return 'outline';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'secondary';
    return 'default';
  };

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log =>
      (filterAction === 'all' || log.action === filterAction) &&
      (startDate ? log.timestamp >= new Date(startDate) : true) &&
      (endDate ? log.timestamp <= new Date(endDate + 'T23:59:59') : true) &&
      (
        (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [logs, filterAction, startDate, endDate, searchTerm]);

  // Reset to first page when filters/search change
  React.useEffect(() => { setPage(1); }, [filterAction, startDate, endDate, searchTerm]);

  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  const handleExportLogs = async (format: 'pdf' | 'excel') => {
    try {
      setIsExporting(true);
      
      const exportData = {
        title: `Audit_Logs_${new Date().toISOString().split('T')[0]}`,
        headers: [
          'Timestamp',
          'User',
          'Action',
          'Entity ID',
          'Details',
          'Status'
        ],
        data: filteredLogs.map(log => [
          log.timestamp.toLocaleString(),
          log.userName,
          log.action.replace('_', ' '),
          log.entityId || 'N/A',
          log.details,
          'Completed'
        ]),
        metadata: {
          'Report Type': 'Audit Logs',
          'Total Logs': filteredLogs.length.toString(),
          'Date Range': 'All Time',
          'Generated At': new Date().toLocaleString(),
          'Branch': 'Main Branch'
        }
      };

      if (format === 'pdf') {
        reportExporter.exportToPDF(exportData);
      } else {
        reportExporter.exportToExcel(exportData);
      }

      toast({
        title: isUrdu ? 'لاگز ایکسپورٹ ہو گئے' : 'Logs Exported',
        description: isUrdu 
          ? `آڈٹ لاگز کامیابی سے ${format === 'pdf' ? 'پی ڈی ایف' : 'ایکسل'} میں ایکسپورٹ ہو گئے`
          : `Audit logs successfully exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: isUrdu ? 'خرابی' : 'Error',
        description: isUrdu 
          ? 'لاگز ایکسپورٹ کرتے وقت خرابی آئی ہے' 
          : 'Failed to export logs',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={async () => {
              setIsRefreshing(true);
              await refreshLogs();
              setIsRefreshing(false);
              toast({
                title: 'Logs refreshed',
                description: `Updated at ${new Date().toLocaleTimeString()}`,
              });
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleExportLogs('pdf')}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {t.export} PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleExportLogs('excel')}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {t.export} Excel
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background"
        >
          <option value="all">{t.filterAll}</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
          <option value="ADD_INVENTORY">Add Inventory</option>
          <option value="EDIT_INVENTORY">Edit Inventory</option>
          <option value="DELETE_INVENTORY">Delete Inventory</option>
          <option value="ADD_CUSTOMER">Add Customer</option>
          <option value="EDIT_CUSTOMER">Edit Customer</option>
          <option value="DELETE_CUSTOMER">Delete Customer</option>
          <option value="ADD_SUPPLIER">Add Supplier</option>
          <option value="EDIT_SUPPLIER">Edit Supplier</option>
          <option value="DELETE_SUPPLIER">Delete Supplier</option>
          <option value="EXPENSE_ADD">Add Expense</option>
          <option value="ADD_USER">Add User</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background"
          placeholder="Start"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background"
          placeholder="End"
        />
      </div>

      {/* Audit Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedLogs.map((log, idx) => (
              <div key={(log as any).id || (log as any)._id || `${log.entityId || 'log'}-${idx}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{log.userName}</span>
                      <Badge variant={getActionBadgeColor(log.action) as any}>
                        {log.action.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{log.details}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{(log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)).toLocaleString()}</span>
                      {log.entityId && <span>Entity: {log.entityId}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {paginatedLogs.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-10">No logs found for the selected filters.</div>
            )}
          </div>
          {/* Pagination controls */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{totalItems === 0 ? 0 : startIndex + 1}</span>–
              <span className="font-medium">{Math.min(startIndex + pageSize, totalItems)}</span> of
              <span className="font-medium"> {totalItems}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="px-3 py-2 border rounded-md bg-background"
                value={pageSize}
                onChange={(e) => { setPage(1); setPageSize(parseInt(e.target.value, 10)); }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={currentPage === 1}>First</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                <div className="px-2 text-sm">Page {currentPage} of {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>Last</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
