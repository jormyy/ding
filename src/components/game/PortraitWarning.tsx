"use client";

export default function PortraitWarning() {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-gray-950 gap-6 px-8 text-center">
      <div className="text-7xl animate-wiggle">📱</div>
      <div className="flex flex-col gap-2">
        <p className="text-white text-xl font-black tracking-tight">Rotate your phone</p>
        <p className="text-gray-400 text-sm">This game works best in landscape mode</p>
      </div>
    </div>
  );
}
