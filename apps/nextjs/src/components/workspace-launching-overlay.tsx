import { CheckCircle2 } from "lucide-react";

import { Button } from "@package/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@package/ui/dialog";
import { Spinner } from "@package/ui/spinner";

export function WorkspaceLaunchingOverlay({
  isLaunching,
  workspaceUrl,
  onClose,
}: {
  isLaunching: boolean;
  workspaceUrl: string | null;
  onClose: () => void;
}) {
  const isOpen = isLaunching || Boolean(workspaceUrl);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent showCloseButton={!isLaunching}>
        {isLaunching ? (
          <DialogHeader className="items-center">
            <Spinner className="size-8" />
            <DialogTitle>Launching workspace</DialogTitle>
            <DialogDescription>
              This should take around 30 seconds...
            </DialogDescription>
          </DialogHeader>
        ) : (
          <>
            <DialogHeader className="items-center">
              <CheckCircle2 className="size-8 text-green-500" />
              <DialogTitle>Workspace ready</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button asChild>
                <a
                  href={workspaceUrl ?? ""}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Workspace
                </a>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
