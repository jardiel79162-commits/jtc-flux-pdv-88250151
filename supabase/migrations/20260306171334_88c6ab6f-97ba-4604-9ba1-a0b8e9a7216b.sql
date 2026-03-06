
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  version text NOT NULL DEFAULT '1.0',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Anyone can read legal documents"
  ON public.legal_documents FOR SELECT
  TO authenticated
  USING (true);

-- Only system admins can manage
CREATE POLICY "Admins can manage legal documents"
  ON public.legal_documents FOR ALL
  TO authenticated
  USING (is_system_admin(auth.uid()))
  WITH CHECK (is_system_admin(auth.uid()));

-- Also allow anon/public read for unauthenticated pages (terms, privacy)
CREATE POLICY "Public can read legal documents"
  ON public.legal_documents FOR SELECT
  TO anon
  USING (true);

-- Insert default documents
INSERT INTO public.legal_documents (doc_type, title, content, version) VALUES
('terms', 'Termos de Uso', E'## 1. Introdução\n\nBem-vindo ao **JTC FLUX PDV**. Ao acessar ou utilizar o sistema, você concorda integralmente com os presentes Termos de Uso. O JTC FLUX PDV é um software de gestão comercial e ponto de venda (PDV) desenvolvido por **Jardiel De Sousa Lopes**, criador da **JTC**, destinado a comerciantes para controle de vendas, produtos, estoque, clientes, fornecedores e geração de relatórios.\n\n## 2. Cadastro e Conta do Usuário\n\nPara utilizar o JTC FLUX PDV, é necessário criar uma conta fornecendo informações verdadeiras, completas e atualizadas. O usuário é inteiramente responsável por:\n\n- Manter a veracidade e atualização de todas as informações fornecidas no cadastro\n- Proteger e manter em sigilo sua senha de acesso\n- Toda e qualquer atividade realizada em sua conta\n- Notificar imediatamente a JTC em caso de uso não autorizado de sua conta\n\nA JTC reserva-se o direito de suspender ou encerrar contas que apresentem informações falsas, incompletas ou que violem estes Termos de Uso.\n\n## 3. Uso do Sistema\n\nO JTC FLUX PDV é uma ferramenta de gestão comercial e ponto de venda que oferece funcionalidades como:\n\n- Registro e controle de vendas\n- Cadastro e gerenciamento de produtos e estoque\n- Gestão de clientes e fornecedores\n- Geração de relatórios comerciais\n- Calculadora financeira integrada\n- Sistema de assinatura e controle de acesso\n\nO usuário compromete-se a utilizar o sistema de forma lícita, respeitando a legislação vigente e os direitos de terceiros.\n\n## 4. Planos e Pagamentos\n\nO JTC FLUX PDV pode oferecer diferentes planos de acesso, incluindo períodos de teste gratuito e planos pagos com funcionalidades adicionais. Os valores, condições e formas de pagamento serão informados de forma clara dentro do sistema. A JTC reserva-se o direito de alterar os preços e condições dos planos mediante aviso prévio aos usuários.\n\n## 5. Sistema de Indicações\n\nO JTC FLUX PDV oferece um sistema de indicações onde cada usuário possui um código único de convite. É expressamente proibida a criação de contas falsas ou fictícias com o objetivo de obter benefícios indevidos. Condutas fraudulentas poderão resultar na suspensão ou cancelamento permanente da conta.\n\n## 6. Responsabilidade do Usuário\n\nO usuário é integralmente responsável por todas as vendas registradas em sua conta, o cumprimento de todas as obrigações fiscais e a veracidade dos dados inseridos. O JTC FLUX PDV **não substitui a responsabilidade do comerciante** perante os órgãos fiscais e regulatórios.\n\n## 7. Propriedade Intelectual\n\nO sistema JTC FLUX PDV, incluindo código-fonte, design, interface, logotipo e marca, é de propriedade exclusiva da JTC, desenvolvido por Jardiel De Sousa Lopes. Todos os direitos são reservados.\n\n## 8. Disponibilidade do Serviço\n\nA JTC se esforça para manter o sistema disponível 24 horas por dia, 7 dias por semana. No entanto, o serviço pode sofrer interrupções temporárias para manutenção ou por motivos de força maior.\n\n## 9. Limitação de Responsabilidade\n\nA JTC não se responsabiliza por danos resultantes do uso ou impossibilidade de uso do sistema. O uso do sistema é por conta e risco do usuário.\n\n## 10. Alterações nos Termos\n\nA JTC reserva-se o direito de modificar estes Termos de Uso a qualquer momento. Quando alterações significativas forem realizadas, os usuários serão notificados e poderá ser solicitada uma nova aceitação dos termos.\n\n## 11. Rescisão\n\nO usuário pode encerrar sua conta a qualquer momento. A JTC também pode encerrar o acesso em caso de violação destes termos.\n\n## 12. Legislação Aplicável\n\nEstes Termos de Uso são regidos pelas leis da República Federativa do Brasil.\n\n## 13. Contato\n\nPara dúvidas, entre em contato com **Jardiel De Sousa Lopes** através dos canais disponíveis no aplicativo JTC FLUX PDV.', '1.0'),
('privacy', 'Política de Privacidade', E'## 1. Informações Gerais\n\nO JTC FluxPDV é um sistema de ponto de venda (PDV) desenvolvido por **Jardiel De Sousa Lopes**, criador da JTC. Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações pessoais.\n\n## 2. Dados Coletados\n\nColetamos os seguintes tipos de informações:\n\n- Dados de cadastro: nome completo, CPF, e-mail, telefone e endereço\n- Dados de uso: histórico de vendas, produtos cadastrados, clientes e fornecedores\n- Dados de pagamento: informações relacionadas à assinatura do serviço\n- Dados técnicos: informações do dispositivo e logs de acesso\n\n## 3. Uso das Informações\n\nUtilizamos suas informações para:\n\n- Fornecer e manter o funcionamento do sistema\n- Processar transações e gerenciar sua conta\n- Enviar comunicações importantes sobre o serviço\n- Melhorar a experiência do usuário\n- Cumprir obrigações legais e regulatórias\n\n## 4. Compartilhamento de Dados\n\nNão vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing. Podemos compartilhar dados apenas com provedores de serviços essenciais para o funcionamento do sistema.\n\n## 5. Segurança dos Dados\n\nImplementamos medidas de segurança técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.\n\n## 6. Seus Direitos (LGPD)\n\nDe acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:\n\n- Acessar seus dados pessoais\n- Corrigir dados incompletos ou desatualizados\n- Solicitar a exclusão de seus dados\n- Revogar o consentimento a qualquer momento\n- Solicitar a portabilidade dos dados\n\n## 7. Retenção de Dados\n\nMantemos seus dados pessoais pelo tempo necessário para cumprir as finalidades descritas nesta política, ou conforme exigido por lei.\n\n## 8. Alterações na Política\n\nPodemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas através do aplicativo.\n\n## 9. Contato\n\nPara dúvidas sobre privacidade, entre em contato com **Jardiel De Sousa Lopes** através dos canais disponíveis no aplicativo.', '1.0');
