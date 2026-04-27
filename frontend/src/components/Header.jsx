/**
 * Header con imagen personalizada.
 * Guarda tu logo en: src/assets/logo.png
 *
 * Si tu archivo tiene otro nombre, ajusta el import.
 * Para cambiar tamaño edita la clase h-32 md:h-40 abajo.
 */
import logo from '../assets/img/pie_conoce_tu_muni.jpeg';

export default function Header() {
  return (
    <header className="w-full flex flex-col items-center pt-6 pb-4 bg-white">
      <img
        src={logo}
        alt="Conoce tu Muni - Municipalidad de Guatemala"
        className="h-32 md:h-40 w-auto object-contain"
      />
    </header>
  );
}
