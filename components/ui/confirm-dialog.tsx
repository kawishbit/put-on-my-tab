"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isPending = false,
  isDestructive = false,
  onConfirm,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm dark:bg-black/65" />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <AlertDialog.Popup className="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-5 shadow-2xl shadow-slate-900/20 dark:border-white/10 dark:bg-slate-800/95 dark:shadow-black/40">
            <AlertDialog.Title className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {description}
            </AlertDialog.Description>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                variant="secondary"
              >
                {cancelLabel}
              </Button>
              <Button
                onClick={() => void onConfirm()}
                disabled={isPending}
                variant={isDestructive ? "danger" : "primary"}
              >
                {isPending ? "Processing..." : confirmLabel}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
