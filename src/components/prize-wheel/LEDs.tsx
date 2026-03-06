import { motion } from "framer-motion";

export const LEDs = ({ active }: { active: boolean }) => {
  const count = 24;
  const r = 182;
  const c = 186;
  const colors = ["#facc15", "#ef4444", "#3b82f6", "#10b981"];

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width: 372, height: 372 }}>
      {Array.from({ length: count }).map((_, i) => {
        const a = ((i * 360) / count - 90) * (Math.PI / 180);
        const x = c + r * Math.cos(a);
        const y = c + r * Math.sin(a);
        const col = colors[i % colors.length];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: 8, height: 8, left: x - 4, top: y - 4, backgroundColor: col, boxShadow: `0 0 8px 2px ${col}80` }}
            animate={active ? { opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] } : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: active ? 0.25 : 1.5, repeat: Infinity, delay: i * (active ? 0.04 : 0.08), ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
};
