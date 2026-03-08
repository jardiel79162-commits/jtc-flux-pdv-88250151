
-- Tabela de planos de assinatura gerenciáveis pelo admin
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  days integer NOT NULL DEFAULT 30,
  features text[] NOT NULL DEFAULT '{}',
  badge text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Todos podem ler planos ativos (para exibir na tela de assinatura)
CREATE POLICY "Anyone can read active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Admins podem gerenciar planos
CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL USING (is_system_admin(auth.uid()))
  WITH CHECK (is_system_admin(auth.uid()));

-- Inserir planos padrão
INSERT INTO public.subscription_plans (plan_key, name, price, days, features, badge, sort_order)
VALUES 
  ('3_months', 'Plano 3 Meses', 29.99, 90, ARRAY['Acesso completo ao PDV', 'Gestão de produtos e estoque', 'Relatórios detalhados', 'Suporte por WhatsApp'], NULL, 1),
  ('1_year', 'Plano 1 Ano', 69.99, 365, ARRAY['Acesso completo ao PDV', 'Gestão de produtos e estoque', 'Relatórios detalhados', 'Suporte prioritário', 'Economia de 41%'], 'Mais Popular', 2);
