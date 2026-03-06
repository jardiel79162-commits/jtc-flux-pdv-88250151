import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLegalDocument } from "@/hooks/useLegalDocument";
import ReactMarkdown from "react-markdown";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { doc, loading } = useLegalDocument("privacy");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="bg-card rounded-lg p-6 md:p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {doc?.title || "Política de Privacidade"}
          </h1>
          <p className="text-muted-foreground mb-8">
            Última atualização:{" "}
            {doc ? new Date(doc.updated_at).toLocaleDateString("pt-BR") : "..."}
          </p>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
              <ReactMarkdown>{doc?.content || ""}</ReactMarkdown>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} JTC FluxPDV - Desenvolvido por Jardiel De Sousa Lopes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
