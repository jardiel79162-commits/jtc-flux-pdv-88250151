import Particles from "@/components/Particles";
import VoidRings from "@/components/VoidRings";
import VoidText from "@/components/VoidText";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden cursor-none">
      {/* Deep void gradient */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse at center, hsl(240, 15%, 4%) 0%, hsl(240, 15%, 1%) 70%)",
        }}
      />

      <Particles />
      <VoidRings />
      <VoidText />

      {/* Bottom whisper */}
      <motion.div
        className="fixed bottom-8 left-0 right-0 text-center z-20 pointer-events-none"
        animate={{ opacity: [0, 0.2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      >
        <p className="text-muted-foreground text-xs tracking-[0.6em] uppercase">
          o nada infinito
        </p>
      </motion.div>
    </div>
  );
};

export default Index;
