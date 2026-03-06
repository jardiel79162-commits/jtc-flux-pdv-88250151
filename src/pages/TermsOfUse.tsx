import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TERMS_VERSION = "1.0";

const TermsOfUse = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="bg-card rounded-lg p-6 md:p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Termos de Uso
          </h1>
          <p className="text-muted-foreground mb-8">
            Versão {TERMS_VERSION} — Última atualização: 06 de março de 2026
          </p>

          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
              <p className="text-muted-foreground leading-relaxed">
                Bem-vindo ao <strong>JTC FLUX PDV</strong>. Ao acessar ou utilizar o sistema, você concorda integralmente com os presentes Termos de Uso. Caso não concorde com algum dos termos aqui descritos, solicitamos que não utilize o sistema. O JTC FLUX PDV é um software de gestão comercial e ponto de venda (PDV) desenvolvido por <strong>Jardiel De Sousa Lopes</strong>, criador da <strong>JTC</strong>, destinado a comerciantes para controle de vendas, produtos, estoque, clientes, fornecedores e geração de relatórios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Cadastro e Conta do Usuário</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Para utilizar o JTC FLUX PDV, é necessário criar uma conta fornecendo informações verdadeiras, completas e atualizadas. O usuário é inteiramente responsável por:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Manter a veracidade e atualização de todas as informações fornecidas no cadastro;</li>
                <li>Proteger e manter em sigilo sua senha de acesso;</li>
                <li>Toda e qualquer atividade realizada em sua conta;</li>
                <li>Notificar imediatamente a JTC em caso de uso não autorizado de sua conta.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                A JTC reserva-se o direito de suspender ou encerrar contas que apresentem informações falsas, incompletas ou que violem estes Termos de Uso.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Uso do Sistema</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                O JTC FLUX PDV é uma ferramenta de gestão comercial e ponto de venda que oferece funcionalidades como:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Registro e controle de vendas;</li>
                <li>Cadastro e gerenciamento de produtos e estoque;</li>
                <li>Gestão de clientes e fornecedores;</li>
                <li>Geração de relatórios comerciais;</li>
                <li>Calculadora financeira integrada;</li>
                <li>Sistema de assinatura e controle de acesso.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                O usuário compromete-se a utilizar o sistema de forma lícita, respeitando a legislação vigente e os direitos de terceiros. É expressamente proibido utilizar o sistema para fins ilegais, fraudulentos ou que possam causar danos a terceiros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Planos e Pagamentos</h2>
              <p className="text-muted-foreground leading-relaxed">
                O JTC FLUX PDV pode oferecer diferentes planos de acesso, incluindo períodos de teste gratuito e planos pagos com funcionalidades adicionais. Os valores, condições e formas de pagamento serão informados de forma clara dentro do sistema. A JTC reserva-se o direito de alterar os preços e condições dos planos mediante aviso prévio aos usuários. O não pagamento das assinaturas poderá resultar na suspensão temporária do acesso ao sistema até a regularização.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Sistema de Indicações</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                O JTC FLUX PDV oferece um sistema de indicações onde cada usuário possui um código único de convite. Ao indicar novos usuários, ambos podem receber benefícios como períodos gratuitos de uso. Entretanto:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>É expressamente proibida a criação de contas falsas ou fictícias com o objetivo de obter benefícios indevidos;</li>
                <li>O uso de bots, scripts ou qualquer método automatizado para gerar indicações fraudulentas é proibido;</li>
                <li>A manipulação do sistema de indicações de qualquer forma constitui violação destes termos;</li>
                <li>Condutas fraudulentas poderão resultar na suspensão ou cancelamento permanente da conta, sem direito a reembolso;</li>
                <li>A JTC implementa sistemas antifraude para detectar e coibir práticas irregulares.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Responsabilidade do Usuário</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                O usuário é integralmente responsável por:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Todas as vendas registradas em sua conta no sistema;</li>
                <li>O cumprimento de todas as obrigações fiscais, tributárias e legais decorrentes de suas atividades comerciais;</li>
                <li>A emissão de documentos fiscais quando exigido pela legislação aplicável;</li>
                <li>A veracidade e precisão dos dados inseridos no sistema;</li>
                <li>O backup de dados importantes quando necessário.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                O JTC FLUX PDV é uma ferramenta de gestão e <strong>não substitui a responsabilidade do comerciante</strong> perante os órgãos fiscais e regulatórios. A JTC não se responsabiliza por eventuais prejuízos decorrentes de informações incorretas inseridas pelo usuário ou por decisões comerciais tomadas com base nos dados do sistema.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Propriedade Intelectual</h2>
              <p className="text-muted-foreground leading-relaxed">
                O sistema <strong>JTC FLUX PDV</strong>, incluindo mas não limitado a seu código-fonte, design, interface, logotipo, marca, funcionalidades e todo o conteúdo original, é de propriedade exclusiva da <strong>JTC</strong>, desenvolvido por <strong>Jardiel De Sousa Lopes</strong>. Todos os direitos são reservados. É proibida a reprodução, distribuição, modificação, engenharia reversa, descompilação ou qualquer forma de cópia total ou parcial do sistema sem autorização prévia e expressa da JTC.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Disponibilidade do Serviço</h2>
              <p className="text-muted-foreground leading-relaxed">
                A JTC se esforça para manter o sistema disponível 24 horas por dia, 7 dias por semana. No entanto, o serviço pode sofrer interrupções temporárias para manutenção, atualizações ou por motivos de força maior. A JTC não garante disponibilidade ininterrupta do sistema e não se responsabiliza por eventuais prejuízos causados por indisponibilidade temporária.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground leading-relaxed">
                A JTC não se responsabiliza por danos diretos, indiretos, incidentais, especiais ou consequenciais resultantes do uso ou impossibilidade de uso do sistema, incluindo perda de dados, lucros cessantes ou interrupção de negócios. O uso do sistema é por conta e risco do usuário.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Alterações nos Termos</h2>
              <p className="text-muted-foreground leading-relaxed">
                A JTC reserva-se o direito de modificar estes Termos de Uso a qualquer momento. Quando alterações significativas forem realizadas, os usuários serão notificados através do sistema e poderá ser solicitada uma nova aceitação dos termos. O uso continuado do sistema após a publicação das alterações constitui aceitação dos novos termos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Rescisão</h2>
              <p className="text-muted-foreground leading-relaxed">
                O usuário pode encerrar sua conta a qualquer momento através das configurações do sistema ou solicitando exclusão pelo suporte. A JTC também pode encerrar ou suspender o acesso do usuário em caso de violação destes termos, sem aviso prévio e sem direito a reembolso.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Legislação Aplicável</h2>
              <p className="text-muted-foreground leading-relaxed">
                Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer disputa relacionada a estes termos será submetida ao foro da comarca de domicílio do desenvolvedor, com exclusão de qualquer outro.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para dúvidas, sugestões ou reclamações sobre estes Termos de Uso, entre em contato com <strong>Jardiel De Sousa Lopes</strong> através dos canais disponíveis no aplicativo JTC FLUX PDV.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                © {new Date().getFullYear()} JTC FLUX PDV — Desenvolvido por Jardiel De Sousa Lopes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
