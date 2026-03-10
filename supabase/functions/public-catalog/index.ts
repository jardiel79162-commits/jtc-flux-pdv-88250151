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
    const body = await req.json();
    const { action, store_id, store_slug } = body;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // CPF lookup removed

    // Handle order creation
    if (action === "create_order") {
      const { store_user_id, customer_name, customer_phone, customer_address, payment_method, notes, items, total_amount } = body;

      if (!store_user_id || !customer_name || !customer_phone || !customer_address || !payment_method || !items?.length) {
        return new Response(JSON.stringify({ error: "Dados obrigatórios faltando" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate input lengths
      if (customer_name.length > 200 || customer_phone.length > 30 || customer_address.length > 500) {
        return new Response(JSON.stringify({ error: "Dados excedem o limite permitido" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('delivery_orders')
        .insert({
          store_user_id,
          customer_name: customer_name.substring(0, 200),
          customer_phone: customer_phone.substring(0, 30),
          customer_address: customer_address.substring(0, 500),
          payment_method,
          notes: notes?.substring(0, 500) || null,
          total_amount: total_amount || 0,
          status: 'received',
        })
        .select('id, order_number')
        .single();

      if (orderError || !order) {
        console.error('Order creation error:', orderError);
        return new Response(JSON.stringify({ error: "Erro ao criar pedido" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create order items
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id || null,
        product_name: (item.product_name || "").substring(0, 200),
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('delivery_order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items error:', itemsError);
      }

      return new Response(JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: fetch catalog
    if (!store_id && !store_slug) {
      return new Response(JSON.stringify({ error: "store_id ou store_slug é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = supabaseAdmin
      .from('store_settings')
      .select('store_name, logo_url, commercial_phone, store_address, primary_color, category, user_id, store_slug, business_type');

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

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, price, promotional_price, description, photos, stock_quantity, product_type, is_active')
      .eq('user_id', store.user_id)
      .eq('is_active', true)
      .order('name');

    // Fetch payment settings for delivery stores
    let paymentSettings = null;
    if (store.business_type === 'delivery') {
      const { data: ps } = await supabaseAdmin
        .from('delivery_payment_settings')
        .select('pix_enabled, cash_enabled, card_on_delivery_enabled, mercado_pago_enabled, pix_key, pix_receiver_name, pix_bank')
        .eq('user_id', store.user_id)
        .maybeSingle();
      paymentSettings = ps;
    }

    return new Response(JSON.stringify({
      store: {
        store_name: store.store_name,
        logo_url: store.logo_url,
        commercial_phone: store.commercial_phone,
        store_address: store.store_address,
        primary_color: store.primary_color,
        category: store.category,
        store_slug: store.store_slug,
        business_type: store.business_type,
        user_id: store.user_id,
      },
      products: products || [],
      payment_settings: paymentSettings,
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
