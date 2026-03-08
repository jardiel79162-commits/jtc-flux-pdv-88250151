import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_id, store_slug } = await req.json();
    if (!store_id && !store_slug) {
      return new Response(JSON.stringify({ error: "store_id ou store_slug é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find store settings by slug or user_id
    let query = supabaseAdmin
      .from('store_settings')
      .select('store_name, logo_url, commercial_phone, store_address, primary_color, category, user_id, store_slug');

    if (store_slug) {
      query = query.eq('store_slug', store_slug);
    } else {
      query = query.eq('user_id', store_id);
    }

    const { data: store, error: storeError } = await query.maybeSingle();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "Loja não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is blocked
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_blocked')
      .eq('user_id', store.user_id)
      .maybeSingle();

    if (profile?.is_blocked) {
      return new Response(JSON.stringify({ error: "Loja indisponível" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active products
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, price, promotional_price, description, photos, stock_quantity, product_type, is_active')
      .eq('user_id', store.user_id)
      .eq('is_active', true)
      .order('name');

    return new Response(JSON.stringify({
      store: {
        store_name: store.store_name,
        logo_url: store.logo_url,
        commercial_phone: store.commercial_phone,
        store_address: store.store_address,
        primary_color: store.primary_color,
        category: store.category,
        store_slug: store.store_slug,
      },
      products: products || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in public-catalog:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
