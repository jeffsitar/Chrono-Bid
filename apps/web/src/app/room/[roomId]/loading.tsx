export default function RoomLoading() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-[#05070d] text-white" role="status" aria-live="polite">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-glow/30 border-t-cyan-glow" aria-hidden />
      <p className="text-sm text-white/60">Entering the table…</p>
    </div>
  );
}
