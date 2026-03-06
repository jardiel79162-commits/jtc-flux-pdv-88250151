import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const CURRENT_TERMS_VERSION = "1.0";
const LOCAL_STORAGE_KEY = "jtc_terms_accepted";
const LOCAL_STORAGE_VERSION_KEY = "jtc_terms_version";

interface TermsAcceptanceModalProps {
  onAccepted: () => void;
}

export default function TermsAcceptanceModal({ onAccepted }: TermsAcceptanceModalProps) {
  const [visible, setVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    checkTermsStatus();
  }, []);

  const checkTermsStatus = async () => {
    // Check localStorage first
    const localAccepted = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localVersion = localStorage.getItem(LOCAL_STORAGE_VERSION_KEY);

    if (localAccepted === "true" && localVersion === CURRENT_TERMS_VERSION) {
      onAccepted();
      return;
    }

    // Check database for logged-in user
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("terms_accepted, terms_version")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile && profile.terms_accepted && (profile as any).terms_version === CURRENT_TERMS_VERSION) {
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
        localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, CURRENT_TERMS_VERSION);
        onAccepted();
        return;
      }
    }

    setVisible(true);
  };

  const handleAccept = async () => {
    setAccepting(true);

    // Save to localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, CURRENT_TERMS_VERSION);

    // Save to database if logged in
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from("profiles")
          .update({
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: CURRENT_TERMS_VERSION,
          } as any)
          .eq("user_id", session.user.id);
      }
    } catch (err) {
      console.error("Erro ao salvar aceitação dos termos:", err);
    }

    setAccepting(false);
    setVisible(false);
    onAccepted();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">JTC FLUX PDV</h2>
              <p className="text-xs text-muted-foreground">Termos e Privacidade</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-foreground leading-relaxed">
            Para continuar utilizando o sistema <strong>JTC FLUX PDV</strong>, você precisa concordar com nossos Termos de Uso e Política de Privacidade.
          </p>

          <div className="space-y-3">
            <Link
              to="/termos-de-uso"
              target="_blank"
              className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Termos de Uso</p>
                <p className="text-xs text-muted-foreground">Leia os termos completos de utilização</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </Link>

            <Link
              to="/politica-de-privacidade"
              target="_blank"
              className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Política de Privacidade</p>
                <p className="text-xs text-muted-foreground">Saiba como seus dados são protegidos</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Ao clicar em "Concordo e continuar", você declara que leu e aceita integralmente os{" "}
            <Link to="/termos-de-uso" target="_blank" className="text-primary hover:underline">Termos de Uso</Link>{" "}
            e a{" "}
            <Link to="/politica-de-privacidade" target="_blank" className="text-primary hover:underline">Política de Privacidade</Link>{" "}
            do JTC FLUX PDV.
          </p>

          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full h-14 text-base font-bold rounded-xl bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
          >
            {accepting ? "Salvando..." : "Concordo e continuar"}
          </Button>

          <p className="text-[10px] text-muted-foreground/60 text-center">
            Versão dos termos: {CURRENT_TERMS_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}

export { CURRENT_TERMS_VERSION };
