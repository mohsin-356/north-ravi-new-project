import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { medicineService } from '@/services/medicineService';

type DeleteMedicineProps = {
  medicineId: string;
  medicineName: string;
  onDeleted: () => void;
};

export function DeleteMedicine({ 
  medicineId, 
  medicineName,
  onDeleted 
}: DeleteMedicineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      const success = await medicineService.deleteMedicine(medicineId);
      
      if (!success) {
        throw new Error('Failed to delete medicine');
      }
      
      toast({
        title: 'Medicine Deleted',
        description: `${medicineName} has been removed`,
      });
      
      onDeleted();
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: `Could not delete ${medicineName}`,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button 
        variant="destructive" 
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        Delete
      </Button>
      
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {medicineName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
