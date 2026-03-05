import { supabase } from "@/integrations/supabase/client";

export async function adminApi(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
