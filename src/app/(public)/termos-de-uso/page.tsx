import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso e Política de Privacidade | StudyTrack",
  description:
    "Conheça os termos de uso, política de privacidade e como a StudyTrack utiliza seus dados para personalizar sua experiência de estudos.",
};

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-white font-[var(--font-geist-sans)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-extrabold text-slate-900 tracking-tight">
            Study<span className="text-blue-600">Track</span>
          </span>
          <a
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← Voltar
          </a>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Título */}
        <div className="mb-10">
          <h1
            className="text-4xl font-extrabold tracking-tight mb-4"
            style={{
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Termos de Uso e Política de Privacidade
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Última atualização: 17 de abril de 2026 — Versão 1.0
          </p>
        </div>

        {/* Índice */}
        <nav className="bg-slate-50 rounded-2xl p-6 mb-12 border border-slate-100">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Índice
          </p>
          <ol className="space-y-2">
            <li><a href="#secao-1" className="text-blue-600 hover:text-blue-700 text-sm font-medium">1. Aceitação dos Termos</a></li>
            <li><a href="#secao-2" className="text-blue-600 hover:text-blue-700 text-sm font-medium">2. Sobre a StudyTrack</a></li>
            <li><a href="#secao-3" className="text-blue-600 hover:text-blue-700 text-sm font-medium">3. Cadastro e Conta</a></li>
            <li><a href="#secao-4" className="text-blue-600 hover:text-blue-700 text-sm font-medium">4. Coleta e Uso de Dados (LGPD)</a></li>
            <li><a href="#secao-5" className="text-blue-600 hover:text-blue-700 text-sm font-medium">5. Uso de Inteligência Artificial</a></li>
            <li><a href="#secao-6" className="text-blue-600 hover:text-blue-700 text-sm font-medium">6. Compartilhamento de Dados</a></li>
            <li><a href="#secao-7" className="text-blue-600 hover:text-blue-700 text-sm font-medium">7. Retenção e Exclusão de Dados</a></li>
            <li><a href="#secao-8" className="text-blue-600 hover:text-blue-700 text-sm font-medium">8. Comunicações via WhatsApp</a></li>
            <li><a href="#secao-9" className="text-blue-600 hover:text-blue-700 text-sm font-medium">9. Planos e Pagamentos</a></li>
            <li><a href="#secao-10" className="text-blue-600 hover:text-blue-700 text-sm font-medium">10. Propriedade Intelectual</a></li>
            <li><a href="#secao-11" className="text-blue-600 hover:text-blue-700 text-sm font-medium">11. Limitação de Responsabilidade</a></li>
            <li><a href="#secao-12" className="text-blue-600 hover:text-blue-700 text-sm font-medium">12. Alterações nos Termos</a></li>
            <li><a href="#secao-13" className="text-blue-600 hover:text-blue-700 text-sm font-medium">13. Contato e DPO</a></li>
            <li><a href="#secao-14" className="text-blue-600 hover:text-blue-700 text-sm font-medium">14. Foro</a></li>
          </ol>
        </nav>

        {/* Seções */}
        <section id="secao-1" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Aceitação dos Termos</h2>
          <p className="text-slate-600 leading-relaxed">
            Ao utilizar a plataforma StudyTrack, o usuário declara ter lido, compreendido e concordado
            integralmente com estes Termos. O uso continuado da plataforma após qualquer alteração
            implica aceitação tácita das novas condições.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-2" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Sobre a StudyTrack</h2>
          <p className="text-slate-600 leading-relaxed">
            A StudyTrack é uma plataforma de educação adaptativa que utiliza inteligência artificial
            para criar planos de estudo personalizados, com foco no ENEM e vestibulares. Operamos
            via plataforma web e assistente via WhatsApp.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-3" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Cadastro e Conta</h2>
          <p className="text-slate-600 leading-relaxed">
            O usuário é responsável pela veracidade das informações fornecidas. É proibido criar
            contas com dados falsos ou de terceiros. A StudyTrack reserva o direito de suspender
            contas com dados inconsistentes ou uso indevido.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-4" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">
            4. Coleta e Uso de Dados (LGPD — Lei 13.709/2018)
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Coletamos os seguintes dados para prestação do serviço:
          </p>
          <ul className="mt-3 space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Nome completo e e-mail (identificação e comunicação)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Número de WhatsApp (envio do plano de estudos e notificações)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Dados de desempenho acadêmico (personalização do plano via IA)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Histórico de interações com o assistente (melhoria contínua do serviço)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Dados de pagamento processados pelo gateway Asaas (não armazenamos dados de cartão)
              </span>
            </li>
          </ul>
          <p className="text-slate-600 leading-relaxed mt-4">
            Base legal: execução de contrato (Art. 7º, V, LGPD) e legítimo interesse (Art. 7º, IX, LGPD).
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-5" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Uso de Inteligência Artificial</h2>
          <p className="text-slate-600 leading-relaxed">
            A plataforma utiliza modelos de IA (Google Gemini) para gerar planos de estudo, responder
            dúvidas e analisar redações. As interações podem ser utilizadas de forma anonimizada para
            melhoria dos modelos e da experiência. Nenhuma conversa é revendida a terceiros.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-6" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Compartilhamento de Dados</h2>
          <p className="text-slate-600 leading-relaxed">
            Os dados do usuário podem ser compartilhados com:
          </p>
          <ul className="mt-3 space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Provedores de infraestrutura (Supabase, Fly.io) para operação do serviço</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Gateway de pagamento (Asaas) para processamento de cobranças</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Autoridades públicas, quando exigido por lei</span>
            </li>
          </ul>
          <p className="text-slate-600 leading-relaxed mt-4">
            Não vendemos, alugamos ou cedemos dados pessoais a terceiros para fins comerciais.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-7" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">7. Retenção e Exclusão de Dados</h2>
          <p className="text-slate-600 leading-relaxed">
            Os dados são mantidos pelo período necessário à prestação do serviço e obrigações legais.
            O usuário pode solicitar a exclusão da sua conta e dados a qualquer momento pelo e-mail{" "}
            <a
              href="mailto:privacidade@studytrack.com.br"
              className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              privacidade@studytrack.com.br
            </a>
            . A exclusão será processada em até 15 dias úteis.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-8" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">8. Comunicações via WhatsApp</h2>
          <p className="text-slate-600 leading-relaxed">
            Ao fornecer o número de WhatsApp, o usuário consente expressamente no recebimento de
            mensagens relacionadas ao plano de estudos, lembretes e notificações do serviço. O
            usuário pode desativar as notificações a qualquer momento enviando a mensagem{" "}
            <span className="font-semibold text-slate-700">DESATIVAR</span> pelo próprio WhatsApp.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-9" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">9. Planos e Pagamentos</h2>
          <p className="text-slate-600 leading-relaxed">
            Os planos pagos são cobrados mensalmente via cartão de crédito ou PIX através do gateway
            Asaas. Não há reembolso de períodos já utilizados. O cancelamento pode ser feito a
            qualquer momento e o acesso permanece até o fim do período pago.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-10" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">10. Propriedade Intelectual</h2>
          <p className="text-slate-600 leading-relaxed">
            Todo o conteúdo da plataforma (textos, questões, algoritmos, marca) é de propriedade
            exclusiva da StudyTrack. É proibida a reprodução, distribuição ou uso comercial sem
            autorização prévia por escrito.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-11" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">11. Limitação de Responsabilidade</h2>
          <p className="text-slate-600 leading-relaxed">
            A StudyTrack não garante aprovação em exames. O desempenho acadêmico depende do esforço
            e dedicação do usuário. Não nos responsabilizamos por resultados específicos ou danos
            indiretos decorrentes do uso da plataforma.
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-12" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">12. Alterações nos Termos</h2>
          <p className="text-slate-600 leading-relaxed">
            Reservamo-nos o direito de alterar estes Termos a qualquer momento. Alterações
            substanciais serão comunicadas via e-mail e/ou WhatsApp com antecedência mínima de 7
            dias. A versão vigente estará sempre disponível em{" "}
            <a
              href="https://studytrack.com.br/termos-de-uso"
              className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              studytrack.com.br/termos-de-uso
            </a>
            .
          </p>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-13" className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3">13. Contato e DPO</h2>
          <p className="text-slate-600 leading-relaxed">
            Para dúvidas, solicitações ou exercício de direitos LGPD:
          </p>
          <ul className="mt-3 space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                E-mail:{" "}
                <a
                  href="mailto:privacidade@studytrack.com.br"
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  privacidade@studytrack.com.br
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Encarregado de Dados (DPO):{" "}
                <a
                  href="mailto:equipe@studytrack.com.br"
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  equipe@studytrack.com.br
                </a>
              </span>
            </li>
          </ul>
        </section>

        <hr className="border-slate-100 mb-10" />

        <section id="secao-14" className="mb-16">
          <h2 className="text-xl font-bold text-slate-900 mb-3">14. Foro</h2>
          <p className="text-slate-600 leading-relaxed">
            Fica eleito o foro da Comarca de Ribeirão Preto, Estado de São Paulo, para dirimir
            quaisquer controvérsias decorrentes destes Termos, com renúncia expressa a qualquer
            outro, por mais privilegiado que seja.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100 pt-8 text-center">
          <p className="text-sm text-slate-400">
            © 2026 StudyTrack. Todos os direitos reservados.
          </p>
        </footer>
      </main>
    </div>
  );
}
