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

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

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
        // Get system admin user_ids to exclude them
        const { data: sysAdmins } = await supabaseAdmin.from('system_admins').select('user_id');
        const sysAdminIds = (sysAdmins || []).map((a: any) => a.user_id);
        
        let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' });
        if (sysAdminIds.length > 0) {
          for (const adminId of sysAdminIds) {
            query = query.neq('user_id', adminId);
          }
        }
        if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%,phone.ilike.%${search}%`);
        const from = (page - 1) * per_page;
        const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + per_page - 1);
        if (data) {
          const userIds = data.map((p: any) => p.user_id);
          const [{ data: roles }, { data: admins }, { data: stores }, { data: invites }] = await Promise.all([
            supabaseAdmin.from('user_roles').select('user_id, role').in('user_id', userIds),
            supabaseAdmin.from('system_admins').select('user_id').in('user_id', userIds),
            supabaseAdmin.from('store_settings').select('user_id, store_name, logo_url, category, commercial_phone, store_address, pix_key, pix_key_type, operation_type, pix_mode, mercado_pago_cpf, mercado_pago_name').in('user_id', userIds),
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
            store_phone: storeMap[p.user_id]?.commercial_phone || null,
            store_address: storeMap[p.user_id]?.store_address || null,
            store_pix_key: storeMap[p.user_id]?.pix_key || null,
            store_pix_type: storeMap[p.user_id]?.pix_key_type || null,
            store_operation: storeMap[p.user_id]?.operation_type || null,
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
        // Exclude system admins from subscription list
        const { data: sysAdminsSub } = await supabaseAdmin.from('system_admins').select('user_id');
        const sysAdminSubIds = (sysAdminsSub || []).map((a: any) => a.user_id);
        
        let query = supabaseAdmin.from('profiles').select('user_id, full_name, email, cpf, subscription_ends_at, trial_ends_at, is_blocked, created_at', { count: 'exact' });
        if (sysAdminSubIds.length > 0) {
          for (const adminId of sysAdminSubIds) {
            query = query.neq('user_id', adminId);
          }
        }
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
        const daysToAdd = Number(days);

        if (!Number.isFinite(daysToAdd) || daysToAdd <= 0) {
          return jsonResponse({ error: 'Quantidade de dias inválida' }, 400);
        }

        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('subscription_ends_at, trial_ends_at')
          .eq('user_id', targetId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) return jsonResponse({ error: 'Usuário não encontrado' }, 404);

        const now = new Date();
        const currentSubEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
        const currentTrialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;

        // Regra: sempre somar no maior prazo ainda ativo (trial ou assinatura), senão começa de agora.
        const activeBases = [currentSubEnd, currentTrialEnd].filter((d): d is Date => !!d && d > now);
        const baseDate = activeBases.length > 0
          ? new Date(Math.max(...activeBases.map((d) => d.getTime())))
          : now;

        const newEnd = new Date(baseDate.getTime() + daysToAdd * 86400000);

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ subscription_ends_at: newEnd.toISOString() })
          .eq('user_id', targetId);

        if (updateError) throw updateError;

        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'subscription_extended',
          description: `Assinatura estendida em ${daysToAdd} dias`,
          metadata: {
            target_user_id: targetId,
            days: daysToAdd,
            previous_subscription_ends_at: profile.subscription_ends_at,
            previous_trial_ends_at: profile.trial_ends_at,
            new_subscription_ends_at: newEnd.toISOString(),
          },
        });

        return jsonResponse({ success: true, new_end: newEnd.toISOString() });
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

      // ==================== REFERRALS (ANTIFRAUDE) ====================
      case 'list_referrals': {
        const { status: refStatus, page = 1, per_page = 20 } = params;
        let query = supabaseAdmin.from('referrals').select('*', { count: 'exact' });
        if (refStatus && refStatus !== 'all') query = query.eq('status', refStatus);
        const from = (page - 1) * per_page;
        const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + per_page - 1);

        if (data && data.length > 0) {
          const allUserIds = [...new Set([
            ...data.map((r: any) => r.referrer_user_id),
            ...data.filter((r: any) => r.referred_user_id).map((r: any) => r.referred_user_id),
          ])];
          const { data: profiles } = await supabaseAdmin.from('profiles').select('user_id, full_name, email').in('user_id', allUserIds);
          const profileMap: Record<string, any> = {};
          (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
          const enriched = data.map((r: any) => ({
            ...r,
            referrer_name: profileMap[r.referrer_user_id]?.full_name || 'N/A',
            referrer_email: profileMap[r.referrer_user_id]?.email || 'N/A',
            referred_name: r.referred_user_id ? (profileMap[r.referred_user_id]?.full_name || 'N/A') : 'N/A',
            referred_email: r.referred_user_id ? (profileMap[r.referred_user_id]?.email || 'N/A') : 'N/A',
          }));
          return jsonResponse({ referrals: enriched, total: count });
        }
        return jsonResponse({ referrals: data || [], total: count || 0 });
      }

      case 'approve_referral': {
        const { referral_id } = params;
        const { data: referral } = await supabaseAdmin.from('referrals').select('*').eq('id', referral_id).single();
        if (!referral) return jsonResponse({ error: 'Indicação não encontrada' }, 404);
        if (referral.reward_applied) return jsonResponse({ error: 'Recompensa já aplicada' }, 400);

        // Apply 30-day reward to both users
        for (const uid of [referral.referrer_user_id, referral.referred_user_id].filter(Boolean)) {
          const { data: profile } = await supabaseAdmin.from('profiles').select('subscription_ends_at, trial_ends_at').eq('user_id', uid).maybeSingle();
          if (!profile) continue;
          const now = new Date();
          const subEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
          const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
          const bases = [subEnd, trialEnd].filter((d): d is Date => !!d && d > now);
          const base = bases.length > 0 ? new Date(Math.max(...bases.map(d => d.getTime()))) : now;
          const newEnd = new Date(base.getTime() + 30 * 86400000);
          await supabaseAdmin.from('profiles').update({ subscription_ends_at: newEnd.toISOString() }).eq('user_id', uid);
          await supabaseAdmin.from('referral_rewards').insert({ referral_id, user_id: uid, reward_type: 'subscription_days', days_added: 30 });
        }

        await supabaseAdmin.from('referrals').update({ status: 'approved', reward_applied: true, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', referral_id);
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'referral_approved', description: 'Indicação aprovada pelo admin', metadata: { referral_id } });
        return jsonResponse({ success: true });
      }

      case 'reject_referral': {
        const { referral_id } = params;
        await supabaseAdmin.from('referrals').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', referral_id);
        await supabaseAdmin.from('system_logs').insert({ user_id: user.id, event_type: 'referral_rejected_manual', description: 'Indicação rejeitada pelo admin', metadata: { referral_id } });
        return jsonResponse({ success: true });
      }

      case 'get_referral_stats': {
        const [pending, approved, rejected, underReview] = await Promise.all([
          supabaseAdmin.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabaseAdmin.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabaseAdmin.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
          supabaseAdmin.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'under_review'),
        ]);
        return jsonResponse({
          stats: {
            pending: pending.count || 0,
            approved: approved.count || 0,
            rejected: rejected.count || 0,
            under_review: underReview.count || 0,
            total: (pending.count || 0) + (approved.count || 0) + (rejected.count || 0) + (underReview.count || 0),
          }
        });
      }

      // ==================== PRIZE WHEEL SPINS ====================
      case 'grant_spin': {
        const { user_id: targetId, quantity = 1 } = params;
        const inserts = Array.from({ length: Number(quantity) }, () => ({
          user_id: targetId,
          is_used: false,
        }));
        const { error: spinError } = await supabaseAdmin.from('prize_wheel_spins').insert(inserts);
        if (spinError) throw spinError;
        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'spin_granted',
          description: `${quantity} rodada(s) concedida(s) pelo admin`,
          metadata: { target_user_id: targetId, quantity },
        });
        return jsonResponse({ success: true });
      }

      case 'list_spin_history': {
        const page = Number(params.page || 1);
        const perPage = Number(params.per_page || 20);
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const { data: spins, count } = await supabaseAdmin
          .from('prize_wheel_spins')
          .select('*', { count: 'exact' })
          .not('prize_label', 'is', null)
          .order('used_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .range(from, to);

        // Enrich with profile data
        const enrichedSpins = [];
        if (spins && spins.length > 0) {
          const userIds = [...new Set(spins.map((s: any) => s.user_id))];
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds);
          const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
          for (const spin of spins) {
            const profile = profileMap.get((spin as any).user_id) || {};
            enrichedSpins.push({ ...spin, profiles: profile });
          }
        }

        // Also get admin-granted spins (unused ones granted by admin)
        const { data: grantedSpins, count: grantedCount } = await supabaseAdmin
          .from('system_logs')
          .select('*', { count: 'exact' })
          .eq('event_type', 'spin_granted')
          .order('created_at', { ascending: false })
          .range(from, to);

        return jsonResponse({
          spins: enrichedSpins,
          granted_logs: grantedSpins || [],
          total: count || 0,
          granted_total: grantedCount || 0,
        });
      }

      // ==================== CUSTOM SHORTCUTS ====================
      case 'list_shortcuts': {
        const { data, error } = await supabaseAdmin
          .from('custom_shortcuts')
          .select('*')
          .order('sort_order', { ascending: true });

        if (error) throw error;
        return jsonResponse({ shortcuts: data || [] });
      }

      case 'create_shortcut': {
        const { label, url, icon_url, sort_order = 0 } = params;
        const { data, error: insertErr } = await supabaseAdmin
          .from('custom_shortcuts')
          .insert({
            label,
            url,
            icon_url,
            sort_order,
            created_by: user.id,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'shortcut_created',
          description: `Atalho "${label}" criado`,
          metadata: { shortcut_id: data.id },
        });
        return jsonResponse({ success: true, shortcut: data });
      }

      case 'update_shortcut': {
        const { shortcut_id, data: shortcutData } = params;
        const allowedFields = ['label', 'url', 'icon_url', 'sort_order', 'is_active'];
        const sanitized: Record<string, any> = {};
        for (const key of allowedFields) {
          if (shortcutData[key] !== undefined) sanitized[key] = shortcutData[key];
        }
        sanitized.updated_at = new Date().toISOString();

        const { error } = await supabaseAdmin
          .from('custom_shortcuts')
          .update(sanitized)
          .eq('id', shortcut_id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case 'delete_shortcut': {
        const { shortcut_id } = params;
        const { error } = await supabaseAdmin
          .from('custom_shortcuts')
          .delete()
          .eq('id', shortcut_id);

        if (error) throw error;
        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'shortcut_deleted',
          description: 'Atalho deletado',
          metadata: { shortcut_id },
        });
        return jsonResponse({ success: true });
      }

      case 'sync_default_shortcuts': {
        const defaults = [
          { label: 'Produtos', url: '/produtos', sort_order: 0 },
          { label: 'Venda', url: '/pdv', sort_order: 1 },
          { label: 'Clientes', url: '/clientes', sort_order: 2 },
          { label: 'Fornecedores', url: '/fornecedores', sort_order: 3 },
          { label: 'Histórico', url: '/historico', sort_order: 4 },
          { label: 'Relatórios', url: '/relatorios', sort_order: 5 },
          { label: 'Configurações', url: '/configuracoes', sort_order: 6 },
          { label: 'Assinatura', url: '/assinatura', sort_order: 7 },
          { label: 'Calculadora', url: '/calculadora', sort_order: 8 },
          { label: 'Bônus', url: '/resgate-semanal', sort_order: 9 },
        ];

        const { data: existing, error: existingError } = await supabaseAdmin
          .from('custom_shortcuts')
          .select('url');

        if (existingError) throw existingError;

        const existingUrls = new Set((existing || []).map((s: any) => s.url));
        const toInsert = defaults
          .filter((d) => !existingUrls.has(d.url))
          .map((d) => ({ ...d, created_by: user.id, is_active: true }));

        if (toInsert.length > 0) {
          const { error: insertErr } = await supabaseAdmin
            .from('custom_shortcuts')
            .insert(toInsert);
          if (insertErr) throw insertErr;
        }

        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'shortcuts_synced',
          description: `${toInsert.length} atalhos padrão sincronizados`,
        });

        const { data: allShortcuts, error: allError } = await supabaseAdmin
          .from('custom_shortcuts')
          .select('*')
          .order('sort_order', { ascending: true });

        if (allError) throw allError;
        return jsonResponse({ success: true, shortcuts: allShortcuts || [], added: toInsert.length });
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
