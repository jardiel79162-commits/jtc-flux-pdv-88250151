import { useState, useEffect } from "react";
import { Shield, FileText, Eye, LogOut, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

const CURRENT_TERMS_VERSION = "1.0";
const LOCAL_STORAGE_KEY = "jtc_terms_accepted";
const LOCAL_STORAGE_VERSION_KEY = "jtc_terms_version";

interface TermsAcceptanceModalProps {
  onAccepted: () => void;
}

// ── Conteúdo dos Termos de Uso ──
function TermsContent() {
  return (
    <div className="space-y-5 text-sm text-foreground">
      <section>
        <h3 className="font-semibold mb-2">1. Introdução</h3>
        <p className="text-muted-foreground leading-relaxed">
          Bem-vindo ao <strong>JTC FLUX PDV</strong>. Ao acessar ou utilizar o sistema, você concorda integralmente com os presentes Termos de Uso. O JTC FLUX PDV é um software de gestão comercial e ponto de venda (PDV) desenvolvido por <strong>Jardiel De Sousa Lopes</strong>, criador da <strong>JTC</strong>.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">2. Cadastro e Conta do Usuário</h3>
        <p className="text-muted-foreground leading-relaxed">
          O usuário é responsável pelas informações fornecidas, pela segurança de sua conta e por toda atividade realizada. A JTC pode suspender contas com informações falsas.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">3. Uso do Sistema</h3>
        <p className="text-muted-foreground leading-relaxed">
          O sistema oferece registro de vendas, controle de produtos/estoque, gestão de clientes/fornecedores e relatórios. O uso deve ser lícito e respeitar a legislação vigente.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">4. Planos e Pagamentos</h3>
        <p className="text-muted-foreground leading-relaxed">
          O sistema pode oferecer planos pagos e períodos gratuitos. Os valores serão informados de forma clara. A JTC pode alterar preços mediante aviso prévio.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">5. Sistema de Indicações</h3>
        <p className="text-muted-foreground leading-relaxed">
          Cada usuário possui um código de convite. Criação de contas falsas, uso de bots ou manipulação do sistema de indicações é proibida e pode resultar em suspensão permanente.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">6. Responsabilidade do Usuário</h3>
        <p className="text-muted-foreground leading-relaxed">
          O usuário é responsável pelas vendas registradas, cumprimento de leis fiscais e veracidade dos dados. O JTC FLUX PDV não substitui a responsabilidade do comerciante.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">7. Propriedade Intelectual</h3>
        <p className="text-muted-foreground leading-relaxed">
          O sistema, código-fonte, design e marca são propriedade exclusiva da JTC, desenvolvido por Jardiel De Sousa Lopes. Reprodução ou engenharia reversa são proibidas.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">8. Disponibilidade do Serviço</h3>
        <p className="text-muted-foreground leading-relaxed">
          A JTC busca manter o sistema disponível, mas pode haver interrupções para manutenção ou por força maior.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">9. Limitação de Responsabilidade</h3>
        <p className="text-muted-foreground leading-relaxed">
          A JTC não se responsabiliza por danos resultantes do uso ou impossibilidade de uso do sistema. O uso é por conta e risco do usuário.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">10. Alterações nos Termos</h3>
        <p className="text-muted-foreground leading-relaxed">
          Os termos podem ser atualizados a qualquer momento. Alterações significativas serão comunicadas e poderá ser solicitada nova aceitação.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">11. Contato</h3>
        <p className="text-muted-foreground leading-relaxed">
          Para dúvidas, entre em contato com <strong>Jardiel De Sousa Lopes</strong> através dos canais disponíveis no aplicativo.
        </p>
      </section>
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} JTC FLUX PDV — Desenvolvido por Jardiel De Sousa Lopes
        </p>
      </div>
    </div>
  );
}

