import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText } from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

type Tab = 'terminos' | 'privacidad';

const content = {
  es: {
    backHome: 'Volver al inicio',
    updated: 'Última actualización: agosto 2026',
    tabs: {
      terminos: { label: 'Términos y condiciones', icon: FileText },
      privacidad: { label: 'Política de privacidad', icon: Shield },
    },
    terminos: {
      title: 'Términos y condiciones de uso',
      sections: [
        {
          heading: '1. Aceptación de los términos',
          body: 'Al acceder y utilizar los servicios de Psique Amor, usted acepta quedar vinculado por los presentes términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, le rogamos que no utilice nuestros servicios.',
        },
        {
          heading: '2. Descripción de los servicios',
          body: 'Psique Amor ofrece servicios de atención psicológica profesional en modalidad presencial, virtual y a domicilio, así como cursos de formación en bienestar emocional y recursos digitales. Los servicios se prestan únicamente a través de profesionales debidamente certificados.',
        },
        {
          heading: '3. Uso de la plataforma',
          body: 'El usuario se compromete a utilizar la plataforma de forma lícita y a no emplearla para fines fraudulentos, ofensivos o contrarios a la moral. Está prohibido compartir credenciales de acceso con terceros o intentar acceder a áreas no autorizadas de la plataforma.',
        },
        {
          heading: '4. Reservas y cancelaciones',
          body: 'Las citas reservadas pueden cancelarse con un mínimo de 24 horas de antelación sin penalización. Las cancelaciones realizadas con menos tiempo de anticipación podrán estar sujetas a una tarifa de cancelación según la política vigente del profesional seleccionado.',
        },
        {
          heading: '5. Pagos y reembolsos',
          body: 'Los pagos se procesan a través de pasarelas seguras (Stripe, PayPal). Los reembolsos se tramitarán conforme a la política de cancelación aplicable. En caso de un error técnico imputable a Psique Amor, el reembolso se efectuará de forma íntegra.',
        },
        {
          heading: '6. Propiedad intelectual',
          body: 'Todo el contenido publicado en la plataforma (textos, imágenes, videos, cursos, recursos digitales) es propiedad exclusiva de Psique Amor o de los profesionales colaboradores, y está protegido por la legislación vigente en materia de derechos de autor.',
        },
        {
          heading: '7. Limitación de responsabilidad',
          body: 'Psique Amor no se responsabiliza de los daños derivados de un uso incorrecto de la plataforma ni de decisiones tomadas por los usuarios con base en la información general publicada. Los servicios de atención psicológica no sustituyen en ningún caso a una consulta de urgencia o a tratamientos médicos.',
        },
        {
          heading: '8. Modificaciones',
          body: 'Psique Amor se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor en el momento de su publicación. El uso continuado de la plataforma implica la aceptación de los términos actualizados.',
        },
      ],
    },
    privacidad: {
      title: 'Política de privacidad',
      sections: [
        {
          heading: '1. Responsable del tratamiento',
          body: 'Psique Amor es el responsable del tratamiento de los datos personales que usted nos proporciona a través de esta plataforma. Puede contactarnos para cualquier consulta relacionada con sus datos a través del formulario de contacto.',
        },
        {
          heading: '2. Datos que recopilamos',
          body: 'Recopilamos los datos que usted nos facilita directamente (nombre, correo electrónico, teléfono, información de perfil) y, de forma automatizada, datos técnicos de navegación (dirección IP, tipo de dispositivo, páginas visitadas) con el fin de mejorar la experiencia de uso.',
        },
        {
          heading: '3. Finalidad del tratamiento',
          body: 'Sus datos se utilizan para gestionar su cuenta y citas, procesar pagos, enviar comunicaciones relacionadas con los servicios contratados, mejorar la plataforma y cumplir con las obligaciones legales aplicables. No utilizamos sus datos con fines publicitarios de terceros.',
        },
        {
          heading: '4. Base legal',
          body: 'El tratamiento de sus datos se fundamenta en la ejecución del contrato de servicios, su consentimiento expreso (cuando corresponda) y el cumplimiento de obligaciones legales. Puede retirar su consentimiento en cualquier momento sin que ello afecte a la licitud del tratamiento previo.',
        },
        {
          heading: '5. Conservación de datos',
          body: 'Conservamos sus datos mientras mantenga una cuenta activa y durante el tiempo necesario para cumplir con las obligaciones legales y fiscales aplicables. Una vez finalizada la relación, los datos se eliminarán de forma segura.',
        },
        {
          heading: '6. Compartición con terceros',
          body: 'No vendemos ni cedemos sus datos a terceros con fines comerciales. Compartimos información estrictamente necesaria con proveedores de servicios (procesadores de pago, plataformas de correo electrónico) que actúan bajo acuerdos de confidencialidad y cumplen la normativa de protección de datos.',
        },
        {
          heading: '7. Sus derechos',
          body: 'Tiene derecho a acceder, rectificar, suprimir, portar y oponerse al tratamiento de sus datos. Para ejercer cualquiera de estos derechos, puede contactarnos a través del formulario de contacto. Atenderemos su solicitud en un plazo máximo de 30 días hábiles.',
        },
        {
          heading: '8. Seguridad',
          body: 'Aplicamos medidas técnicas y organizativas adecuadas para proteger sus datos frente a accesos no autorizados, pérdida o alteración. Las comunicaciones con nuestra plataforma se realizan siempre bajo conexión cifrada (HTTPS/TLS).',
        },
        {
          heading: '9. Cookies',
          body: 'Utilizamos cookies estrictamente necesarias para el funcionamiento de la plataforma y, con su consentimiento, cookies analíticas para mejorar la experiencia. Puede gestionar sus preferencias de cookies en cualquier momento desde la configuración de su navegador.',
        },
      ],
    },
  },
  en: {
    backHome: 'Back to home',
    updated: 'Last updated: August 2026',
    tabs: {
      terminos: { label: 'Terms & conditions', icon: FileText },
      privacidad: { label: 'Privacy policy', icon: Shield },
    },
    terminos: {
      title: 'Terms and conditions of use',
      sections: [
        { heading: '1. Acceptance of terms', body: 'By accessing and using Psique Amor\'s services, you agree to be bound by these terms and conditions of use. If you disagree with any part of these terms, please do not use our services.' },
        { heading: '2. Service description', body: 'Psique Amor provides professional psychological care in person, virtual and home-visit formats, as well as emotional wellbeing training courses and digital resources. Services are delivered exclusively by duly certified professionals.' },
        { heading: '3. Platform use', body: 'Users agree to use the platform lawfully and not for fraudulent, offensive or immoral purposes. Sharing login credentials with third parties or attempting to access unauthorized areas is strictly prohibited.' },
        { heading: '4. Bookings and cancellations', body: 'Booked appointments may be cancelled at least 24 hours in advance without penalty. Late cancellations may be subject to a cancellation fee according to the selected professional\'s current policy.' },
        { heading: '5. Payments and refunds', body: 'Payments are processed through secure gateways (Stripe, PayPal). Refunds are handled in accordance with the applicable cancellation policy. In the event of a technical error attributable to Psique Amor, a full refund will be issued.' },
        { heading: '6. Intellectual property', body: 'All content published on the platform (texts, images, videos, courses, digital resources) is the exclusive property of Psique Amor or its collaborating professionals and is protected by applicable copyright law.' },
        { heading: '7. Limitation of liability', body: 'Psique Amor is not liable for damages resulting from improper use of the platform or decisions made by users based on general information published on it. Psychological care services do not replace emergency consultations or medical treatment.' },
        { heading: '8. Amendments', body: 'Psique Amor reserves the right to amend these terms at any time. Amendments take effect upon publication. Continued use of the platform implies acceptance of the updated terms.' },
      ],
    },
    privacidad: {
      title: 'Privacy policy',
      sections: [
        { heading: '1. Data controller', body: 'Psique Amor is the controller of the personal data you provide through this platform. For any data-related queries, please contact us via the contact form.' },
        { heading: '2. Data we collect', body: 'We collect data you provide directly (name, email, phone, profile information) and, automatically, technical browsing data (IP address, device type, pages visited) to improve the user experience.' },
        { heading: '3. Purpose of processing', body: 'Your data is used to manage your account and appointments, process payments, send service-related communications, improve the platform and comply with applicable legal obligations. We do not use your data for third-party advertising.' },
        { heading: '4. Legal basis', body: 'Processing is based on the service contract, your explicit consent (where applicable) and legal obligations. You may withdraw consent at any time without affecting the lawfulness of prior processing.' },
        { heading: '5. Data retention', body: 'We retain your data while you hold an active account and for as long as required to meet applicable legal and tax obligations. Upon termination of the relationship, data is securely deleted.' },
        { heading: '6. Data sharing', body: 'We do not sell or transfer your data to third parties for commercial purposes. We share strictly necessary information with service providers (payment processors, email platforms) under confidentiality agreements.' },
        { heading: '7. Your rights', body: 'You have the right to access, rectify, erase, port and object to the processing of your data. To exercise any of these rights, please contact us via the contact form. We will respond within 30 business days.' },
        { heading: '8. Security', body: 'We apply appropriate technical and organisational measures to protect your data against unauthorized access, loss or alteration. All communications with our platform use encrypted connections (HTTPS/TLS).' },
        { heading: '9. Cookies', body: 'We use strictly necessary cookies for platform functionality and, with your consent, analytical cookies to improve the experience. You can manage your cookie preferences at any time through your browser settings.' },
      ],
    },
  },
} as const;

