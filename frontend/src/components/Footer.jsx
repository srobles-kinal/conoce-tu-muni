/**
 * Footer con imagen personalizada.
 * Guarda tu imagen en: src/assets/footer.png
 *
 * Para ajustar el tamaño cambia max-h-40 (ver opciones en el README).
 */
import footerImg from '../assets/img/pie_conoce_tu_muni.jpeg';

export default function Footer() {
  return (
    <footer className="w-full mt-12">
      <img
        src={footerImg}
        alt="Conoce tu Muni - Municipalidad de Guatemala"
        className="w-full h-auto max-h-40 object-cover block"
      />
      <div className="text-center text-slate-600 text-xs py-3 bg-muni-crema">
     DAV-ROBLES.ORDOÑEZ-IT · Conoce tu Muni © {new Date().getFullYear()}
      </div>
    </footer>
  );
}
