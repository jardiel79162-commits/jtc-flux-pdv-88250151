import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'create_admin'

    if (action === 'create_admin') {
      // Create admin user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: 'jtc.adm@gmail.com',
        password: 'Jardiel021.L',
        email_confirm: true,
        user_metadata: {
          full_name: 'JTC ADM',
          cpf: '629.555.083-57',
          phone: '',
          cep: '',
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          state: '',
        }
      })

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userId = authData.user?.id
      if (!userId) throw new Error('User ID not found')

      // Add to system_admins
      const { error: adminError } = await supabaseAdmin.from('system_admins').insert({ user_id: userId })
      if (adminError) console.error('Admin insert error:', adminError)

      // Give permanent subscription
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_ends_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', userId)

      // Log
      await supabaseAdmin.from('system_logs').insert({
        user_id: userId,
        event_type: 'admin_setup',
        description: 'Conta de administrador JTC ADM criada',
      })

      return new Response(
        JSON.stringify({ success: true, message: 'Admin JTC ADM criado com sucesso!', user_id: userId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
