import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LegalDoc {
  content: string;
  version: string;
  title: string;
  updated_at: string;
}

export function useLegalDocument(docType: "terms" | "privacy") {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("legal_documents")
      .select("content, version, title, updated_at")
      .eq("doc_type", docType)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDoc(data as LegalDoc);
        setLoading(false);
      });
  }, [docType]);

  return { doc, loading };
}
