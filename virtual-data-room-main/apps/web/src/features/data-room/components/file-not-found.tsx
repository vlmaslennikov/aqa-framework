import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useSectionPrefix } from "@/lib/section";

export function FileNotFound() {
  const prefix = useSectionPrefix();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-base font-medium">File not found</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        This file does not exist, or you don't have access to it.
      </p>
      <Button render={<Link to={prefix ? "/shared-with-me" : "/"} />} variant="outline">
        {prefix ? "Back to shared with me" : "Back to data room"}
      </Button>
    </div>
  );
}
