// src/pages/Admin/DeleteConfirmDialog.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  onConfirm: () => void;
  loading: boolean;
}

export function DeleteConfirmDialog({ 
  open, 
  onOpenChange, 
  candidateName, 
  onConfirm, 
  loading 
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete Candidate</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this candidate?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm">
            This action cannot be undone. This will permanently delete the candidate:
          </p>
          <p className="font-medium text-destructive mt-2 p-2 bg-destructive/10 rounded">
            {candidateName}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            All associated test data and progress will also be deleted.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Candidate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}