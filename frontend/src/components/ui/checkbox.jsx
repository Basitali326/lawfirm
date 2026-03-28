import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }) {
  return (
    <input
      type="checkbox"
      className={cn("h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-400", className)}
      {...props}
    />
  );
}

export { Checkbox };

