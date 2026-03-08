import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import mascotImg from "@/assets/404-mascot.png";

/* ── floating particles ── */
const Particles = () => {
  const dots = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        dur: Math.random() * 6 + 4,
        delay: Math.random() * 4,
        opacity: Math.random() * 0.5 + 0.15,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <motion.div
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            background: `rgba(59,130,246,${d.opacity})`,
            boxShadow: `0 0 ${d.size * 3}px rgba(59,130,246,${d.opacity * 0.6})`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [d.opacity, d.opacity * 1.8, d.opacity],
          }}
          transition={{
            duration: d.dur,
            repeat: Infinity,
            delay: d.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#040d21]">
      {/* grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <Particles />

      {/* radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

      {/* content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4 px-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* mascot video with poster for instant display */}
        <div className="relative mx-auto w-full max-w-md">
          <video
            ref={videoRef}
            src="/videos/404-mascot.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={mascotImg}
            className="w-full rounded-2xl"
          />
        </div>

        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          404{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            — Página perdida
          </span>
        </h1>

        <p className="max-w-md text-base text-blue-200/70 sm:text-lg">
          Parece que essa página se perdeu no fluxo de dados do sistema.
        </p>

        <Button
          size="lg"
          onClick={() => navigate("/")}
          className="mt-4 gap-2 bg-blue-600 text-white hover:bg-blue-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o sistema
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
