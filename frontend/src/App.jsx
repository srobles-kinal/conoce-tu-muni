import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import FormularioRecorrido from './components/FormularioRecorrido.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-6">
        <FormularioRecorrido />
      </main>
      <Footer />
    </div>
  );
}
