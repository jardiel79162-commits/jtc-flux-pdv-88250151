import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

export type BusinessType = "comercio" | "loja_roupas" | "delivery";

export function useBusinessType() {
  const [businessType, setBusinessType] = useState<BusinessType>("comercio");
  const [loading, setLoading] = useState(true);
  const { getEffectiveUserId } = usePermissions();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const effectiveId = getEffectiveUserId() || session.user.id;
      const { data } = await supabase
        .from("store_settings")
        .select("business_type")
        .eq("user_id", effectiveId)
        .maybeSingle();
      if ((data as any)?.business_type) {
        setBusinessType((data as any).business_type as BusinessType);
      }
      setLoading(false);
    };
    load();
  }, [getEffectiveUserId]);

  return { businessType, loading, isComercio: businessType === "comercio", isClothing: businessType === "loja_roupas", isDelivery: businessType === "delivery" };
}
