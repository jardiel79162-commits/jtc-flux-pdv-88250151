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
    if (!authHeader) {
      return jsonResponse({ error: 'Não autorizado' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: 'Não autenticado' }, 401);
    }

    const { action, ...params } = await req.json();

    // Actions that don't require admin
    if (action === 'check_or_setup_admin') {
      const { data: existing } = await supabaseAdmin
        .from('system_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) return jsonResponse({ is_admin: true });

      const { count } = await supabaseAdmin
        .from('system_admins')
        .select('id', { count: 'exact', head: true });

      return jsonResponse({ is_admin: false, can_setup: (count ?? 0) === 0 });
    }

    if (action === 'claim_admin') {
      const { count } = await supabaseAdmin
        .from('system_admins')
        .select('id', { count: 'exact', head: true });

      if (count && count > 0) {
        return jsonResponse({ error: 'Administrador já configurado' }, 403);
      }

      await supabaseAdmin.from('system_admins').insert({ user_id: user.id });
      await supabaseAdmin.from('system_logs').insert({
        user_id: user.id,
        event_type: 'admin_setup',
        description: 'Primeiro administrador do sistema configurado',
      });

      return jsonResponse({ success: true });
    }

    // All other actions require system admin
    const { data: adminCheck } = await supabaseAdmin
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminCheck) {
      return jsonResponse({ error: 'Acesso negado' }, 403);
    }

    switch (action) {
      case 'get_stats': {
        const [profilesRes, paymentsRes, logsRes] = await Promise.all([
          supabaseAdmin.from('profiles').select('id, is_blocked', { count: 'exact' }),
          supabaseAdmin.from('subscription_payments').select('amount, status', { count: 'exact' }),
          supabaseAdmin.from('system_logs').select('*').order('created_at', { ascending: false }).limit(10),
        ]);

        const totalUsers = profilesRes.count || 0;
        const blockedUsers = (profilesRes.data || []).filter((p: any) => p.is_blocked).length;
        const totalPayments = paymentsRes.count || 0;
        const revenue = (paymentsRes.data || [])
          .filter((p: any) => p.status === 'approved')
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        return jsonResponse({
          stats: { users: totalUsers, blocked: blockedUsers, payments: totalPayments, revenue },
          recentLogs: logsRes.data || [],
        });
      }

      case 'list_users': {
        const { search, page = 1, per_page = 20 } = params;
        let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' });

        if (search) {
          query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%`);
        }

        const from = (page - 1) * per_page;
        const to = from + per_page - 1;

        const { data, count } = await query
          .order('created_at', { ascending: false })
          .range(from, to);

        if (data) {
          const userIds = data.map((p: any) => p.user_id);
          const { data: roles } = await supabaseAdmin
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', userIds);

          const { data: admins } = await supabaseAdmin
            .from('system_admins')
            .select('user_id')
            .in('user_id', userIds);

          const adminSet = new Set((admins || []).map((a: any) => a.user_id));
          const roleMap: Record<string, string[]> = {};
          (roles || []).forEach((r: any) => {
            if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
            roleMap[r.user_id].push(r.role);
          });

          const enriched = data.map((p: any) => ({
            ...p,
            roles: roleMap[p.user_id] || [],
            is_system_admin: adminSet.has(p.user_id),
          }));

          return jsonResponse({ users: enriched, total: count });
        }
        return jsonResponse({ users: [], total: 0 });
      }

      case 'block_user': {
        const { user_id: targetId } = params;
        await supabaseAdmin.from('profiles').update({ is_blocked: true }).eq('user_id', targetId);
        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'user_blocked',
          description: `Usuário bloqueado`,
          metadata: { target_user_id: targetId },
        });
        return jsonResponse({ success: true });
      }

      case 'unblock_user': {
        const { user_id: targetId } = params;
        await supabaseAdmin.from('profiles').update({ is_blocked: false }).eq('user_id', targetId);
        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'user_unblocked',
          description: `Usuário desbloqueado`,
          metadata: { target_user_id: targetId },
        });
        return jsonResponse({ success: true });
      }

      case 'delete_user': {
        const { user_id: targetId } = params;
        // Delete from auth (cascades to profiles)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId);
        if (deleteError) throw deleteError;

        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'user_deleted',
          description: `Usuário deletado do sistema`,
          metadata: { target_user_id: targetId },
        });
        return jsonResponse({ success: true });
      }

      case 'update_user': {
        const { user_id: targetId, data: updateData } = params;
        const allowedFields = ['full_name', 'email', 'cpf', 'phone', 'is_blocked'];
        const sanitized: Record<string, any> = {};
        for (const key of allowedFields) {
          if (updateData[key] !== undefined) sanitized[key] = updateData[key];
        }
        await supabaseAdmin.from('profiles').update(sanitized).eq('user_id', targetId);
        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'user_updated',
          description: `Dados do usuário atualizados`,
          metadata: { target_user_id: targetId, changes: Object.keys(sanitized) },
        });
        return jsonResponse({ success: true });
      }

      case 'list_payments': {
        const { status, date_from, date_to, page = 1, per_page = 20 } = params;
        let query = supabaseAdmin.from('subscription_payments').select('*', { count: 'exact' });

        if (status) query = query.eq('status', status);
        if (date_from) query = query.gte('created_at', date_from);
        if (date_to) query = query.lte('created_at', date_to);

        const from = (page - 1) * per_page;
        const to = from + per_page - 1;

        const { data, count } = await query
          .order('created_at', { ascending: false })
          .range(from, to);

        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((p: any) => p.user_id))];
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds);

          const profileMap: Record<string, any> = {};
          (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

          const enriched = data.map((p: any) => ({
            ...p,
            user_name: profileMap[p.user_id]?.full_name || 'N/A',
            user_email: profileMap[p.user_id]?.email || 'N/A',
          }));
          return jsonResponse({ payments: enriched, total: count });
        }
        return jsonResponse({ payments: data || [], total: count || 0 });
      }

      case 'get_logs': {
        const { event_type, page = 1, per_page = 50 } = params;
        let query = supabaseAdmin.from('system_logs').select('*', { count: 'exact' });

        if (event_type) query = query.eq('event_type', event_type);

        const from = (page - 1) * per_page;
        const to = from + per_page - 1;

        const { data, count } = await query
          .order('created_at', { ascending: false })
          .range(from, to);

        return jsonResponse({ logs: data || [], total: count || 0 });
      }

      case 'update_maintenance': {
        const { enabled, message, image_url } = params;
        const { error } = await supabaseAdmin
          .from('system_settings_global')
          .update({
            maintenance_mode: enabled,
            maintenance_message: message || 'Sistema temporariamente em manutenção. Voltaremos em breve.',
            maintenance_image_url: image_url || null,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .not('id', 'is', null);

        if (error) throw error;

        await supabaseAdmin.from('system_logs').insert({
          user_id: user.id,
          event_type: 'maintenance_updated',
          description: enabled ? 'Modo manutenção ativado' : 'Modo manutenção desativado',
          metadata: { enabled, message },
        });
        return jsonResponse({ success: true });
      }

      case 'get_maintenance': {
        const { data } = await supabaseAdmin
          .from('system_settings_global')
          .select('*')
          .maybeSingle();
        return jsonResponse({ settings: data });
      }

      default:
        return jsonResponse({ error: 'Ação inválida' }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
