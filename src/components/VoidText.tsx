import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const phrases = [
  "nada",
  "∞",
  "o vazio observa",
  "tudo é nada",
  "nada é tudo",
  "silêncio",
  "entre o ser e o não-ser",
  "∅",
  "o infinito respira",
  "aqui não há tempo",
];

const VoidText = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          className="text-void-whisper/60 text-sm tracking-[0.4em] uppercase select-none"
          initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 0.6, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
          transition={{ duration: 2, ease: "easeInOut" }}
        >
          {phrases[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export default VoidText;
