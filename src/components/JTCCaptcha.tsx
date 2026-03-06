import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CaptchaChallenge {
  type: "math" | "emoji" | "sequence" | "word";
  question: string;
  answer: string;
  options: string[];
}

function generateChallenge(): CaptchaChallenge {
  const types: CaptchaChallenge["type"][] = ["math", "emoji", "sequence", "word"];
  const type = types[Math.floor(Math.random() * types.length)];

  switch (type) {
    case "math": {
      const ops = [
        () => {
          const a = Math.floor(Math.random() * 20) + 1;
          const b = Math.floor(Math.random() * 20) + 1;
          return { q: `${a} + ${b}`, a: String(a + b) };
        },
        () => {
          const a = Math.floor(Math.random() * 20) + 10;
          const b = Math.floor(Math.random() * 10) + 1;
          return { q: `${a} - ${b}`, a: String(a - b) };
        },
        () => {
          const a = Math.floor(Math.random() * 10) + 2;
          const b = Math.floor(Math.random() * 10) + 2;
          return { q: `${a} × ${b}`, a: String(a * b) };
        },
      ];
      const op = ops[Math.floor(Math.random() * ops.length)]();
      const correct = op.a;
      const wrongSet = new Set<string>();
      wrongSet.add(correct);
      while (wrongSet.size < 4) {
        const offset = Math.floor(Math.random() * 10) - 5;
        const wrong = String(Number(correct) + offset);
        if (wrong !== correct && Number(wrong) >= 0) wrongSet.add(wrong);
      }
      return {
        type: "math",
        question: `Quanto é ${op.q}?`,
        answer: correct,
        options: shuffle([...wrongSet]),
      };
    }

    case "emoji": {
      const emojiGroups = [
        { label: "frutas", emojis: ["🍎", "🍊", "🍋", "🍇", "🍓", "🍌", "🍑", "🍒"] },
        { label: "animais", emojis: ["🐶", "🐱", "🐭", "🐰", "🐻", "🐼", "🐸", "🦊"] },
        { label: "esportes", emojis: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎱", "🏓"] },
        { label: "veículos", emojis: ["🚗", "🚕", "🚌", "🏎️", "🚓", "🚑", "🚒", "🛵"] },
      ];
      const targetGroup = emojiGroups[Math.floor(Math.random() * emojiGroups.length)];
      const correctEmoji = targetGroup.emojis[Math.floor(Math.random() * targetGroup.emojis.length)];
      const otherGroups = emojiGroups.filter(g => g.label !== targetGroup.label);
      const wrongEmojis: string[] = [];
      while (wrongEmojis.length < 3) {
        const rg = otherGroups[Math.floor(Math.random() * otherGroups.length)];
        const re = rg.emojis[Math.floor(Math.random() * rg.emojis.length)];
        if (!wrongEmojis.includes(re)) wrongEmojis.push(re);
      }
      return {
        type: "emoji",
        question: `Qual é um(a) ${targetGroup.label}?`,
        answer: correctEmoji,
        options: shuffle([correctEmoji, ...wrongEmojis]),
      };
    }

    case "sequence": {
      const start = Math.floor(Math.random() * 10) + 1;
      const step = Math.floor(Math.random() * 3) + 2;
      const seq = [start, start + step, start + step * 2];
      const next = start + step * 3;
      const wrongSet = new Set<string>();
      wrongSet.add(String(next));
      while (wrongSet.size < 4) {
        const offset = Math.floor(Math.random() * 8) - 4;
        const wrong = next + offset;
        if (wrong !== next && wrong > 0) wrongSet.add(String(wrong));
      }
      return {
        type: "sequence",
        question: `Qual é o próximo? ${seq.join(", ")}, ?`,
        answer: String(next),
        options: shuffle([...wrongSet]),
      };
    }

    case "word": {
      const words = [
        { q: "Qual cor tem o céu?", a: "Azul", wrong: ["Verde", "Vermelho", "Amarelo"] },
        { q: "Quantas patas tem um gato?", a: "4", wrong: ["2", "6", "8"] },
        { q: "Em que mês é o Natal?", a: "Dezembro", wrong: ["Janeiro", "Junho", "Outubro"] },
        { q: "Qual é a capital do Brasil?", a: "Brasília", wrong: ["São Paulo", "Rio de Janeiro", "Salvador"] },
        { q: "Quantos dias tem uma semana?", a: "7", wrong: ["5", "6", "10"] },
        { q: "Qual destes é um animal?", a: "Cachorro", wrong: ["Mesa", "Cadeira", "Porta"] },
        { q: "Quanto é 1 dúzia?", a: "12", wrong: ["6", "10", "24"] },
        { q: "Qual planeta é o terceiro do Sol?", a: "Terra", wrong: ["Marte", "Vênus", "Júpiter"] },
      ];
      const w = words[Math.floor(Math.random() * words.length)];
      return {
        type: "word",
        question: w.q,
        answer: w.a,
        options: shuffle([w.a, ...w.wrong]),
      };
    }
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface JTCCaptchaProps {
  onVerified: (verified: boolean) => void;
}

export default function JTCCaptcha({ onVerified }: JTCCaptchaProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge>(generateChallenge);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const refresh = useCallback(() => {
    setChallenge(generateChallenge());
    setSelected(null);
    setStatus("idle");
  }, []);

  const handleSelect = (option: string) => {
    if (status === "correct" || cooldown > 0) return;
    setSelected(option);

    if (option === challenge.answer) {
      setStatus("correct");
      onVerified(true);
    } else {
      setStatus("wrong");
      onVerified(false);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      // After 3 wrong attempts, add a cooldown
      if (newAttempts >= 3) {
        const cd = Math.min(newAttempts * 5, 30);
        setCooldown(cd);
        cooldownRef.current = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) {
              clearInterval(cooldownRef.current);
              refresh();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setTimeout(() => {
          refresh();
        }, 1200);
      }
    }
  };

  const handleRefresh = () => {
    if (cooldown > 0 || status === "correct") return;
    onVerified(false);
    refresh();
  };

  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 ${
      status === "correct"
        ? "border-emerald-500/50 bg-emerald-500/5"
        : status === "wrong"
        ? "border-red-500/50 bg-red-500/5"
        : "border-border/50 bg-muted/20"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${status === "correct" ? "text-emerald-500" : "text-primary"}`} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Verificação de Segurança
          </span>
        </div>
        {status !== "correct" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={cooldown > 0}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {status === "correct" ? (
        <div className="flex items-center gap-2 py-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-500">Verificado com sucesso!</span>
        </div>
      ) : cooldown > 0 ? (
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground">Muitas tentativas erradas.</p>
          <p className="text-lg font-bold text-primary mt-1">Tente novamente em {cooldown}s</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground mb-3">{challenge.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {challenge.options.map((option, i) => (
              <button
                key={`${challenge.question}-${i}`}
                type="button"
                onClick={() => handleSelect(option)}
                disabled={status === "wrong"}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  selected === option
                    ? status === "wrong"
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-center mt-2">
        <span className="text-[10px] text-muted-foreground/50">JTC FluxPDV Security</span>
      </div>
    </div>
  );
}
