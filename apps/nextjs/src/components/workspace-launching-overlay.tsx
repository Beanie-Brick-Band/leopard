import { Spinner } from "@package/ui/spinner";

export function WorkspaceLaunchingOverlay({
  isLaunching,
}: {
  isLaunching: boolean;
}) {
  if (!isLaunching) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background flex flex-col items-center gap-4 rounded-lg border p-8 shadow-lg">
        <Spinner className="size-8" />
        <div className="text-center">
          <p className="text-lg font-semibold">Launching workspace</p>
          <p className="text-muted-foreground text-sm">
            This should take around 30 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
