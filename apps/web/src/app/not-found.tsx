import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-[#05070d] px-6 text-center text-white">
      <h1 className="font-display text-xl font-bold text-glow-cyan">Room not found</h1>
      <p className="max-w-sm text-sm text-white/60">This page or room code doesn&apos;t exist, or the room has ended.</p>
      <Link
        href="/"
        className="rounded-full border-2 border-cyan-glow/50 px-6 py-2 text-sm font-semibold text-cyan-glow transition hover:bg-cyan-glow/10 focus-visible:ring-4 focus-visible:ring-cyan-glow/60"
      >
        Back to lobby
      </Link>
    </div>
  );
}
