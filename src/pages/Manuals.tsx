import { useState } from "react";
import PageLoader from "@/components/PageLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, UserPlus, ShoppingCart, Package, Users, FileText, Settings, CreditCard, History, Calculator, Gift, Truck, MessageSquare, ChevronDown, ChevronUp, Smartphone, Camera, BarChart3, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ManualSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  steps: { title: string; description: string }[];
}

const manualSections: ManualSection[] = [
  {
    id: "criar-conta",
    icon: <UserPlus className="w-5 h-5" />,
    title: "Criar Conta",
    badge: "Início",
    steps: [
      { title: "Acesse a tela de login", description: "Abra o aplicativo e clique na aba \"Criar Conta\"." },
      { title: "Preencha seus dados pessoais", description: "Informe seu nome completo, CPF (ou CNPJ), e-mail e telefone. Todos os campos são obrigatórios." },
      { title: "Crie uma senha segura", description: "Digite uma senha com no mínimo 6 caracteres e confirme-a no campo seguinte." },
      { title: "Informe seu endereço", description: "Digite o CEP para preenchimento automático do endereço. Complete o número da residência." },
      { title: "Código de convite (opcional)", description: "Se você recebeu um código de convite de alguém, insira-o para ganhar dias extras de assinatura." },
      { title: "Finalize o cadastro", description: "Clique em \"Criar Conta\". O sistema confirmará automaticamente seu e-mail e você será redirecionado ao painel." },
    ],
  },
  {
    id: "login",
    icon: <Smartphone className="w-5 h-5" />,
    title: "Login",
    steps: [
      { title: "Acesse a tela de login", description: "Abra o aplicativo. Você verá a tela de login como página inicial." },
      { title: "Use e-mail ou CPF", description: "Você pode fazer login digitando seu e-mail ou CPF no campo de identificação." },
      { title: "Digite sua senha", description: "Insira a senha que você cadastrou e clique em \"Entrar\"." },
      { title: "Problemas para entrar?", description: "Verifique se o CPF ou e-mail estão corretos. Se esqueceu a senha, entre em contato pelo suporte." },
    ],
  },
  {
    id: "dashboard",
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Painel Principal (Dashboard)",
    steps: [
      { title: "Visão geral", description: "O painel mostra as vendas do dia, vendas do mês, produtos com estoque baixo e vendas recentes." },
      { title: "Ações rápidas", description: "Use os atalhos visuais para acessar rapidamente: Produtos, Nova Venda, Clientes, Histórico, Relatórios, Configurações, Assinatura, Fornecedores, Calculadora e Bônus Semanal." },
      { title: "Status da assinatura", description: "No topo do painel você pode ver o status da sua assinatura (Ativa, Período de teste, ou Expirada)." },
      { title: "Ativar ações rápidas", description: "Se os atalhos não aparecem, vá em Configurações e ative a opção \"Ações Rápidas\"." },
    ],
  },
  {
    id: "produtos",
    icon: <Package className="w-5 h-5" />,
    title: "Gestão de Produtos",
    badge: "Essencial",
    steps: [
      { title: "Acessar produtos", description: "No menu lateral ou ações rápidas, clique em \"Produtos\" para ver todos os seus produtos cadastrados." },
      { title: "Cadastrar novo produto", description: "Clique no botão \"+\" ou \"Novo Produto\". Preencha: nome, preço de venda, preço de custo, quantidade em estoque, estoque mínimo e código de barras." },
      { title: "Adicionar fotos", description: "Na tela de cadastro, use o botão de câmera para tirar foto ou selecionar imagem da galeria. Você pode adicionar múltiplas fotos." },
      { title: "Código de barras", description: "Use o botão de scanner para ler o código de barras do produto com a câmera do celular." },
      { title: "Categorias", description: "Organize seus produtos em categorias para facilitar a busca. Crie categorias personalizadas." },
      { title: "Fornecedor", description: "Vincule o produto a um fornecedor cadastrado para melhor controle." },
      { title: "Preço promocional", description: "Defina um preço promocional que será usado nas vendas ao invés do preço normal." },
      { title: "Tipo de produto", description: "Escolha entre Unidade ou Peso (KG) para definir como o produto é vendido." },
      { title: "Editar produto", description: "Na lista de produtos, clique no produto desejado para abrir a tela de edição." },
      { title: "Buscar produtos", description: "Use a barra de busca no topo para encontrar produtos por nome, código interno ou código de barras." },
    ],
  },
  {
    id: "pdv",
    icon: <ShoppingCart className="w-5 h-5" />,
    title: "PDV (Ponto de Venda)",
    badge: "Principal",
    steps: [
      { title: "Abrir o PDV", description: "Acesse pelo menu lateral ou ações rápidas clicando em \"Nova Venda\" ou \"PDV\"." },
      { title: "Adicionar produtos", description: "Clique em \"Adicionar Produto\" para buscar e selecionar produtos. Você pode buscar por nome ou escanear código de barras." },
      { title: "Ajustar quantidades", description: "Use os botões + e - para ajustar a quantidade de cada item no carrinho." },
      { title: "Selecionar cliente (opcional)", description: "Clique em \"Selecionar Cliente\" para vincular a venda a um cliente cadastrado." },
      { title: "Aplicar desconto", description: "Você pode aplicar desconto em valor (R$) na venda." },
      { title: "Formas de pagamento", description: "Escolha entre: Dinheiro, PIX, Cartão de Crédito, Cartão de Débito ou Fiado. Você pode combinar formas de pagamento." },
      { title: "Pagamento em dinheiro", description: "Ao escolher Dinheiro, informe o valor recebido para calcular o troco automaticamente." },
      { title: "Pagamento PIX", description: "Se configurado, o sistema gera automaticamente o QR Code PIX para o cliente pagar." },
      { title: "Venda no fiado", description: "Selecione um cliente e escolha \"Fiado\" como forma de pagamento. O valor será adicionado ao saldo devedor do cliente." },
      { title: "Finalizar venda", description: "Confira o resumo e clique em \"Finalizar Venda\". O estoque será atualizado automaticamente." },
    ],
  },
  {
    id: "clientes",
    icon: <Users className="w-5 h-5" />,
    title: "Gestão de Clientes",
    steps: [
      { title: "Acessar clientes", description: "No menu lateral, clique em \"Clientes\" para ver todos os clientes cadastrados." },
      { title: "Cadastrar cliente", description: "Clique no botão \"+\" ou \"Novo Cliente\". Preencha: nome (obrigatório), telefone, CPF, endereço e data de nascimento." },
      { title: "Saldo do cliente", description: "Cada cliente tem um saldo que pode ser positivo (crédito) ou negativo (débito/fiado)." },
      { title: "Registrar pagamento", description: "Na ficha do cliente, você pode registrar pagamentos para abater o saldo devedor." },
      { title: "Histórico de transações", description: "Veja todas as compras e pagamentos do cliente no histórico de transações." },
      { title: "Buscar clientes", description: "Use a barra de busca para encontrar clientes por nome, telefone ou CPF." },
    ],
  },
  {
    id: "historico",
    icon: <History className="w-5 h-5" />,
    title: "Histórico de Vendas",
    steps: [
      { title: "Acessar histórico", description: "No menu lateral, clique em \"Histórico\" para ver todas as vendas realizadas." },
      { title: "Filtrar por período", description: "Use os filtros de data para visualizar vendas de um período específico." },
      { title: "Detalhes da venda", description: "Clique em uma venda para ver os detalhes: produtos vendidos, forma de pagamento, cliente e valor total." },
      { title: "Resumo do período", description: "O sistema mostra o total de vendas e o valor total no período selecionado." },
    ],
  },
  {
    id: "relatorios",
    icon: <FileText className="w-5 h-5" />,
    title: "Relatórios",
    steps: [
      { title: "Acessar relatórios", description: "No menu lateral, clique em \"Relatórios\" para ver análises do seu negócio." },
      { title: "Vendas por período", description: "Visualize gráficos de vendas diárias, semanais e mensais." },
      { title: "Produtos mais vendidos", description: "Veja quais produtos vendem mais e geram mais receita." },
      { title: "Formas de pagamento", description: "Analise quais formas de pagamento são mais utilizadas pelos seus clientes." },
      { title: "Lucro e margem", description: "Se você cadastrou preço de custo nos produtos, veja o lucro real das suas vendas." },
    ],
  },
  {
    id: "fornecedores",
    icon: <Truck className="w-5 h-5" />,
    title: "Fornecedores",
    steps: [
      { title: "Acessar fornecedores", description: "No menu lateral, clique em \"Fornecedores\" para gerenciar seus fornecedores." },
      { title: "Cadastrar fornecedor", description: "Clique em \"Novo Fornecedor\". Preencha: nome, CNPJ, telefone, e-mail, endereço, pessoa de contato e observações." },
      { title: "Vincular a produtos", description: "Ao cadastrar ou editar um produto, você pode selecionar o fornecedor responsável." },
      { title: "Editar fornecedor", description: "Clique no fornecedor na lista para editar suas informações." },
    ],
  },
  {
    id: "configuracoes",
    icon: <Settings className="w-5 h-5" />,
    title: "Configurações",
    steps: [
      { title: "Dados da loja", description: "Configure o nome da loja, telefone comercial, endereço, tipo de operação e categoria do negócio." },
      { title: "Logo da loja", description: "Faça upload do logotipo da sua loja. Ele aparecerá em comprovantes e no sistema." },
      { title: "Cor do sistema", description: "Personalize a cor principal do sistema de acordo com a identidade visual da sua loja." },
      { title: "Ações rápidas", description: "Ative ou desative os atalhos visuais no painel principal." },
      { title: "Configuração PIX", description: "Configure sua chave PIX (CPF, CNPJ, E-mail, Telefone ou Aleatória) e o nome do recebedor para gerar QR Codes nas vendas." },
      { title: "Modo PIX automático", description: "Se tiver integração com Mercado Pago, ative o modo automático para gerar cobranças PIX com confirmação automática." },
      { title: "Código de convite", description: "Gere seu código de convite para compartilhar com amigos. Quando usarem, ambos ganham dias extras de assinatura." },
      { title: "Ocultar mensagem de teste", description: "Se estiver no período de teste, pode ocultar a mensagem de aviso no painel." },
      { title: "Dados da conta", description: "Visualize seu e-mail, CPF e outras informações da conta." },
      { title: "Instalar aplicativo", description: "Instale o app no seu celular como um aplicativo nativo para acesso mais rápido." },
      { title: "Sair / Excluir conta", description: "Use os botões na parte inferior para sair da conta ou excluí-la permanentemente." },
    ],
  },
  {
    id: "assinatura",
    icon: <CreditCard className="w-5 h-5" />,
    title: "Assinatura",
    steps: [
      { title: "Período de teste", description: "Ao criar sua conta, você ganha 3 dias de teste grátis para conhecer todas as funcionalidades." },
      { title: "Escolher plano", description: "Acesse \"Assinatura\" no menu. Escolha entre o Plano 3 Meses (R$ 29,99) ou o Plano 1 Ano (R$ 69,99 — 41% de economia)." },
      { title: "Pagar com PIX", description: "Clique em \"Pagar com PIX\" no plano desejado. Um QR Code será gerado para pagamento." },
      { title: "Escanear ou copiar", description: "Escaneie o QR Code no app do banco ou copie o código PIX Copia e Cola." },
      { title: "Confirmação automática", description: "O sistema detecta automaticamente quando o pagamento é confirmado e ativa sua assinatura instantaneamente." },
      { title: "Dias extras", description: "Use códigos de convite para ganhar dias extras de assinatura gratuitamente." },
    ],
  },
  {
    id: "calculadora",
    icon: <Calculator className="w-5 h-5" />,
    title: "Calculadora PIX",
    steps: [
      { title: "Para que serve?", description: "A calculadora PIX ajuda a calcular taxas de operações PIX, útil para quem cobra taxa de PIX dos clientes." },
      { title: "Como usar", description: "Acesse \"Calculadora\" no menu ou ações rápidas. Informe o valor e a taxa para ver o cálculo." },
    ],
  },
  {
    id: "auri",
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Auri (Assistente IA)",
    badge: "Novo",
    steps: [
      { title: "O que é a Auri?", description: "A Auri é uma assistente virtual inteligente que ajuda com dúvidas sobre o sistema e dicas para o seu negócio." },
      { title: "Como acessar", description: "Clique no ícone da Auri no canto inferior direito da tela ou acesse pelo menu." },
      { title: "Conversas salvas", description: "Suas conversas com a Auri ficam salvas para consulta futura." },
      { title: "Dicas de uso", description: "Pergunte sobre como usar funcionalidades, peça dicas de vendas, gestão de estoque e muito mais." },
    ],
  },
  {
    id: "convite",
    icon: <Star className="w-5 h-5" />,
    title: "Sistema de Convites",
    steps: [
      { title: "Gerar código", description: "Vá em Configurações > Código de Convite e clique em \"Gerar Código\" (se ainda não tiver um)." },
      { title: "Compartilhar", description: "Copie o código e compartilhe com amigos, familiares ou conhecidos que possam se interessar pelo sistema." },
      { title: "Benefício mútuo", description: "Quando alguém usar seu código ao criar a conta, tanto você quanto o convidado ganham dias extras de assinatura." },
      { title: "Limite de uso", description: "Cada código de convite pode ser usado uma única vez." },
    ],
  },
  {
    id: "instalar",
    icon: <Smartphone className="w-5 h-5" />,
    title: "Instalar o App",
    steps: [
      { title: "Pelo navegador", description: "Acesse o sistema pelo navegador do celular (Chrome recomendado)." },
      { title: "Adicionar à tela inicial", description: "O navegador mostrará uma opção para \"Instalar\" ou \"Adicionar à tela inicial\". Clique nela." },
      { title: "Pelas configurações", description: "Você também pode instalar pelo botão \"Instalar Aplicativo\" na página de Configurações do sistema." },
      { title: "Usar como app", description: "Depois de instalado, o sistema funciona como um aplicativo nativo, com ícone na tela inicial e abertura em tela cheia." },
    ],
  },
];

const ManualCard = ({ section }: { section: ManualSection }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {section.icon}
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{section.title}</CardTitle>
              {section.badge && (
                <Badge variant="secondary" className="text-xs">{section.badge}</Badge>
              )}
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 space-y-4">
              {section.steps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

const Manuals = () => {
  return (
    <PageLoader pageName="Manuais">
      <div className="page-container max-w-4xl mx-auto">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title-icon">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="page-title-text">Manuais do Sistema</h1>
              <p className="page-subtitle">Guia completo de todas as funcionalidades</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {manualSections.map((section) => (
            <ManualCard key={section.id} section={section} />
          ))}
        </div>
      </div>
    </PageLoader>
  );
};

export default Manuals;
