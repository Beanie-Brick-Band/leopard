"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";
import { Button } from "@package/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@package/ui/card";
import { Input } from "@package/ui/input";
import { Label } from "@package/ui/label";

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

  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const hasStarterCode = !!assignment?.starterCodeStorageKey;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be under 50MB");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { uploadUrl, storageKey } = await getUploadUrl({
        assignmentId,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", "application/zip");
        xhr.send(file);
      });

      await saveKey({ assignmentId, storageKey });
      toast.success("Starter code uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = "";
    }
  };

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
        <div className="space-y-2">
          <Label htmlFor="starter-code-upload">
            {hasStarterCode ? "Replace" : "Upload"} Starter Code
          </Label>
          <Input
            id="starter-code-upload"
            type="file"
            accept=".zip"
            onChange={handleUpload}
            disabled={isUploading}
          />
          {isUploading && (
            <div className="space-y-1">
              <div className="bg-muted h-2 w-full rounded-full">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