export default function LegalPage() {
  const { language } = useSiteLanguage();
  const t = content[language];
  const [activeTab, setActiveTab] = useState<Tab>('terminos');
  const section = t[activeTab];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1 pt-[82px] sm:pt-[86px]">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-lilac-50 py-16 sm:py-20">
          <div className="pointer-events-none absolute right-0 top-0 -z-0 h-80 w-80 rounded-full bg-brand-100/50 blur-3xl" />
          <div className="container-wide relative">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
              <ArrowLeft size={15} /> {t.backHome}
            </Link>
            <p className="text-xs font-bold uppercase tracking-widest text-ink/40">{t.updated}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
              {section.title}
            </h1>
          </div>
        </div>

        {/* Tabs + Content */}
        <div className="container-wide py-12">
          <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
            {/* Sidebar tabs */}
            <nav className="flex flex-row gap-2 lg:flex-col">
              {(['terminos', 'privacidad'] as Tab[]).map((key) => {
                const { label, icon: Icon } = t.tabs[key];
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      active
                        ? 'bg-brand-gradient text-white shadow-soft'
                        : 'border border-brand-100 bg-white text-ink/60 hover:bg-brand-50 hover:text-brand-700'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Document */}
            <div className="rounded-3xl border border-brand-100 bg-white p-8 shadow-soft">
              <h2 className="mb-8 font-display text-2xl font-semibold text-ink">{section.title}</h2>
              <div className="space-y-8">
                {section.sections.map((s) => (
                  <div key={s.heading}>
                    <h3 className="mb-2 font-display text-base font-semibold text-ink">{s.heading}</h3>
                    <p className="text-sm leading-7 text-ink/65">{s.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 border-t border-brand-100 pt-6">
                <p className="text-xs text-ink/40">{t.updated} · Psique Amor</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
