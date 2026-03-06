import { motion } from "framer-motion";

export const Pointer = ({ active }: { active: boolean }) => (
  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
    <motion.div
      animate={active ? { rotateZ: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
      transition={{ duration: 0.5, repeat: active ? Infinity : 0, ease: "easeInOut" }}
    >
      <svg width="36" height="44" viewBox="0 0 36 44">
        <defs>
          <linearGradient id="ptrG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="ptrS"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.35)" /></filter>
        </defs>
        <path d="M18 42 L3 10 Q1 4 7 2 L18 0 L29 2 Q35 4 33 10 Z" fill="url(#ptrG)" stroke="#d97706" strokeWidth="1.5" filter="url(#ptrS)" />
        <circle cx="18" cy="11" r="3.5" fill="#fff" opacity="0.85" />
      </svg>
    </motion.div>
  </div>
);
