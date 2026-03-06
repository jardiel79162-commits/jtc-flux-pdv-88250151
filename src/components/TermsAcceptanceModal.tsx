import { useState, useEffect } from "react";
import { Shield, FileText, Eye, LogOut, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

const LOCAL_STORAGE_KEY = "jtc_terms_accepted";
const LOCAL_STORAGE_VERSION_KEY = "jtc_terms_version";

interface TermsAcceptanceModalProps {
  onAccepted: () => void;
}

// ── Sub-modal de leitura ──
function ReadingModal({
  title,
  icon: Icon,
  content,
  loading,
  onClose,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onTouchMove={(e) => e.stopPropagation()}>
      <div className="w-full max-w-lg max-h-[90vh] bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col" style={{ overscrollBehavior: "contain" }}>
        <div className="flex items-center justify-between p-5 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-5 border-t border-border/30 shrink-0">
          <Button onClick={onClose} className="w-full h-12 text-base font-bold rounded-xl">
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Modal principal ──
export default function TermsAcceptanceModal({ onAccepted }: TermsAcceptanceModalProps) {
  const [visible, setVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [readingModal, setReadingModal] = useState<"terms" | "privacy" | null>(null);
  const [currentVersion, setCurrentVersion] = useState("1.0");
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(true);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [visible]);

  useEffect(() => {
    loadLegalDocs().then(() => checkTermsStatus());
  }, []);

  const loadLegalDocs = async () => {
    setLoadingContent(true);
    const { data } = await supabase
      .from("legal_documents")
      .select("doc_type, content, version")
      .in("doc_type", ["terms", "privacy"]);

    if (data) {
      for (const doc of data as any[]) {
        if (doc.doc_type === "terms") {
          setTermsContent(doc.content);
          setCurrentVersion(doc.version);
        }
        if (doc.doc_type === "privacy") {
          setPrivacyContent(doc.content);
        }
      }
    }
    setLoadingContent(false);
  };

  const checkTermsStatus = async () => {
    // We need to wait for version to be loaded, so we fetch it inline
    const { data: termsDoc } = await supabase
      .from("legal_documents")
      .select("version")
      .eq("doc_type", "terms")
      .maybeSingle();

    const version = (termsDoc as any)?.version || "1.0";
    setCurrentVersion(version);

    const localAccepted = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localVersion = localStorage.getItem(LOCAL_STORAGE_VERSION_KEY);

    if (localAccepted === "true" && localVersion === version) {
      onAccepted();
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("terms_accepted, terms_version")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile && profile.terms_accepted && (profile as any).terms_version === version) {
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
        localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, version);
        onAccepted();
        return;
      }
    }

    setVisible(true);
  };

  const handleAccept = async () => {
    setAccepting(true);

    localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, currentVersion);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from("profiles")
          .update({
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: currentVersion,
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

  const handleDisagree = () => {
    window.location.href = "about:blank";
    window.close();
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
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

          <div className="p-6 space-y-5">
            <p className="text-sm text-foreground leading-relaxed">
              Para continuar utilizando o sistema <strong>JTC FLUX PDV</strong>, você precisa concordar com nossos Termos de Uso e Política de Privacidade.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Termos de Uso</p>
                  <p className="text-xs text-muted-foreground">Leia os termos completos de utilização</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setReadingModal("terms")} className="shrink-0 gap-1.5">
                  <Eye className="w-4 h-4" />
                  Ver
                </Button>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Política de Privacidade</p>
                  <p className="text-xs text-muted-foreground">Saiba como seus dados são protegidos</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setReadingModal("privacy")} className="shrink-0 gap-1.5">
                  <Eye className="w-4 h-4" />
                  Ver
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full h-14 text-base font-bold rounded-xl bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {accepting ? "Salvando..." : "Concordo e continuar"}
              </Button>

              <Button
                variant="destructive"
                onClick={handleDisagree}
                className="w-full h-12 text-sm font-semibold rounded-xl gap-2"
              >
                <LogOut className="w-4 h-4" />
                NÃO ESTOU DE ACORDO — SAIR
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/60 text-center">
              Versão dos termos: {currentVersion}
            </p>
          </div>
        </div>
      </div>

      {readingModal === "terms" && (
        <ReadingModal
          title="Termos de Uso"
          icon={FileText}
          content={termsContent}
          loading={loadingContent}
          onClose={() => setReadingModal(null)}
        />
      )}

      {readingModal === "privacy" && (
        <ReadingModal
          title="Política de Privacidade"
          icon={Shield}
          content={privacyContent}
          loading={loadingContent}
          onClose={() => setReadingModal(null)}
        />
      )}
    </>
  );
}
