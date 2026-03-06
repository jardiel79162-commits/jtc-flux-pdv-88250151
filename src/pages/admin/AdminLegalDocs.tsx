import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Shield, Save, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface LegalDoc {
  id: string;
  doc_type: string;
  title: string;
  content: string;
  version: string;
  updated_at: string;
}

export default function AdminLegalDocs() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [editVersion, setEditVersion] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    const { data } = await supabase
      .from("legal_documents")
      .select("*")
      .order("doc_type");
    if (data) {
      setDocs(data as LegalDoc[]);
      const contentMap: Record<string, string> = {};
      const versionMap: Record<string, string> = {};
      data.forEach((d: any) => {
        contentMap[d.doc_type] = d.content;
        versionMap[d.doc_type] = d.version;
      });
      setEditContent(contentMap);
      setEditVersion(versionMap);
    }
    setLoading(false);
  };

  const handleSave = async (docType: string) => {
    setSaving(docType);
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("legal_documents")
      .update({
        content: editContent[docType],
        version: editVersion[docType],
        updated_at: new Date().toISOString(),
        updated_by: session?.user.id || null,
      })
      .eq("doc_type", docType);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } else {
      toast({ title: "Salvo com sucesso!", description: `${docType === "terms" ? "Termos de Uso" : "Política de Privacidade"} atualizados. Os usuários verão a nova versão instantaneamente.` });
      loadDocs();
    }
    setSaving(null);
  };

  const getDoc = (type: string) => docs.find((d) => d.doc_type === type);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Termos & Privacidade</h1>
        <p className="text-muted-foreground">Edite os textos legais. As alterações são instantâneas para todos os usuários.</p>
      </div>

      <Tabs defaultValue="terms">
        <TabsList className="w-full">
          <TabsTrigger value="terms" className="flex-1 gap-2">
            <FileText className="w-4 h-4" />
            Termos de Uso
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex-1 gap-2">
            <Shield className="w-4 h-4" />
            Política de Privacidade
          </TabsTrigger>
        </TabsList>

        {["terms", "privacy"].map((docType) => {
          const doc = getDoc(docType);
          const label = docType === "terms" ? "Termos de Uso" : "Política de Privacidade";
          return (
            <TabsContent key={docType} value={docType} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{label}</span>
                    {doc && (
                      <span className="text-xs font-normal text-muted-foreground">
                        Última atualização: {new Date(doc.updated_at).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Versão</Label>
                      <Input
                        value={editVersion[docType] || ""}
                        onChange={(e) => setEditVersion({ ...editVersion, [docType]: e.target.value })}
                        placeholder="1.0"
                        className="max-w-[120px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Conteúdo (Markdown)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewDoc(previewDoc === docType ? null : docType)}
                        className="gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        {previewDoc === docType ? "Editar" : "Preview"}
                      </Button>
                    </div>

                    {previewDoc === docType ? (
                      <div className="border rounded-lg p-6 min-h-[400px] bg-muted/30 prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{editContent[docType] || ""}</ReactMarkdown>
                      </div>
                    ) : (
                      <Textarea
                        value={editContent[docType] || ""}
                        onChange={(e) => setEditContent({ ...editContent, [docType]: e.target.value })}
                        placeholder="Digite o conteúdo em Markdown..."
                        className="min-h-[400px] font-mono text-sm"
                      />
                    )}
                  </div>

                  <Button
                    onClick={() => handleSave(docType)}
                    disabled={saving === docType}
                    className="w-full"
                  >
                    {saving === docType ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar {label}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
