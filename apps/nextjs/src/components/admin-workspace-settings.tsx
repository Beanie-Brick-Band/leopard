"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@package/backend/convex/_generated/api";
import { Button } from "@package/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@package/ui/card";
import { Spinner } from "@package/ui/spinner";

export default function AdminWorkspaceSettings() {
  const workspaceMode = useQuery(api.web.settings.getWorkspaceMode);
  const setWorkspaceMode = useMutation(api.web.settings.setWorkspaceMode);

  if (workspaceMode === undefined) {
    return (
      <Card>
        <CardContent className="flex min-h-[120px] items-center justify-center">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  const handleChange = async (mode: "ephemeral" | "persistent") => {
    if (mode === workspaceMode) return;
    try {
      await setWorkspaceMode({ mode });
      toast.success(`Workspace mode set to ${mode}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update setting",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Mode</CardTitle>
        <CardDescription>
          Controls what type of Coder workspaces are created when students
          launch assignments. Only affects newly created workspaces.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm">
          {workspaceMode === "ephemeral" ? (
            <p className="text-muted-foreground">
              Workspaces use temporary storage. Data is lost when the workspace
              stops. No persistent volumes are created.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Workspaces use persistent volumes. Student data survives restarts
              but consumes storage quota.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={workspaceMode === "persistent" ? "default" : "outline"}
            onClick={() => handleChange("persistent")}
          >
            Persistent
          </Button>
          <Button
            size="sm"
            variant={workspaceMode === "ephemeral" ? "default" : "outline"}
            onClick={() => handleChange("ephemeral")}
          >
            Ephemeral
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
