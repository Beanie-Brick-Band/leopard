import { Suspense } from "react";

import { TextReplayScrubberComponent } from "~/components/scrubber";

export default function ReplayPage() {
  return (
    <div className="px-16 pt-4">
      <Suspense>
        <TextReplayScrubberComponent />
      </Suspense>
    </div>
  );
}
