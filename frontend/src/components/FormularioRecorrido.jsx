import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const estadoInicial = {
  solicitanteNombre: '',
  solicitanteDpi: '',
  solicitanteTelefono: '',
  categoria: '',
  modalidad: '',
  universidad: '',
  facultad: '',
  tipoRecorrido: '',
  establecimiento: '',
  rangoEdades: '',
  cantidadEstudiantes: '',
  fechaRecorrido: '',
  horaLlegada: '',
  tiempoEstimado: '',
  dpiVerificado: false,
  sireAdjunto: '',
  comentarios: '',
  responsableNombre: '',
  responsableDpi: '',
  responsableTelefono: '',
  responsableCorreo: '',
};

export default function FormularioRecorrido() {
  const [datos, setDatos] = useState(estadoInicial);
  const [archivos, setArchivos] = useState({
    archivoDpis: null,
    cartaFacultad: null,
    archivoSire: null,
  });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDatos((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  };

  const onFile = (e) => {
    const { name, files } = e.target;
    setArchivos((prev) => ({ ...prev, [name]: files[0] || null }));
  };

  const validar = () => {
    const e = {};
    const soloDigitos = (v) => (v || '').replace(/\D/g, '');

    if (!datos.solicitanteNombre.trim()) e.solicitanteNombre = 'Requerido';
    if (soloDigitos(datos.solicitanteDpi).length !== 13) e.solicitanteDpi = 'DPI debe tener 13 dígitos';
    if (soloDigitos(datos.solicitanteTelefono).length !== 8) e.solicitanteTelefono = 'Teléfono debe tener 8 dígitos';

    if (!datos.categoria) e.categoria = 'Selecciona una categoría';

    if (datos.categoria === 'universitario') {
      if (!datos.modalidad) e.modalidad = 'Selecciona una modalidad';
      if (!datos.universidad.trim()) e.universidad = 'Requerido';
      if (!datos.facultad.trim()) e.facultad = 'Requerido';
    }

    if (datos.categoria === 'educativo') {
      if (!datos.tipoRecorrido) e.tipoRecorrido = 'Selecciona un tipo';
      if (!datos.establecimiento.trim()) e.establecimiento = 'Requerido';
      if (!datos.rangoEdades) e.rangoEdades = 'Requerido';
      if (!datos.cantidadEstudiantes || Number(datos.cantidadEstudiantes) <= 0)
        e.cantidadEstudiantes = 'Cantidad inválida';
    }

    if (!datos.fechaRecorrido) e.fechaRecorrido = 'Requerido';
    if (!datos.horaLlegada) e.horaLlegada = 'Requerido';
    if (!datos.tiempoEstimado.trim()) e.tiempoEstimado = 'Requerido';

    if (!datos.responsableNombre.trim()) e.responsableNombre = 'Requerido';
    if (soloDigitos(datos.responsableDpi).length !== 13) e.responsableDpi = 'DPI debe tener 13 dígitos';
    if (soloDigitos(datos.responsableTelefono).length !== 8) e.responsableTelefono = 'Teléfono debe tener 8 dígitos';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.responsableCorreo)) e.responsableCorreo = 'Correo inválido';

    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (evt) => {
    evt.preventDefault();
    setMensaje(null);

    if (!validar()) {
      setMensaje({ tipo: 'error', texto: 'Revisa los campos marcados en rojo.' });
      return;
    }

    setEnviando(true);

    try {
      const fd = new FormData();
      Object.entries(datos).forEach(([k, v]) => fd.append(k, v));
      Object.entries(archivos).forEach(([k, file]) => {
        if (file) fd.append(k, file);
      });

      const res = await fetch(`${API_URL}/api/solicitudes`, {
        method: 'POST',
        body: fd,
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        const msg = json.errores?.join(' · ') || json.error || 'Error al enviar.';
        setMensaje({ tipo: 'error', texto: msg });
      } else {
        setMensaje({ tipo: 'ok', texto: json.mensaje });
        setDatos(estadoInicial);
        setArchivos({ archivoDpis: null, cartaFacultad: null, archivoSire: null });
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'No se pudo conectar con el servidor. Verifica tu conexión.' });
    } finally {
      setEnviando(false);
    }
  };

  const esUniversitario = datos.categoria === 'universitario';
  const esTurista = datos.categoria === 'turista';
  const esEducativo = datos.categoria === 'educativo';

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 md:p-10 space-y-8"
    >
      <h1 className="text-center text-2xl md:text-3xl font-extrabold text-muni-azul tracking-tight">
        SOLICITUD DE RECORRIDO TURÍSTICO / EDUCATIVO
      </h1>

      {/* I. SOLICITANTE */}
      <section className="space-y-4">
        <div className="seccion-titulo">I. Datos del solicitante</div>

        <div>
          <label className="campo-label">Nombre completo:</label>
          <input name="solicitanteNombre" value={datos.solicitanteNombre} onChange={onChange} className="campo-input" />
          {errores.solicitanteNombre && <p className="campo-error">{errores.solicitanteNombre}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="campo-label">DPI:</label>
            <input name="solicitanteDpi" value={datos.solicitanteDpi} onChange={onChange} inputMode="numeric" maxLength={13} className="campo-input" />
            {errores.solicitanteDpi && <p className="campo-error">{errores.solicitanteDpi}</p>}
          </div>
          <div>
            <label className="campo-label">Teléfono de contacto:</label>
            <input name="solicitanteTelefono" value={datos.solicitanteTelefono} onChange={onChange} inputMode="numeric" maxLength={8} className="campo-input" />
            {errores.solicitanteTelefono && <p className="campo-error">{errores.solicitanteTelefono}</p>}
          </div>
        </div>
      </section>

      {/* II. RECORRIDO */}
      <section className="space-y-4">
        <div className="seccion-titulo">II. Detalles del recorrido solicitado</div>

        <div>
          <label className="campo-label">Categoría del recorrido:</label>
          <div className="flex flex-wrap gap-6 mt-1">
            {[
              { v: 'universitario', l: 'Universitario' },
              { v: 'turista', l: 'Turista' },
              { v: 'educativo', l: 'Establecimiento educativo' },
            ].map((op) => (
              <label key={op.v} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="categoria" value={op.v} checked={datos.categoria === op.v} onChange={onChange} className="checkbox-muni" />
                <span className="text-sm font-medium text-slate-700">{op.l}</span>
              </label>
            ))}
          </div>
          {errores.categoria && <p className="campo-error">{errores.categoria}</p>}
        </div>

        {esUniversitario && (
          <>
            <div>
              <label className="campo-label">Modalidad:</label>
              <div className="flex gap-6 mt-1">
                {['individual', 'institucional'].map((m) => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer capitalize">
                    <input type="radio" name="modalidad" value={m} checked={datos.modalidad === m} onChange={onChange} className="checkbox-muni" />
                    <span className="text-sm font-medium">{m}</span>
                  </label>
                ))}
              </div>
              {errores.modalidad && <p className="campo-error">{errores.modalidad}</p>}
            </div>

            <div>
              <label className="campo-label">Nombre de la casa de estudios (Universidad):</label>
              <input name="universidad" value={datos.universidad} onChange={onChange} className="campo-input" />
              {errores.universidad && <p className="campo-error">{errores.universidad}</p>}
            </div>
            <div>
              <label className="campo-label">Facultad / escuela a la que pertenece:</label>
              <input name="facultad" value={datos.facultad} onChange={onChange} className="campo-input" />
              {errores.facultad && <p className="campo-error">{errores.facultad}</p>}
            </div>
          </>
        )}

        {esEducativo && (
          <>
            <div>
              <label className="campo-label">Tipo de recorrido:</label>
              <div className="flex flex-wrap gap-6 mt-1">
                {[
                  { v: 'primaria', l: 'Primaria' },
                  { v: 'basicos', l: 'Básicos' },
                  { v: 'diversificado', l: 'Diversificado' },
                ].map((op) => (
                  <label key={op.v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tipoRecorrido" value={op.v} checked={datos.tipoRecorrido === op.v} onChange={onChange} className="checkbox-muni" />
                    <span className="text-sm font-medium">{op.l}</span>
                  </label>
                ))}
              </div>
              {errores.tipoRecorrido && <p className="campo-error">{errores.tipoRecorrido}</p>}
            </div>

            <div>
              <label className="campo-label">Nombre establecimiento educativo:</label>
              <input name="establecimiento" value={datos.establecimiento} onChange={onChange} className="campo-input" />
              {errores.establecimiento && <p className="campo-error">{errores.establecimiento}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="campo-label">Rango de edades de estudiantes:</label>
                <select name="rangoEdades" value={datos.rangoEdades} onChange={onChange} className="campo-input">
                  <option value="">Selecciona...</option>
                  <option value="6-9">6 a 9 años</option>
                  <option value="10-12">10 a 12 años</option>
                  <option value="13-15">13 a 15 años</option>
                  <option value="16-18">16 a 18 años</option>
                  <option value="mixto">Mixto</option>
                </select>
                {errores.rangoEdades && <p className="campo-error">{errores.rangoEdades}</p>}
              </div>
              <div>
                <label className="campo-label">Cantidad aprox. de estudiantes:</label>
                <input name="cantidadEstudiantes" type="number" min="1" value={datos.cantidadEstudiantes} onChange={onChange} className="campo-input" />
                {errores.cantidadEstudiantes && <p className="campo-error">{errores.cantidadEstudiantes}</p>}
              </div>
            </div>
          </>
        )}

        {datos.categoria && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="campo-label">Fecha propuesta del recorrido:</label>
                <input type="date" name="fechaRecorrido" value={datos.fechaRecorrido} onChange={onChange} className="campo-input" />
                {errores.fechaRecorrido && <p className="campo-error">{errores.fechaRecorrido}</p>}
              </div>
              <div>
                <label className="campo-label">Hora de llegada:</label>
                <input type="time" name="horaLlegada" value={datos.horaLlegada} onChange={onChange} className="campo-input" />
                {errores.horaLlegada && <p className="campo-error">{errores.horaLlegada}</p>}
              </div>
            </div>

            <div>
              <label className="campo-label">Tiempo estimado de recorrido (Ej: 2 horas):</label>
              <input name="tiempoEstimado" value={datos.tiempoEstimado} onChange={onChange} className="campo-input" placeholder="2 horas" />
              {errores.tiempoEstimado && <p className="campo-error">{errores.tiempoEstimado}</p>}
            </div>
          </>
        )}
      </section>

      {/* III. REQUISITOS */}
      {datos.categoria && (
        <section className="space-y-4">
          <div className="seccion-titulo">III. Requisitos y logística de la Municipalidad</div>

          {(esUniversitario || esTurista) && (
            <>
              <div>
                <p className="font-bold text-muni-azul">Adjuntar archivo con DPIs:</p>
                <p className="text-xs italic text-slate-500 mb-2">
                  *Nota: El archivo debe contener los DPIs escaneados o digitalizados de todos los participantes.
                </p>
                <label className="archivo-btn">
                  📎 Cargar archivo con DPIs
                  <input type="file" name="archivoDpis" onChange={onFile} accept=".pdf,.png,.jpg,.jpeg" className="hidden" />
                </label>
                {archivos.archivoDpis && <span className="ml-3 text-xs text-slate-600">✓ {archivos.archivoDpis.name}</span>}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-muni-azul">Verificación individual de DPI:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="dpiVerificado" checked={datos.dpiVerificado} onChange={onChange} className="checkbox-muni" />
                  <span className="text-sm">DPI individual verificado</span>
                </label>
              </div>

              {esUniversitario && (
                <div>
                  <p className="font-bold text-muni-azul">Adjuntar carta de solicitud de la facultad:</p>
                  <p className="text-xs italic text-slate-500 mb-2">
                    Requerido: Carta oficial de la facultad o casa de estudios, firmada y sellada.
                  </p>
                  <label className="archivo-btn">
                    📎 Cargar archivo PDF
                    <input type="file" name="cartaFacultad" onChange={onFile} accept=".pdf" className="hidden" />
                  </label>
                  {archivos.cartaFacultad && <span className="ml-3 text-xs text-slate-600">✓ {archivos.cartaFacultad.name}</span>}
                </div>
              )}
            </>
          )}

          {esEducativo && (
            <div>
              <p className="font-bold text-muni-azul">
                Adjuntar el SIRE (Sistema de Información de Registros Educativos)
              </p>
              <div className="flex gap-6 mt-2 items-center flex-wrap">
                {['si', 'no'].map((v) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sireAdjunto" value={v} checked={datos.sireAdjunto === v} onChange={onChange} className="checkbox-muni" />
                    <span className="text-sm font-medium uppercase">{v}</span>
                  </label>
                ))}
                <span className="italic text-xs text-slate-500">
                  Requerido: Adjuntar en formato PDF al enviar esta solicitud.
                </span>
              </div>

              {datos.sireAdjunto === 'si' && (
                <div className="mt-3">
                  <label className="archivo-btn">
                    📎 Cargar SIRE (PDF)
                    <input type="file" name="archivoSire" onChange={onFile} accept=".pdf" className="hidden" />
                  </label>
                  {archivos.archivoSire && <span className="ml-3 text-xs text-slate-600">✓ {archivos.archivoSire.name}</span>}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="campo-label">
              Comentarios adicionales o solicitudes especiales (mesa de diálogo, etc.):
            </label>
            <textarea name="comentarios" value={datos.comentarios} onChange={onChange} rows={4} className="campo-textarea" />
          </div>
        </section>
      )}

      {/* IV. RESPONSABLE */}
      {datos.categoria && (
        <section className="space-y-4">
          <div className="seccion-titulo">IV. Datos de la persona responsable del recorrido</div>

          <div>
            <label className="campo-label">Nombre completo:</label>
            <input name="responsableNombre" value={datos.responsableNombre} onChange={onChange} className="campo-input" />
            {errores.responsableNombre && <p className="campo-error">{errores.responsableNombre}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="campo-label">DPI:</label>
              <input name="responsableDpi" value={datos.responsableDpi} onChange={onChange} inputMode="numeric" maxLength={13} className="campo-input" />
              {errores.responsableDpi && <p className="campo-error">{errores.responsableDpi}</p>}
            </div>
            <div>
              <label className="campo-label">Teléfono de contacto (celular):</label>
              <input name="responsableTelefono" value={datos.responsableTelefono} onChange={onChange} inputMode="numeric" maxLength={8} className="campo-input" />
              {errores.responsableTelefono && <p className="campo-error">{errores.responsableTelefono}</p>}
            </div>
          </div>

          <div>
            <label className="campo-label">Correo electrónico de contacto (obligatorio):</label>
            <input type="email" name="responsableCorreo" value={datos.responsableCorreo} onChange={onChange} className="campo-input" />
            {errores.responsableCorreo && <p className="campo-error">{errores.responsableCorreo}</p>}
          </div>
        </section>
      )}

      {mensaje && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${
            mensaje.tipo === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="flex justify-center pt-4">
        <button type="submit" disabled={enviando} className="btn-primario">
          {enviando ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  );
}
