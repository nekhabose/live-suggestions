'use client';

interface StatusBarProps {
  error: string | null;
  onDismiss: () => void;
}

export default function StatusBar({ error, onDismiss }: StatusBarProps) {
  if (!error) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-lg max-w-md">
      <span className="flex-1">{error}</span>
      <button onClick={onDismiss} className="text-white/70 hover:text-white text-base leading-none">
        ✕
      </button>
    </div>
  );
}
