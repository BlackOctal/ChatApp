import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "h-7 w-7 text-xs",
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

const dotSizeMap = {
  xs: "h-2 w-2 border",
  sm: "h-2.5 w-2.5 border",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-2",
  xl: "h-4 w-4 border-2",
};

export function Avatar({ src, name, size = "md", online, className }: AvatarProps) {
  return (
    <div className="relative inline-flex flex-shrink-0">
      <AvatarPrimitive.Root
        className={cn(
          "inline-flex items-center justify-center rounded-full overflow-hidden select-none",
          sizeMap[size],
          className
        )}
      >
        <AvatarPrimitive.Image
          src={src ?? undefined}
          alt={name}
          className="h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center bg-gray-300 font-medium text-gray-700"
          delayMs={300}
        >
          {getInitials(name)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-white bg-transparent",
            dotSizeMap[size],
            online ? "bg-green-500" : "bg-gray-400"
          )}
        />
      )}
    </div>
  );
}
