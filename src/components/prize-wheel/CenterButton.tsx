export const CenterButton = ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[60px] h-[60px] rounded-full flex items-center justify-center text-white font-extrabold text-xs uppercase tracking-wider disabled:opacity-40 transition-transform active:scale-90 select-none"
    style={{
      background: disabled
        ? "#475569"
        : "conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
      boxShadow: disabled ? "none" : "0 0 20px 4px rgba(139,92,246,0.4), inset 0 0 8px rgba(255,255,255,0.2)",
      border: "3px solid rgba(255,255,255,0.7)",
      animation: disabled ? "none" : "spin-rainbow 3s linear infinite",
    }}
  >
    <span className="drop-shadow-lg">GIRAR</span>
  </button>
);