// ── Conteúdo da Política de Privacidade ──
function PrivacyContent() {
  return (
    <div className="space-y-5 text-sm text-foreground">
      <section>
        <h3 className="font-semibold mb-2">1. Informações Gerais</h3>
        <p className="text-muted-foreground leading-relaxed">
          O JTC FluxPDV é um sistema de ponto de venda desenvolvido por <strong>Jardiel De Sousa Lopes</strong>. Esta Política descreve como coletamos, usamos e protegemos suas informações pessoais.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">2. Dados Coletados</h3>
        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
          <li>Dados de cadastro: nome, CPF, e-mail, telefone e endereço</li>
          <li>Dados de uso: histórico de vendas, produtos e clientes</li>
          <li>Dados de pagamento: informações de assinatura</li>
          <li>Dados técnicos: informações do dispositivo e logs de acesso</li>
        </ul>
      </section>
      <section>
        <h3 className="font-semibold mb-2">3. Uso das Informações</h3>
        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
          <li>Fornecer e manter o funcionamento do sistema</li>
          <li>Processar transações e gerenciar sua conta</li>
          <li>Enviar comunicações importantes</li>
          <li>Melhorar a experiência do usuário</li>
          <li>Cumprir obrigações legais</li>
        </ul>
      </section>
      <section>
        <h3 className="font-semibold mb-2">4. Compartilhamento de Dados</h3>
        <p className="text-muted-foreground leading-relaxed">
          Não vendemos ou compartilhamos suas informações com terceiros para marketing. Dados são compartilhados apenas com provedores essenciais para o funcionamento.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">5. Segurança dos Dados</h3>
        <p className="text-muted-foreground leading-relaxed">
          Utilizamos criptografia e protocolos seguros para proteger suas informações contra acesso não autorizado.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">6. Seus Direitos (LGPD)</h3>
        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
          <li>Acessar seus dados pessoais</li>
          <li>Corrigir dados incompletos ou desatualizados</li>
          <li>Solicitar a exclusão de seus dados</li>
          <li>Revogar o consentimento</li>
          <li>Solicitar portabilidade dos dados</li>
        </ul>
      </section>
      <section>
        <h3 className="font-semibold mb-2">7. Retenção de Dados</h3>
        <p className="text-muted-foreground leading-relaxed">
          Dados são mantidos pelo tempo necessário ou conforme exigido por lei, sendo excluídos de forma segura após esse período.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">8. Alterações na Política</h3>
        <p className="text-muted-foreground leading-relaxed">
          Podemos atualizar esta Política periodicamente. Mudanças significativas serão comunicadas pelo aplicativo ou e-mail.
        </p>
      </section>
      <section>
        <h3 className="font-semibold mb-2">9. Contato</h3>
        <p className="text-muted-foreground leading-relaxed">
          Para dúvidas sobre privacidade, entre em contato com <strong>Jardiel De Sousa Lopes</strong> através dos canais disponíveis no aplicativo.
        </p>
      </section>
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} JTC FLUX PDV — Desenvolvido por Jardiel De Sousa Lopes
        </p>
      </div>
    </div>
  );
}

// ── Sub-modal de leitura ──
function ReadingModal({
  title,
  icon: Icon,
  children,
  onClose,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5">{children}</div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-5 border-t border-border/30 shrink-0">
          <Button
            onClick={onClose}
            className="w-full h-12 text-base font-bold rounded-xl"
          >
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

  useEffect(() => {
    checkTermsStatus();
  }, []);

  const checkTermsStatus = async () => {
    const localAccepted = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localVersion = localStorage.getItem(LOCAL_STORAGE_VERSION_KEY);

    if (localAccepted === "true" && localVersion === CURRENT_TERMS_VERSION) {
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

    localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, CURRENT_TERMS_VERSION);

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

  const handleDisagree = () => {
    // Fecha a aba/janela ou redireciona
    window.location.href = "about:blank";
    window.close();
  };

  if (!visible) return null;

  return (
    <>
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
              {/* Termos de Uso – Ver */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Termos de Uso</p>
                  <p className="text-xs text-muted-foreground">Leia os termos completos de utilização</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReadingModal("terms")}
                  className="shrink-0 gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </Button>
              </div>

              {/* Política de Privacidade – Ver */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Política de Privacidade</p>
                  <p className="text-xs text-muted-foreground">Saiba como seus dados são protegidos</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReadingModal("privacy")}
                  className="shrink-0 gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </Button>
              </div>
            </div>

            {/* Botões de ação */}
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
              Versão dos termos: {CURRENT_TERMS_VERSION}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-modal de leitura */}
      {readingModal === "terms" && (
        <ReadingModal
          title="Termos de Uso"
          icon={FileText}
          onClose={() => setReadingModal(null)}
        >
          <TermsContent />
        </ReadingModal>
      )}

      {readingModal === "privacy" && (
        <ReadingModal
          title="Política de Privacidade"
          icon={Shield}
          onClose={() => setReadingModal(null)}
        >
          <PrivacyContent />
        </ReadingModal>
      )}
    </>
  );
}

export { CURRENT_TERMS_VERSION };
