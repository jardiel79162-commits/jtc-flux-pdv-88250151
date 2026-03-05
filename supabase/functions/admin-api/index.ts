import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return jsonResponse({ error: 'Não autenticado' }, 401);

    const { action, ...params } = await req.json();

    // Non-admin actions
    if (action === 'check_or_setup_admin') {
      const { data: existing } = await supabaseAdmin.from('system_admins').select('id').eq('user_id', user.id).maybeSingle();
      if (existing) return jsonResponse({ is_admin: true });
      const { count } = await supabaseAdmin.from('system_admins').select('id', { count: 'exact', head: true });
      return jsonResponse({ is_admin: false, can_setup: (count ?? 0) === 0 });
    }

    if (action === 'claim_admin') {
      const { count } = await supabaseAdmin.from('system_admins').select('id', { count: 'exact', head: true });
      if (count && count > 0) return jsonResponse({ error: 'Administrador já configurado' }, 403);
      await supabaseAdmin.from('system_admins').insert({ user_id: user.id });
      await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'admin_setup', description: 'Primeiro administrador configurado' });
      return jsonResponse({ success: true });
    }

    // Admin check
    const { data: adminCheck } = await supabaseAdmin.from('system_admins').select('id').eq('user_id', user.id).maybeSingle();
    if (!adminCheck) return jsonResponse({ error: 'Acesso negado' }, 403);

    switch (action) {
      // ==================== STATS ====================
      case 'get_stats': {
        const [profilesRes, paymentsRes, logsRes, productsRes, salesRes, storesRes] = await Promise.all([
          supabaseAdmin.from('profiles').select('id, is_blocked', { count: 'exact' }),
          supabaseAdmin.from('subscription_payments').select('amount, status', { count: 'exact' }),
          supabaseAdmin.from('system_logs').select('*').order('created_at', { ascending: false }).limit(10),
          supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('sales').select('id, total_amount', { count: 'exact' }),
          supabaseAdmin.from('store_settings').select('id', { count: 'exact', head: true }),
        ]);

        const totalUsers = profilesRes.count || 0;
        const blockedUsers = (profilesRes.data || []).filter((p: any) => p.is_blocked).length;
        const totalPayments = paymentsRes.count || 0;
        const revenue = (paymentsRes.data || []).filter((p: any) => p.status === 'approved').reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        const totalProducts = productsRes.count || 0;
        const totalSales = salesRes.count || 0;
        const salesRevenue = (salesRes.data || []).reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
        const totalStores = storesRes.count || 0;

        // Active subscriptions
        const { count: activeSubsCount } = await supabaseAdmin.from('profiles')
          .select('id', { count: 'exact', head: true })
          .gt('subscription_ends_at', new Date().toISOString());

        return jsonResponse({
          stats: {
            users: totalUsers, blocked: blockedUsers, payments: totalPayments,
            revenue, totalProducts, totalSales, salesRevenue, totalStores,
            activeSubscriptions: activeSubsCount || 0,
          },
          recentLogs: logsRes.data || [],
        });
      }

      // ==================== EMPRESAS ====================
      case 'list_users': {
        const { search, page = 1, per_page = 20 } = params;
        let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' });
        if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%`);
        const from = (page - 1) * per_page;
        const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + per_page - 1);
        if (data) {
          const userIds = data.map((p: any) => p.user_id);
          const [{ data: roles }, { data: admins }, { data: stores }, { data: invites }] = await Promise.all([
            supabaseAdmin.from('user_roles').select('user_id, role').in('user_id', userIds),
            supabaseAdmin.from('system_admins').select('user_id').in('user_id', userIds),
            supabaseAdmin.from('store_settings').select('user_id, store_name, logo_url, category').in('user_id', userIds),
            supabaseAdmin.from('invite_codes').select('owner_user_id, is_used').in('owner_user_id', userIds),
          ]);
          const adminSet = new Set((admins || []).map((a: any) => a.user_id));
          const roleMap: Record<string, string[]> = {};
          (roles || []).forEach((r: any) => { if (!roleMap[r.user_id]) roleMap[r.user_id] = []; roleMap[r.user_id].push(r.role); });
          const storeMap: Record<string, any> = {};
          (stores || []).forEach((s: any) => { storeMap[s.user_id] = s; });
          const inviteMap: Record<string, number> = {};
          (invites || []).forEach((i: any) => { if (i.is_used) inviteMap[i.owner_user_id] = (inviteMap[i.owner_user_id] || 0) + 1; });
          const enriched = data.map((p: any) => ({
            ...p, roles: roleMap[p.user_id] || [], is_system_admin: adminSet.has(p.user_id),
            store_name: storeMap[p.user_id]?.store_name || null,
            store_logo: storeMap[p.user_id]?.logo_url || null,
            store_category: storeMap[p.user_id]?.category || null,
            friends_invited: inviteMap[p.user_id] || 0,
          }));
          return jsonResponse({ users: enriched, total: count });
        }
        return jsonResponse({ users: [], total: 0 });
      }

      case 'get_user_detail': {
        const { user_id: targetId } = params;
        const [
          { data: profile }, { data: sales, count: salesCount }, { count: productsCount },
          { count: customersCount }, { data: storeSettings }, { data: subPayments },
          { data: inviteCodes }, { count: suppliersCount },
        ] = await Promise.all([
          supabaseAdmin.from('profiles').select('*').eq('user_id', targetId).maybeSingle(),
          supabaseAdmin.from('sales').select('id, total_amount, payment_method, created_at, customer_name, discount', { count: 'exact' }).eq('user_id', targetId).order('created_at', { ascending: false }).limit(20),
          supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
          supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
          supabaseAdmin.from('store_settings').select('*').eq('user_id', targetId).maybeSingle(),
          supabaseAdmin.from('subscription_payments').select('*').eq('user_id', targetId).order('created_at', { ascending: false }),
          supabaseAdmin.from('invite_codes').select('code, is_used, used_by_user_id, created_at').eq('owner_user_id', targetId),
          supabaseAdmin.from('suppliers').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
        ]);
        const totalSalesRevenue = (sales || []).reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
        const friendsInvited = (inviteCodes || []).filter((i: any) => i.is_used).length;
        return jsonResponse({
          profile, storeSettings, recentSales: sales || [], totalSales: salesCount || 0,
          totalSalesRevenue, totalProducts: productsCount || 0, totalCustomers: customersCount || 0,
          totalSuppliers: suppliersCount || 0, subscriptionPayments: subPayments || [],
          inviteCodes: inviteCodes || [], friendsInvited,
        });
      }

      case 'block_user': {
        const { user_id: targetId } = params;
        await supabaseAdmin.from('profiles').update({ is_blocked: true }).eq('user_id', targetId);
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'user_blocked', description: 'Usuário bloqueado', metadata: { target_user_id: targetId } });
        return jsonResponse({ success: true });
      }

      case 'unblock_user': {
        const { user_id: targetId } = params;
        await supabaseAdmin.from('profiles').update({ is_blocked: false }).eq('user_id', targetId);
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'user_unblocked', description: 'Usuário desbloqueado', metadata: { target_user_id: targetId } });
        return jsonResponse({ success: true });
      }

      case 'delete_user': {
        const { user_id: targetId } = params;
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId);
        if (deleteError) throw deleteError;
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'user_deleted', description: 'Usuário deletado', metadata: { target_user_id: targetId } });
        return jsonResponse({ success: true });
      }

      case 'update_user': {
        const { user_id: targetId, data: updateData } = params;
        const allowedFields = ['full_name', 'email', 'cpf', 'phone', 'is_blocked', 'subscription_ends_at', 'trial_ends_at'];
        const sanitized: Record<string, any> = {};
        for (const key of allowedFields) { if (updateData[key] !== undefined) sanitized[key] = updateData[key]; }
        await supabaseAdmin.from('profiles').update(sanitized).eq('user_id', targetId);
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'user_updated', description: 'Dados atualizados', metadata: { target_user_id: targetId, changes: Object.keys(sanitized) } });
        return jsonResponse({ success: true });
      }

      case 'reset_user_password': {
        const { user_id: targetId, new_password } = params;
        const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { password: new_password });
        if (error) throw error;
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'password_reset', description: 'Senha redefinida pelo admin', metadata: { target_user_id: targetId } });
        return jsonResponse({ success: true });
      }

      // ==================== PRODUCTS (all users) ====================
      case 'list_all_products': {
        const { search, page = 1, per_page = 20 } = params;
        let query = supabaseAdmin.from('products').select('*, profiles!inner(full_name, email)', { count: 'exact' });
        if (search) query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);
        const from = (page - 1) * per_page;
        const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + per_page - 1);
        return jsonResponse({ products: data || [], total: count || 0 });
      }

      case 'delete_product': {
        const { product_id } = params;
        await supabaseAdmin.from('products').delete().eq('id', product_id);
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'product_deleted', description: 'Produto deletado pelo admin', metadata: { product_id } });
        return jsonResponse({ success: true });
      }

      case 'update_product': {
        const { product_id, data: prodData } = params;
        await supabaseAdmin.from('products').update(prodData).eq('id', product_id);
        return jsonResponse({ success: true });
      }

      // ==================== SALES (all users) ====================
      case 'list_all_sales': {
        const { search, date_from, date_to, page = 1, per_page = 20 } = params;
        let query = supabaseAdmin.from('sales').select('*, sale_items(product_name, quantity, unit_price)', { count: 'exact' });
        if (date_from) query = query.gte('created_at', date_from);
        if (date_to) query = query.lte('created_at', date_to);
        const from = (page - 1) * per_page;
        const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + per_page - 1);

        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((s: any) => s.user_id))];
          const { data: profiles } = await supabaseAdmin.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
          const profileMap: Record<string, any> = {};
          (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
          const enriched = data.map((s: any) => ({ ...s, user_name: profileMap[s.user_id]?.full_name || 'N/A', user_email: profileMap[s.user_id]?.email || 'N/A' }));
          return jsonResponse({ sales: enriched, total: count });
        }
        return jsonResponse({ sales: data || [], total: count || 0 });
      }

      case 'delete_sale': {
        const { sale_id } = params;
        await supabaseAdmin.from('sale_items').delete().eq('sale_id', sale_id);
        await supabaseAdmin.from('sales').delete().eq('id', sale_id);
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'sale_deleted', description: 'Venda deletada pelo admin', metadata: { sale_id } });
        return jsonResponse({ success: true });
      }

      // ==================== STORES ====================
      case 'list_all_stores': {
        const { page = 1, per_page = 20 } = params;
        const from = (page - 1) * per_page;
        const { data, count } = await supabaseAdmin.from('store_settings').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + per_page - 1);
        if (data && data.length > 0) {
          const userIds = data.map((s: any) => s.user_id);
          const { data: profiles } = await supabaseAdmin.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
          const profileMap: Record<string, any> = {};
          (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
          const enriched = data.map((s: any) => ({ ...s, owner_name: profileMap[s.user_id]?.full_name || 'N/A', owner_email: profileMap[s.user_id]?.email || 'N/A' }));
          return jsonResponse({ stores: enriched, total: count });
        }
        return jsonResponse({ stores: data || [], total: count || 0 });
      }

      case 'update_store': {
        const { store_id, data: storeData } = params;
        await supabaseAdmin.from('store_settings').update(storeData).eq('id', store_id);
        return jsonResponse({ success: true });
      }

      // ==================== SUBSCRIPTIONS ====================
      case 'list_subscriptions': {
        const { filter, page = 1, per_page = 20 } = params;
        let query = supabaseAdmin.from('profiles').select('user_id, full_name, email, cpf, subscription_ends_at, trial_ends_at, is_blocked, created_at', { count: 'exact' });
        const now = new Date().toISOString();
        if (filter === 'active') query = query.gt('subscription_ends_at', now);
        else if (filter === 'expired') query = query.lt('subscription_ends_at', now).not('subscription_ends_at', 'is', null);
        else if (filter === 'trial') query = query.gt('trial_ends_at', now).or('subscription_ends_at.is.null,subscription_ends_at.lt.' + now);
        else if (filter === 'no_sub') query = query.is('subscription_ends_at', null).or('trial_ends_at.is.null,trial_ends_at.lt.' + now);

        const from = (page - 1) * per_page;
        const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + per_page - 1);
        return jsonResponse({ subscriptions: data || [], total: count || 0 });
      }

      case 'extend_subscription': {
        const { user_id: targetId, days } = params;
        const { data: profile } = await supabaseAdmin.from('profiles').select('subscription_ends_at').eq('user_id', targetId).maybeSingle();
        const baseDate = profile?.subscription_ends_at && new Date(profile.subscription_ends_at) > new Date() ? new Date(profile.subscription_ends_at) : new Date();
        const newEnd = new Date(baseDate.getTime() + days * 86400000);
        await supabaseAdmin.from('profiles').update({ subscription_ends_at: newEnd.toISOString() }).eq('user_id', targetId);
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'subscription_extended', description: `Assinatura estendida em ${days} dias`, metadata: { target_user_id: targetId, days } });
        return jsonResponse({ success: true, new_end: newEnd.toISOString() });
      }

      case 'revoke_subscription': {
        const { user_id: targetId } = params;
        await supabaseAdmin.from('profiles').update({ subscription_ends_at: new Date(0).toISOString(), trial_ends_at: new Date(0).toISOString() }).eq('user_id', targetId);
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'subscription_revoked', description: 'Assinatura revogada', metadata: { target_user_id: targetId } });
        return jsonResponse({ success: true });
      }

      // ==================== PAYMENTS ====================
      case 'list_payments': {
        const { status, date_from, date_to, page = 1, per_page = 20 } = params;
        let query = supabaseAdmin.from('subscription_payments').select('*', { count: 'exact' });
        if (status && status !== 'all') query = query.eq('status', status);
        if (date_from) query = query.gte('created_at', date_from);
        if (date_to) query = query.lte('created_at', date_to);
        const from = (page - 1) * per_page;
        const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + per_page - 1);
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((p: any) => p.user_id))];
          const { data: profiles } = await supabaseAdmin.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
          const profileMap: Record<string, any> = {};
          (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
          const enriched = data.map((p: any) => ({ ...p, user_name: profileMap[p.user_id]?.full_name || 'N/A', user_email: profileMap[p.user_id]?.email || 'N/A' }));
          return jsonResponse({ payments: enriched, total: count });
        }
        return jsonResponse({ payments: data || [], total: count || 0 });
      }

      // ==================== LOGS ====================
      case 'get_logs': {
        const { event_type, page = 1, per_page = 50 } = params;
        let query = supabaseAdmin.from('system_logs').select('*', { count: 'exact' });
        if (event_type && event_type !== 'all') query = query.eq('event_type', event_type);
        const from = (page - 1) * per_page;
        const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + per_page - 1);
        return jsonResponse({ logs: data || [], total: count || 0 });
      }

      // ==================== DB OVERVIEW ====================
      case 'get_db_overview': {
        const [profiles, products, sales, customers, suppliers, categories, saleItems] = await Promise.all([
          supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('sales').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('suppliers').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('categories').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('sale_items').select('id', { count: 'exact', head: true }),
        ]);
        return jsonResponse({
          tables: [
            { name: 'profiles', count: profiles.count || 0 },
            { name: 'products', count: products.count || 0 },
            { name: 'sales', count: sales.count || 0 },
            { name: 'sale_items', count: saleItems.count || 0 },
            { name: 'customers', count: customers.count || 0 },
            { name: 'suppliers', count: suppliers.count || 0 },
            { name: 'categories', count: categories.count || 0 },
          ]
        });
      }

      // ==================== MAINTENANCE ====================
      case 'update_maintenance': {
        const { enabled, message, image_url } = params;
        const { error } = await supabaseAdmin.from('system_settings_global').update({
          maintenance_mode: enabled,
          maintenance_message: message || 'Sistema temporariamente em manutenção. Voltaremos em breve.',
          maintenance_image_url: image_url || null,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        }).not('id', 'is', null);
        if (error) throw error;
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'maintenance_updated', description: enabled ? 'Manutenção ativada' : 'Manutenção desativada', metadata: { enabled, message } });
        return jsonResponse({ success: true });
      }

      case 'get_maintenance': {
        const { data } = await supabaseAdmin.from('system_settings_global').select('*').maybeSingle();
        return jsonResponse({ settings: data });
      }

      default:
        return jsonResponse({ error: 'Ação inválida' }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
