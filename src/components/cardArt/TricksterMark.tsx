interface TricksterMarkProps {
  size: "default" | "small" | "tiny";
}

export function TricksterMark({ size }: TricksterMarkProps) {
  const fontSize = size === "tiny" ? "text-[14px]" : size === "small" ? "text-2xl" : "text-4xl";
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      aria-hidden
    >
      <span className={`${fontSize} text-fuchsia-500/30 leading-none`}>◑</span>
    </div>
  );
}
