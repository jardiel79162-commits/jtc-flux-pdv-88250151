import { ArrowLeft, ShoppingCart, Package, TrendingUp, Users, BarChart3, Settings, Gift, Shield, Zap, Star, Clock, Code, Heart, Award, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import logo from "@/assets/logo.jpg";

const VideoLoop = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const attemptPlay = async () => {
      try { await video.play(); } catch {
        video.muted = true;
        try { await video.play(); } catch {}
      }
    };
    attemptPlay();
    const handleEnded = () => { video.currentTime = 0; video.play().catch(() => {}); };
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [src]);
  return <video ref={videoRef} src={src} autoPlay loop muted playsInline preload="auto" className="w-full h-auto" />;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, delay, ease: EASE },
});

const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.9 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, delay, ease: EASE },
});

const About = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
  }, []);

  const features = [
    { icon: ShoppingCart, title: "PDV Rápido", desc: "Ponto de venda intuitivo com finalização em segundos.", color: "from-primary to-primary/70" },
    { icon: Package, title: "Controle de Estoque", desc: "Gerencie produtos, categorias e estoque mínimo.", color: "from-accent to-accent/70" },
    { icon: Users, title: "Gestão de Clientes", desc: "Cadastre clientes, controle saldos e fiado.", color: "from-[hsl(var(--success))] to-[hsl(var(--success))]/70" },
    { icon: TrendingUp, title: "Fornecedores", desc: "Organize seus fornecedores e compras.", color: "from-primary to-accent" },
    { icon: BarChart3, title: "Relatórios", desc: "Métricas detalhadas de vendas, lucros e desempenho.", color: "from-[hsl(var(--warning))] to-[hsl(var(--warning))]/70" },
    { icon: Settings, title: "Configurações", desc: "Personalize cores, logo, PIX e muito mais.", color: "from-muted-foreground to-muted-foreground/70" },
    { icon: Gift, title: "Programa de Indicação", desc: "Indique amigos e ganhe dias extras de uso.", color: "from-accent to-[hsl(var(--success))]" },
    { icon: Shield, title: "Segurança", desc: "Dados criptografados e protegidos com RLS.", color: "from-primary to-primary/60" },
  ];

  const plans = [
    { name: "Teste Grátis", price: "R$ 0", period: "3 dias", desc: "Experimente todas as funcionalidades. Compartilhe e ganhe mais tempo!", highlight: false },
    { name: "Trimestral", price: "R$ 29,99", period: "/3 meses", desc: "Acesso completo por 3 meses com ótimo custo-benefício.", highlight: true },
    { name: "Anual", price: "R$ 69,99", period: "/ano", desc: "O melhor plano! Acesso completo por 1 ano inteiro.", highlight: false },
  ];

  const stats = [
    { label: "Funcionalidades", value: "20+", icon: Zap },
    { label: "Segurança", value: "100%", icon: Shield },
    { label: "Suporte", value: "24/7", icon: Clock },
    { label: "Atualizações", value: "Constantes", icon: Star },
  ];

  const inclusos = [
    "PDV completo com múltiplos pagamentos",
    "Controle de estoque em tempo real",
    "Cadastro ilimitado de produtos",
    "Gestão de clientes e fiado",
    "Relatórios detalhados de vendas",
    "Calculadora de taxas PIX",
    "Histórico completo de vendas",
    "Gestão de fornecedores",
    "Código de barras / Scanner",
    "Auri — Assistente IA integrada",
    "Personalização de cores e logo",
    "Suporte via WhatsApp",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(isLoggedIn ? "/dashboard" : "/auth")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {isLoggedIn ? "Voltar ao Dashboard" : "Voltar ao Login"}
          </Button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="JTC FluxPDV" className="w-8 h-8 rounded-full object-cover" />
            <span className="font-bold text-sm bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">JTC FluxPDV</span>
          </div>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-6">
          <motion.div className="flex justify-center" {...scaleIn()}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur-xl opacity-40 animate-pulse" />
              <img src={logo} alt="JTC FluxPDV" className="relative w-28 h-28 rounded-full object-cover shadow-2xl ring-4 ring-primary/20" />
            </div>
          </motion.div>
          <motion.div {...fadeUp(0.15)}>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              JTC FluxPDV
            </h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
              O sistema de Ponto de Venda mais completo e acessível para micro e pequenos empreendedores.
              Gerencie vendas, estoque, clientes, fornecedores e muito mais em um só lugar.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {stats.map((stat, i) => (
              <motion.div key={i} {...scaleIn(0.1 + i * 0.08)} className="bg-card rounded-xl p-4 border border-border/50 shadow-sm text-center">
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-xl font-black text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Video */}
        <motion.section className="space-y-4" {...fadeUp()}>
          <h2 className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            Veja o Sistema em Ação
          </h2>
          <motion.div {...scaleIn(0.1)} className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
            <VideoLoop src="/videos/about-video.mp4" />
          </motion.div>
        </motion.section>

        <Separator className="my-8" />

        {/* Funcionalidades */}
        <motion.section className="space-y-6" {...fadeUp()}>
          <h2 className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-accent" />
            Funcionalidades
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div key={i} {...fadeUp(i * 0.06)}>
                <Card className="border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shrink-0 shadow-md`}>
                      <f.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <Separator className="my-8" />

        {/* Planos */}
        <motion.section className="space-y-6" {...fadeUp()}>
          <h2 className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Planos e Preços
          </h2>
          <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto">
            Comece com 3 dias grátis, sem cartão de crédito. Escolha o plano ideal para o seu negócio.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan, i) => (
              <motion.div key={i} {...scaleIn(i * 0.08)}>
                <Card className={`border-border/50 relative overflow-hidden ${plan.highlight ? "ring-2 ring-primary shadow-xl shadow-primary/10" : ""}`}>
                  {plan.highlight && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
                      Popular
                    </div>
                  )}
                  <CardContent className="p-6 text-center space-y-2">
                    <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-black text-primary">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <Separator className="my-8" />

        {/* O que está incluso */}
        <motion.section className="space-y-4" {...fadeUp()}>
          <h2 className="text-2xl font-bold text-center text-foreground">O que está incluso em todos os planos?</h2>
          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inclusos.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Star className="w-3 h-3 text-accent" />
                  </div>
                  {item}
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.section>

        <Separator className="my-8" />

        {/* Desenvolvedor */}
        <motion.section className="space-y-4" {...fadeUp()}>
          <h2 className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
            <Code className="w-6 h-6 text-primary" />
            Sobre o Desenvolvedor
          </h2>
          <motion.div {...scaleIn(0.1)}>
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-6 md:p-8 text-center space-y-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-xl"
                >
                  <span className="text-3xl font-black text-white">J</span>
                </motion.div>
                <div>
                  <h3 className="text-xl font-black text-foreground">Jardiel De Sousa Lopes</h3>
                  <p className="text-primary font-semibold text-sm">Criador da JTC</p>
                </div>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
                  Desenvolvedor apaixonado por tecnologia e inovação. Criou o JTC FluxPDV com o objetivo de democratizar
                  o acesso a sistemas de gestão profissionais para micro e pequenos empreendedores brasileiros.
                  Cada funcionalidade foi pensada para simplificar o dia a dia de quem empreende.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <motion.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <Heart className="w-4 h-4 text-destructive" />
                  </motion.div>
                  Feito com dedicação no Brasil 🇧🇷
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.section>

        {/* CTA */}
        <motion.section className="text-center space-y-4 pb-8" {...fadeUp()}>
          <h2 className="text-2xl font-bold text-foreground">Pronto para começar?</h2>
          <p className="text-muted-foreground">
            {isLoggedIn ? "Volte ao sistema e continue gerenciando seu negócio." : "Crie sua conta agora e teste grátis por 3 dias."}
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => navigate(isLoggedIn ? "/dashboard" : "/auth")}
              className="h-12 px-8 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg"
            >
              {isLoggedIn ? "Ir para o Dashboard" : "Criar Conta Grátis"}
            </Button>
          </motion.div>
        </motion.section>

        {/* Footer */}
        <motion.div {...fadeUp()} className="border-t border-border/50 pt-6 pb-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} JTC FluxPDV — Todos os direitos reservados
          </p>
          <p className="text-xs text-muted-foreground">
            Desenvolvido por <strong>Jardiel De Sousa Lopes</strong> — Criador da JTC
          </p>
          <Button variant="link" onClick={() => navigate("/politica-de-privacidade")} className="text-xs text-muted-foreground">
            Política de Privacidade
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
