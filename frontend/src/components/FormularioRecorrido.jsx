import { useState, useEffect } from 'react';
import Recaptcha, { resetRecaptcha } from './Recaptcha.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const UNIVERSIDADES_GT = [
  'Universidad de San Carlos de Guatemala',
  'Universidad Mariano Gálvez',
  'Universidad Rafael Landívar',
  'Universidad del Valle de Guatemala',
  'Universidad Galileo',
  'Universidad Panamericana',
  'Universidad Da Vinci',
  'Universidad Mesoamericana',
  'Universidad Rural de Guatemala',
  'Universidad Internaciones (UNI)',
  'Universidad InterNaciones',
  'Universidad Regional',
];

const TIPOS_TRANSPORTE = [
  { v: 'vehiculo_propio', l: 'Vehículo propio' },
  { v: 'transporte_publico', l: 'Transporte público' },
  { v: 'motocicleta', l: 'Motocicleta' },
  { v: 'bicicleta', l: 'Bicicleta' },
  { v: 'a_pie', l: 'A pie' },
  { v: 'transporte_contratado', l: 'Transporte contratado (bus/microbús)' },
];

const estadoInicial = {
  solicitanteNombre: '',
  solicitanteDpi: '',
  solicitanteTelefono: '',

  categoria: '',

  modalidad: '',
  universidad: '',
  universidadOtra: '',
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

  transporteParqueo: '',
  tipoTransporte: '',         // NUEVO

  comentarios: '',

  solicitanteEsResponsable: false,

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
  const [correoSolicitante, setCorreoSolicitante] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);

  // Sincronizar responsable cuando es el mismo solicitante
  useEffect(() => {
    if (datos.solicitanteEsResponsable) {
      setDatos((prev) => ({
        ...prev,
        responsableNombre: prev.solicitanteNombre,
        responsableDpi: prev.solicitanteDpi,
        responsableTelefono: prev.solicitanteTelefono,
        responsableCorreo: correoSolicitante,
      }));
    }
  }, [
    datos.solicitanteEsResponsable,
    datos.solicitanteNombre,
    datos.solicitanteDpi,
    datos.solicitanteTelefono,
    correoSolicitante,
  ]);

  // Si cambia el campo transporteParqueo a algo que no requiere transporte,
  // limpiar el tipoTransporte para evitar datos huérfanos
  useEffect(() => {
    const necesita =
      datos.transporteParqueo === 'transporte' || datos.transporteParqueo === 'ambos';
    if (!necesita && datos.tipoTransporte) {
      setDatos((prev) => ({ ...prev, tipoTransporte: '' }));
    }
  }, [datos.transporteParqueo]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDatos((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  };

  const onChangeCorreoSolicitante = (e) => {
    setCorreoSolicitante(e.target.value);
    setErrores((prev) => ({ ...prev, correoSolicitante: undefined }));
  };

  const onFile = (e) => {
    const { name, files } = e.target;
    setArchivos((prev) => ({ ...prev, [name]: files[0] || null }));
  };

  const validar = () => {
    const e = {};
    const soloDigitos = (v) => (v || '').replace(/\D/g, '');
    const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    if (!datos.solicitanteNombre.trim()) e.solicitanteNombre = 'Requerido';
    if (soloDigitos(datos.solicitanteDpi).length !== 13)
      e.solicitanteDpi = 'DPI debe tener 13 dígitos';
    if (soloDigitos(datos.solicitanteTelefono).length !== 8)
      e.solicitanteTelefono = 'Teléfono debe tener 8 dígitos';

    if (!datos.categoria) e.categoria = 'Selecciona una categoría';

    if (datos.categoria === 'universitario') {
      if (!datos.modalidad) e.modalidad = 'Selecciona una modalidad';
      if (!datos.universidad) e.universidad = 'Selecciona una universidad';
      if (datos.universidad === 'otra' && !datos.universidadOtra.trim())
        e.universidadOtra = 'Especifica la universidad';
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

    if (!datos.transporteParqueo) e.transporteParqueo = 'Selecciona una opción';

    // Tipo de transporte: requerido solo si necesita transporte o ambos
    const necesitaTransporte =
      datos.transporteParqueo === 'transporte' || datos.transporteParqueo === 'ambos';
    if (necesitaTransporte && !datos.tipoTransporte) {
      e.tipoTransporte = 'Selecciona el tipo de transporte';
    }

    if (datos.solicitanteEsResponsable) {
      if (!emailValido(correoSolicitante))
        e.correoSolicitante = 'Correo inválido';
    } else {
      if (!datos.responsableNombre.trim()) e.responsableNombre = 'Requerido';
      if (soloDigitos(datos.responsableDpi).length !== 13)
        e.responsableDpi = 'DPI debe tener 13 dígitos';
      if (soloDigitos(datos.responsableTelefono).length !== 8)
        e.responsableTelefono = 'Teléfono debe tener 8 dígitos';
      if (!emailValido(datos.responsableCorreo))
        e.responsableCorreo = 'Correo inválido';
    }

    // reCAPTCHA
    if (!recaptchaToken) e.recaptcha = 'Por favor confirma que no eres un robot';

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
      const universidadFinal =
        datos.universidad === 'otra' ? datos.universidadOtra.trim() : datos.universidad;

      const payload = {
        ...datos,
        universidad: universidadFinal,
        recaptchaToken,
        ...(datos.solicitanteEsResponsable && {
          responsableNombre: datos.solicitanteNombre,
          responsableDpi: datos.solicitanteDpi,
          responsableTelefono: datos.solicitanteTelefono,
          responsableCorreo: correoSolicitante,
        }),
      };
      delete payload.universidadOtra;

      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
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
        // Resetear reCAPTCHA si Google rechazó el token
        resetRecaptcha();
        setRecaptchaToken(null);
      } else {
        setMensaje({ tipo: 'ok', texto: json.mensaje });
        setDatos(estadoInicial);
        setCorreoSolicitante('');
        setArchivos({ archivoDpis: null, cartaFacultad: null, archivoSire: null });
        resetRecaptcha();
        setRecaptchaToken(null);
      }
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: 'No se pudo conectar con el servidor. Verifica tu conexión.',
      });
    } finally {
      setEnviando(false);
    }
  };

  const esUniversitario = datos.categoria === 'universitario';
  const esTurista = datos.categoria === 'turista';
  const esEducativo = datos.categoria === 'educativo';
  const necesitaTransporte =
    datos.transporteParqueo === 'transporte' || datos.transporteParqueo === 'ambos';

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
          <input
            name="solicitanteNombre"
            value={datos.solicitanteNombre}
            onChange={onChange}
            className="campo-input"
          />
          {errores.solicitanteNombre && <p className="campo-error">{errores.solicitanteNombre}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="campo-label">DPI:</label>
            <input
              name="solicitanteDpi"
              value={datos.solicitanteDpi}
              onChange={onChange}
              inputMode="numeric"
              maxLength={13}
              className="campo-input"
            />
            {errores.solicitanteDpi && <p className="campo-error">{errores.solicitanteDpi}</p>}
          </div>
          <div>
            <label className="campo-label">Teléfono de contacto:</label>
            <input
              name="solicitanteTelefono"
              value={datos.solicitanteTelefono}
              onChange={onChange}
              inputMode="numeric"
              maxLength={8}
              className="campo-input"
            />
            {errores.solicitanteTelefono && (
              <p className="campo-error">{errores.solicitanteTelefono}</p>
            )}
          </div>
        </div>

        <div className="bg-muni-celeste/30 border border-muni-celeste rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="solicitanteEsResponsable"
              checked={datos.solicitanteEsResponsable}
              onChange={onChange}
              className="checkbox-muni mt-0.5"
            />
            <div>
              <span className="font-semibold text-muni-azul">
                ¿El solicitante es también el responsable del recorrido?
              </span>
              <p className="text-xs text-slate-600 mt-1">
                Marca esta casilla si la misma persona que solicita es quien estará a cargo del grupo durante el recorrido.
              </p>
            </div>
          </label>

          {datos.solicitanteEsResponsable && (
            <div className="mt-4">
              <label className="campo-label">Correo electrónico de contacto (obligatorio):</label>
              <input
                type="email"
                value={correoSolicitante}
                onChange={onChangeCorreoSolicitante}
                className="campo-input"
                placeholder="tu-correo@ejemplo.com"
              />
              {errores.correoSolicitante && (
                <p className="campo-error">{errores.correoSolicitante}</p>
              )}
            </div>
          )}
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
                <input
                  type="radio"
                  name="categoria"
                  value={op.v}
                  checked={datos.categoria === op.v}
                  onChange={onChange}
                  className="checkbox-muni"
                />
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
                    <input
                      type="radio"
                      name="modalidad"
                      value={m}
                      checked={datos.modalidad === m}
                      onChange={onChange}
                      className="checkbox-muni"
                    />
                    <span className="text-sm font-medium">{m}</span>
                  </label>
                ))}
              </div>
              {errores.modalidad && <p className="campo-error">{errores.modalidad}</p>}
            </div>

            <div>
              <label className="campo-label">Nombre de la casa de estudios (Universidad):</label>
              <select
                name="universidad"
                value={datos.universidad}
                onChange={onChange}
                className="campo-input"
              >
                <option value="">Selecciona una universidad...</option>
                {UNIVERSIDADES_GT.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
                <option value="otra">Otra (especificar)</option>
              </select>
              {errores.universidad && <p className="campo-error">{errores.universidad}</p>}

              {datos.universidad === 'otra' && (
                <div className="mt-2">
                  <input
                    name="universidadOtra"
                    value={datos.universidadOtra}
                    onChange={onChange}
                    className="campo-input"
                    placeholder="Escribe el nombre completo de la universidad"
                  />
                  {errores.universidadOtra && (
                    <p className="campo-error">{errores.universidadOtra}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="campo-label">Facultad / escuela a la que pertenece:</label>
              <input
                name="facultad"
                value={datos.facultad}
                onChange={onChange}
                className="campo-input"
              />
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
                    <input
                      type="radio"
                      name="tipoRecorrido"
                      value={op.v}
                      checked={datos.tipoRecorrido === op.v}
                      onChange={onChange}
                      className="checkbox-muni"
                    />
                    <span className="text-sm font-medium">{op.l}</span>
                  </label>
                ))}
              </div>
              {errores.tipoRecorrido && <p className="campo-error">{errores.tipoRecorrido}</p>}
            </div>

            <div>
              <label className="campo-label">Nombre establecimiento educativo:</label>
              <input
                name="establecimiento"
                value={datos.establecimiento}
                onChange={onChange}
                className="campo-input"
              />
              {errores.establecimiento && (
                <p className="campo-error">{errores.establecimiento}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="campo-label">Rango de edades de estudiantes:</label>
                <select
                  name="rangoEdades"
                  value={datos.rangoEdades}
                  onChange={onChange}
                  className="campo-input"
                >
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
                <input
                  name="cantidadEstudiantes"
                  type="number"
                  min="1"
                  value={datos.cantidadEstudiantes}
                  onChange={onChange}
                  className="campo-input"
                />
                {errores.cantidadEstudiantes && (
                  <p className="campo-error">{errores.cantidadEstudiantes}</p>
                )}
              </div>
            </div>
          </>
        )}

        {datos.categoria && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="campo-label">Fecha propuesta del recorrido:</label>
                <input
                  type="date"
                  name="fechaRecorrido"
                  value={datos.fechaRecorrido}
                  onChange={onChange}
                  className="campo-input"
                />
                {errores.fechaRecorrido && (
                  <p className="campo-error">{errores.fechaRecorrido}</p>
                )}
              </div>
              <div>
                <label className="campo-label">Hora de llegada:</label>
                <input
                  type="time"
                  name="horaLlegada"
                  value={datos.horaLlegada}
                  onChange={onChange}
                  className="campo-input"
                />
                {errores.horaLlegada && <p className="campo-error">{errores.horaLlegada}</p>}
              </div>
            </div>

            <div>
              <label className="campo-label">Tiempo estimado de recorrido (Ej: 2 horas):</label>
              <input
                name="tiempoEstimado"
                value={datos.tiempoEstimado}
                onChange={onChange}
                className="campo-input"
                placeholder="2 horas"
              />
              {errores.tiempoEstimado && <p className="campo-error">{errores.tiempoEstimado}</p>}
            </div>

            {/* Transporte / Parqueo */}
            <div>
              <label className="campo-label">¿Necesitan transporte o parqueo?</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                {[
                  { v: 'transporte', l: 'Transporte' },
                  { v: 'parqueo', l: 'Parqueo' },
                  { v: 'ambos', l: 'Ambos' },
                  { v: 'ninguno', l: 'Ninguno' },
                ].map((op) => (
                  <label
                    key={op.v}
                    className={`flex items-center gap-2 cursor-pointer p-3 border-2 rounded-xl transition ${
                      datos.transporteParqueo === op.v
                        ? 'border-muni-azul bg-muni-celeste/40'
                        : 'border-slate-200 hover:border-muni-azul/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transporteParqueo"
                      value={op.v}
                      checked={datos.transporteParqueo === op.v}
                      onChange={onChange}
                      className="checkbox-muni"
                    />
                    <span className="text-sm font-medium">{op.l}</span>
                  </label>
                ))}
              </div>
              {errores.transporteParqueo && (
                <p className="campo-error">{errores.transporteParqueo}</p>
              )}
            </div>

            {/* NUEVO: Tipo de transporte (condicional) */}
            {necesitaTransporte && (
              <div>
                <label className="campo-label">Tipo de transporte:</label>
                <select
                  name="tipoTransporte"
                  value={datos.tipoTransporte}
                  onChange={onChange}
                  className="campo-input"
                >
                  <option value="">Selecciona el tipo de transporte...</option>
                  {TIPOS_TRANSPORTE.map((op) => (
                    <option key={op.v} value={op.v}>{op.l}</option>
                  ))}
                </select>
                {errores.tipoTransporte && (
                  <p className="campo-error">{errores.tipoTransporte}</p>
                )}
              </div>
            )}
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
                  <input
                    type="file"
                    name="archivoDpis"
                    onChange={onFile}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                </label>
                {archivos.archivoDpis && (
                  <span className="ml-3 text-xs text-slate-600">
                    ✓ {archivos.archivoDpis.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-muni-azul">Verificación individual de DPI:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="dpiVerificado"
                    checked={datos.dpiVerificado}
                    onChange={onChange}
                    className="checkbox-muni"
                  />
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
                    <input
                      type="file"
                      name="cartaFacultad"
                      onChange={onFile}
                      accept=".pdf"
                      className="hidden"
                    />
                  </label>
                  {archivos.cartaFacultad && (
                    <span className="ml-3 text-xs text-slate-600">
                      ✓ {archivos.cartaFacultad.name}
                    </span>
                  )}
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
                    <input
                      type="radio"
                      name="sireAdjunto"
                      value={v}
                      checked={datos.sireAdjunto === v}
                      onChange={onChange}
                      className="checkbox-muni"
                    />
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
                    <input
                      type="file"
                      name="archivoSire"
                      onChange={onFile}
                      accept=".pdf"
                      className="hidden"
                    />
                  </label>
                  {archivos.archivoSire && (
                    <span className="ml-3 text-xs text-slate-600">
                      ✓ {archivos.archivoSire.name}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="campo-label">
              Comentarios adicionales o solicitudes especiales (mesa de diálogo, etc.):
            </label>
            <textarea
              name="comentarios"
              value={datos.comentarios}
              onChange={onChange}
              rows={4}
              className="campo-textarea"
            />
          </div>
        </section>
      )}

      {/* IV. RESPONSABLE */}
      {datos.categoria && !datos.solicitanteEsResponsable && (
        <section className="space-y-4">
          <div className="seccion-titulo">IV. Datos de la persona responsable del recorrido</div>

          <div>
            <label className="campo-label">Nombre completo:</label>
            <input
              name="responsableNombre"
              value={datos.responsableNombre}
              onChange={onChange}
              className="campo-input"
            />
            {errores.responsableNombre && (
              <p className="campo-error">{errores.responsableNombre}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="campo-label">DPI:</label>
              <input
                name="responsableDpi"
                value={datos.responsableDpi}
                onChange={onChange}
                inputMode="numeric"
                maxLength={13}
                className="campo-input"
              />
              {errores.responsableDpi && (
                <p className="campo-error">{errores.responsableDpi}</p>
              )}
            </div>
            <div>
              <label className="campo-label">Teléfono de contacto (celular):</label>
              <input
                name="responsableTelefono"
                value={datos.responsableTelefono}
                onChange={onChange}
                inputMode="numeric"
                maxLength={8}
                className="campo-input"
              />
              {errores.responsableTelefono && (
                <p className="campo-error">{errores.responsableTelefono}</p>
              )}
            </div>
          </div>

          <div>
            <label className="campo-label">Correo electrónico de contacto (obligatorio):</label>
            <input
              type="email"
              name="responsableCorreo"
              value={datos.responsableCorreo}
              onChange={onChange}
              className="campo-input"
            />
            {errores.responsableCorreo && (
              <p className="campo-error">{errores.responsableCorreo}</p>
            )}
          </div>
        </section>
      )}

      {/* reCAPTCHA + Submit */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <div>
          <Recaptcha onChange={setRecaptchaToken} />
          {errores.recaptcha && <p className="campo-error text-center mt-1">{errores.recaptcha}</p>}
        </div>

        {mensaje && (
          <div
            className={`w-full rounded-xl p-4 text-sm font-medium ${
              mensaje.tipo === 'ok'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        <button type="submit" disabled={enviando} className="btn-primario">
          {enviando ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  );
}
