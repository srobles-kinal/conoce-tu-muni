import { useEffect, useRef } from 'react';

/**
 * Wrapper de reCAPTCHA v2 (checkbox "No soy un robot").
 * Renderiza el widget cuando el script de Google está disponible.
 *
 * Props:
 *   onChange: callback que recibe el token (string) o null cuando expira
 *
 * Setup:
 *   1. index.html debe incluir <script src="https://www.google.com/recaptcha/api.js" async defer>
 *   2. .env debe tener VITE_RECAPTCHA_SITE_KEY
 */
export default function Recaptcha({ onChange }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      console.error('VITE_RECAPTCHA_SITE_KEY no está configurado');
      return;
    }

    // Esperar a que el script de Google esté cargado
    const renderWhenReady = () => {
      if (window.grecaptcha && window.grecaptcha.render && containerRef.current) {
        // Evitar doble render
        if (widgetIdRef.current === null) {
          try {
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              callback: (token) => onChange?.(token),
              'expired-callback': () => onChange?.(null),
              'error-callback': () => onChange?.(null),
            });
          } catch (err) {
            console.warn('reCAPTCHA ya renderizado o error:', err.message);
          }
        }
      } else {
        setTimeout(renderWhenReady, 200);
      }
    };

    renderWhenReady();
  }, [siteKey, onChange]);

  if (!siteKey) {
    return (
      <div className="text-xs text-red-600 italic">
        reCAPTCHA no configurado (falta VITE_RECAPTCHA_SITE_KEY)
      </div>
    );
  }

  return <div ref={containerRef} />;
}

/**
 * Helper para resetear el widget desde fuera (útil después de un error).
 */
export function resetRecaptcha() {
  if (window.grecaptcha && window.grecaptcha.reset) {
    try {
      window.grecaptcha.reset();
    } catch (err) {
      console.warn('No se pudo resetear reCAPTCHA:', err.message);
    }
  }
}
