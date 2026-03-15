"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";
import { Button } from "@package/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@package/ui/card";

import { StarterCodeUploader } from "~/components/starter-code-uploader";

export function StarterCodeCard({
  assignmentId,
}: {
  assignmentId: Id<"assignments">;
}) {
  const assignment = useQuery(api.web.assignment.getById, { id: assignmentId });
  const getUploadUrl = useAction(
    api.web.teacherAssignmentActions.getStarterCodeUploadUrl,
  );
  const saveKey = useMutation(
    api.web.teacherAssignments.saveStarterCodeKey,
  );
  const removeCode = useAction(
    api.web.teacherAssignmentActions.removeStarterCode,
  );

  const [isRemoving, setIsRemoving] = useState(false);

  const hasStarterCode = !!assignment?.starterCodeStorageKey;

  const handleRemove = async () => {
    if (!confirm("Remove starter code from this assignment?")) return;
    setIsRemoving(true);
    try {
      await removeCode({ assignmentId });
      toast.success("Starter code removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Starter Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasStarterCode ? (
          <>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Starter code uploaded</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing..." : "Remove Starter Code"}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            No starter code uploaded.
          </p>
        )}
        <StarterCodeUploader
          getUploadUrl={() => getUploadUrl({ assignmentId })}
          onUploadSuccess={async (storageKey) => {
            await saveKey({ assignmentId, storageKey });
            toast.success("Starter code uploaded");
          }}
        />
      </CardContent>
    </Card>
  );
}
