"use client";


export interface TooltipItem {
  label: string;
  value: string;
  color?: string;
  dashed?: boolean;
}

interface ChartTooltipProps {
  x: number; // percentage or px
  y: number; // percentage or px
  title: string;
  items: TooltipItem[];
  visible: boolean;
  align?: "left" | "right" | "center";
}

export function ChartTooltip({
  x,
  y,
  title,
  items,
  visible,
  align = "center",
}: ChartTooltipProps) {
  if (!visible) return null;

  let transform = "translate(-50%, -100%)";
  if (align === "left") transform = "translate(0%, -100%)";
  if (align === "right") transform = "translate(-100%, -100%)";

  return (
    <div
      className="absolute pointer-events-none z-20 transition-all duration-75 ease-out"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `${transform} translateY(-8px)`,
      }}
      role="tooltip"
      aria-hidden={!visible}
    >
      <div className="bg-neutral-900/95 backdrop-blur-sm text-white text-[11px] rounded-8 px-3 py-2 shadow-lg border border-neutral-800 min-w-[130px] space-y-1">
        <p className="font-semibold text-neutral-300 pb-1 border-b border-neutral-800">
          {title}
        </p>
        <div className="space-y-0.5 pt-0.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                {item.color && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: item.color,
                      border: item.dashed ? "1px dashed #ffffff" : undefined,
                    }}
                  />
                )}
                <span className="text-neutral-400">{item.label}</span>
              </div>
              <span className="font-mono font-medium text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
