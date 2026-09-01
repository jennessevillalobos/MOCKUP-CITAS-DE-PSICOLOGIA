import { Instagram, Linkedin, Youtube } from 'lucide-react';
import { contactConfig } from '@/config/contact';
import { translations } from '@/i18n/translations';
import { useSiteLanguage } from '@/context/SiteLanguageContext';

const logo = '/src/assets/logos/1_(1).png';

function FooterColumn({ title, links }: { title: string; links: readonly string[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold">{title}</h3>
      <ul className="mt-5 space-y-3 text-sm text-white/60">
        {links.map((link) => (
          <li key={link}><a href="/#top" className="transition hover:text-white">{link}</a></li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  const { language } = useSiteLanguage();
  const t = translations[language];

  return (
    <footer className="bg-brand-900 text-white">
      <div className="container-wide py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="inline-flex rounded-xl bg-white px-4 py-3">
              <img src={logo} alt="Psique Amor" className="w-[168px]" />
            </div>
            <p className="mt-6 max-w-xs text-sm leading-6 text-white/60">
              {language === 'es' ? 'Un espacio seguro para volver a encontrarte.' : 'A safe space to find your way back to yourself.'}
            </p>
            <div className="mt-7 flex gap-3">
              <a href="/#top" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"><Instagram size={16} /></a>
              <a href="/#top" aria-label="LinkedIn" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"><Linkedin size={16} /></a>
              <a href="/#top" aria-label="Youtube" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"><Youtube size={16} /></a>
            </div>
          </div>
          <FooterColumn title={t.footerNav} links={t.nav} />
          <FooterColumn title={t.footerServices} links={[t.individual, t.couple, t.family, language === 'es' ? 'Orientación emocional' : 'Emotional guidance', language === 'es' ? 'Sesiones online' : 'Online sessions']} />
          <FooterColumn title={t.footerResources} links={[language === 'es' ? 'Cursos' : 'Courses', language === 'es' ? 'Videos' : 'Videos', language === 'es' ? 'Libros digitales' : 'Digital books', 'Aula virtual']} />
          <div>
            <h3 className="text-sm font-bold">{t.footerContact}</h3>
            <div className="mt-5 space-y-3 text-sm leading-6 text-white/60">
              <p>{contactConfig.phone}</p>
              <p>{contactConfig.email}</p>
              <p>{contactConfig.location}</p>
              <p>{contactConfig.hours}</p>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row">
          <span>© 2024 Psique Amor</span>
          <div className="flex flex-wrap gap-5">
            <a href="/#contact" className="hover:text-white">{t.privacy}</a>
            <a href="/#contact" className="hover:text-white">{t.terms}</a>
            <span>ES | EN</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
