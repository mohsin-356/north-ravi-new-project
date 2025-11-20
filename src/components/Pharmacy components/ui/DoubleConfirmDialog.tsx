import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

interface DoubleConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  checklist?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DoubleConfirmDialog: React.FC<DoubleConfirmDialogProps> = ({
  open,
  title = 'Confirm Deletion',
  description = 'This action is irreversible. Do you want to proceed?',
  // checklist ignored to simplify UX globally
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel
}) => {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 text-gray-700">{description}</div>
        <DialogFooter className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
