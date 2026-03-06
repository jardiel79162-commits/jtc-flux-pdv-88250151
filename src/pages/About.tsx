import { ArrowLeft, ShoppingCart, Package, TrendingUp, Users, BarChart3, Settings, Gift, Shield, Zap, Star, Clock, Code, Heart, Award, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import logo from "@/assets/logo.jpg";

const About = () => {
  const navigate = useNavigate();

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
    { name: "Teste Grátis", price: "R$ 0", period: "3 dias", desc: "Experimente todas as funcionalidades sem compromisso.", highlight: false },
    { name: "Mensal", price: "R$ 29,99", period: "/mês", desc: "Acesso completo a todas as funcionalidades.", highlight: true },
    { name: "Trimestral", price: "R$ 79,99", period: "/3 meses", desc: "Economize com o plano trimestral.", highlight: false },
    { name: "Semestral", price: "R$ 149,99", period: "/6 meses", desc: "Melhor custo-benefício para seu negócio.", highlight: false },
  ];

  const stats = [
    { label: "Funcionalidades", value: "20+", icon: Zap },
    { label: "Segurança", value: "100%", icon: Shield },
    { label: "Suporte", value: "24/7", icon: Clock },
    { label: "Atualizações", value: "Constantes", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Login
          </Button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="JTC FluxPDV" className="w-8 h-8 rounded-full object-cover" />
            <span className="font-bold text-sm bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">JTC FluxPDV</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur-xl opacity-40 animate-pulse" />
              <img src={logo} alt="JTC FluxPDV" className="relative w-28 h-28 rounded-full object-cover shadow-2xl ring-4 ring-primary/20" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              JTC FluxPDV
            </h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
              O sistema de Ponto de Venda mais completo e acessível para micro e pequenos empreendedores. 
              Gerencie vendas, estoque, clientes, fornecedores e muito mais em um só lugar.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border/50 shadow-sm text-center">
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-xl font-black text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Video */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            Veja o Sistema em Ação
          </h2>
          <div className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto"
              src="/videos/about-video.mp4"
            />
          </div>
        </section>

        <Separator className="my-8" />

        {/* Funcionalidades */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-accent" />
            Funcionalidades
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <Card key={i} className="border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
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
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Planos */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Planos e Preços
          </h2>
          <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto">
            Comece com 3 dias grátis, sem cartão de crédito. Escolha o plano ideal para o seu negócio.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan, i) => (
              <Card key={i} className={`border-border/50 relative overflow-hidden ${plan.highlight ? "ring-2 ring-primary shadow-xl shadow-primary/10" : ""}`}>
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
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* O que está incluso */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-center text-foreground">O que está incluso em todos os planos?</h2>
          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
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
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Star className="w-3 h-3 text-accent" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Desenvolvedor */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
            <Code className="w-6 h-6 text-primary" />
            Sobre o Desenvolvedor
          </h2>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-6 md:p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-xl">
                <span className="text-3xl font-black text-white">J</span>
              </div>
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
                <Heart className="w-4 h-4 text-destructive" />
                Feito com dedicação no Brasil 🇧🇷
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 pb-8">
          <h2 className="text-2xl font-bold text-foreground">Pronto para começar?</h2>
          <p className="text-muted-foreground">Crie sua conta agora e teste grátis por 3 dias.</p>
          <Button
            onClick={() => navigate("/auth")}
            className="h-12 px-8 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg"
          >
            Criar Conta Grátis
          </Button>
        </section>

        {/* Footer */}
        <div className="border-t border-border/50 pt-6 pb-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} JTC FluxPDV — Todos os direitos reservados
          </p>
          <p className="text-xs text-muted-foreground">
            Desenvolvido por <strong>Jardiel De Sousa Lopes</strong> — Criador da JTC
          </p>
          <Button
            variant="link"
            onClick={() => navigate("/politica-de-privacidade")}
            className="text-xs text-muted-foreground"
          >
            Política de Privacidade
          </Button>
        </div>
      </div>
    </div>
  );
};

export default About;
