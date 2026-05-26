import { cn } from "@/lib/utils";
import type { Platform } from "@/types/entities";

const platforms = {
  instagram: { label: "Instagram", color: "bg-gradient-to-br from-purple-600 to-pink-500", char: "IG" },
  tiktok: { label: "TikTok", color: "bg-black", char: "TT" },
  facebook: { label: "Facebook", color: "bg-blue-600", char: "FB" },
  youtube: { label: "YouTube", color: "bg-red-600", char: "YT" },
  shopee: { label: "Shopee", color: "bg-orange-500", char: "SH" },
  mercadolivre: { label: "Mercado Livre", color: "bg-yellow-400", char: "ML" },
  twitter: { label: "Twitter", color: "bg-sky-500", char: "X" },
};

type PlatformIconProps = {
  platform?: Platform;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export default function PlatformIcon({ platform = "", size = "md", showLabel = false, className }: PlatformIconProps) {
  const config = platforms[platform] || { label: platform, color: "bg-muted", char: "?" };
  const sizeClass = size === "sm" ? "w-6 h-6 text-[9px]" : size === "lg" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0", config.color, sizeClass)}>
        {config.char}
      </div>
      {showLabel && <span className="min-w-0 truncate text-sm font-medium text-foreground">{config.label}</span>}
    </div>
  );
}
