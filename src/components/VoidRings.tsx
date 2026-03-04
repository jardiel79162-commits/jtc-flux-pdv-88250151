import { motion } from "framer-motion";

const VoidRings = () => {
  const rings = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
      {rings.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-void-glow/10"
          style={{
            width: `${(i + 1) * 120}px`,
            height: `${(i + 1) * 120}px`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.15, 0.05],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 12 + i * 4,
            repeat: Infinity,
            ease: "linear",
            delay: i * 1.5,
          }}
        />
      ))}
      {/* Central glow */}
      <motion.div
        className="absolute w-4 h-4 rounded-full bg-void-glow/30"
        animate={{
          scale: [1, 2, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{ boxShadow: "0 0 60px 20px hsla(220, 80%, 45%, 0.15)" }}
      />
    </div>
  );
};

export default VoidRings;
