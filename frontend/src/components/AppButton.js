"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppButton({
  title,
  loading = false,
  disabled = false,
  children,
  className,
  ...props
}) {
  const content = children ?? title;

  return (
    <Button
      className={cn("cursor-pointer", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {content || "Loading"}
        </span>
      ) : (
        content
      )}
    </Button>
  );
}