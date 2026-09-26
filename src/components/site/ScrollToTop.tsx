import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Al navegar a otra página (Link / navigate) se vuelve arriba: React Router no
// lo hace solo, y p. ej. "Agendar una cita" desde el final del Home abría
// /agendar a mitad de página. Con "Atrás"/"Adelante" (POP) se respeta la
// posición que restaura el navegador, y los enlaces con #ancla hacen su scroll.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const tipo = useNavigationType();

  useEffect(() => {
    if (tipo === 'POP' || hash) return;
    // El sitio usa `scroll-behavior: smooth` global: se desactiva solo para este
    // salto, si no la subida puede quedar a medias al cambiar de página.
    const html = document.documentElement;
    const previo = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.scrollBehavior = previo;
  }, [pathname, hash, tipo]);

  return null;
}
