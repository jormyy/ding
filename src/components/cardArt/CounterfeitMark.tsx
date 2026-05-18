interface CounterfeitMarkProps {
  size: "default" | "small" | "tiny";
}

export function CounterfeitMark({ size }: CounterfeitMarkProps) {
  const fontSize = size === "tiny" ? "text-[10px]" : size === "small" ? "text-base" : "text-2xl";
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      aria-hidden
    >
      <span
        className={`${fontSize} font-black tracking-widest text-rose-600/40 rotate-[-25deg]`}
      >
        Ø
      </span>
    </div>
  );
}
