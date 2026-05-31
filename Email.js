function enviarAuditoriaPorEmail( 
  email, 
  asunto, 
  { 
    mesAuditoria,
    anioAuditoria,
    municipalidadTitle, 
    portalTransparencia,
    libroDiario,
    diferencia,
    mensajeDiferecia,
    bullets
  }) {

  const normalizeFuente = (value) => {
    // El template espera SIEMPRE un objeto con { remuneracion, extra }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return {
        remuneracion: value.remuneracion ?? value.remuneraciones ?? value.total ?? value.value ?? '',
        extra: value.extra ?? value.horasExtras ?? value.horas_extra ?? value.totalHorasExtras ?? '',
      };
    }
    // Si llega un string/número por error, lo interpretamos como remuneración
    // (mejor que duplicarlo en "extra", que sería incorrecto).
    return { remuneracion: value ?? '', extra: '' };
  };

  const getMesLabel = (m) => {
    if (m == null || m === '') return '';
    const n = typeof m === 'number' ? m : parseInt(String(m), 10);
    if (!Number.isFinite(n)) return String(m);
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return meses[n - 1] || String(m);
  };

  // Fallback: intenta derivar mes/año desde "staticsFields.join(' - ')"
  // Ej: "2025 - San Miguel - MU294 - 12" => anio=2025, mes=12
  if ((mesAuditoria == null || mesAuditoria === '') || (anioAuditoria == null || anioAuditoria === '')) {
    const parts = String(municipalidadTitle ?? '').split(' - ').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 1 && (anioAuditoria == null || anioAuditoria === '')) anioAuditoria = parts[0];
    if (parts.length >= 4 && (mesAuditoria == null || mesAuditoria === '')) mesAuditoria = parts[parts.length - 1];
  }

  // 1. Creamos la plantilla desde el archivo HTML [3]
  var template = HtmlService.createTemplateFromFile('EmailTemplate');
  
  // 2. Pasamos variables dinámicas a la plantilla [3]
  template.mesAuditoria = getMesLabel(mesAuditoria);
  template.anioAuditoria = anioAuditoria ?? '';
  template.municipalidadTitle = municipalidadTitle ?? '';
  template.dateGenerated = new Date().toLocaleString();
  template.portalTransparencia = normalizeFuente(portalTransparencia);
  template.libroDiario = normalizeFuente(libroDiario);
  template.diferencia = normalizeFuente(diferencia);
  template.mensajeDiferecia = mensajeDiferecia;
  template.bullets = Array.isArray(bullets) ? bullets : [];

  // 3. Evaluamos la plantilla para obtener el HTML final como string [3]
  var htmlFinal = template.evaluate().getContent();

  GmailApp.sendEmail( email , asunto , "", {
    htmlBody: htmlFinal
  });
}


/**
 * Envía un correo electrónico con los resultados de la búsqueda en el Libro Diario.
 * 
 * @param {string} email - Destinatario del correo.
 * @param {string} asunto - Asunto del correo electrónico.
 * @param {Object} options - Datos dinámicos para la plantilla.
 */
function enviarLibroDiarioBusquedaEmail(email, asunto, options) {
  // 1. Creamos la plantilla desde el archivo HTML
  var template = HtmlService.createTemplateFromFile('LibroDiarioSearch');

  console.log( 'options', options )

  // Desestructuramos todas las opciones recibidas
  const { 
    keyword, searchTerm, mes, municipalidadTitle, periodo,
    id_document, nombre_document, link_document, nombre_tab,
    total_haber, total_debe, coincidencias, rut
  } = options;

  const getMesLabel = (m) => {
    if (m == null || m === '') return '';
    const n = typeof m === 'number' ? m : parseInt(String(m), 10);
    if (!Number.isFinite(n)) return String(m);
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return meses[n - 1] || String(m);
  };
  
  // 2. Pasamos variables dinámicas a la plantilla
  template.keyword = keyword;
  template.searchTerm = searchTerm;
  template.mes = getMesLabel(mes);
  template.municipalidadTitle = municipalidadTitle;
  template.periodo = periodo;
  template.id_document = id_document;
  template.nombre_document = nombre_document;
  template.link_document = link_document;
  template.nombre_tab = nombre_tab;
  template.coincidencias = coincidencias; // Array de objetos con los asientos encontrados
  template.rut = rut;

  // Formateamos los totales como moneda para que el HTML se vea profesional (ej: $1.250.000)
  template.total_debe = typeof total_debe === 'number' 
    ? "$" + total_debe.toLocaleString('es-CL') 
    : total_debe;
    
  template.total_haber = typeof total_haber === 'number' 
    ? "$" + total_haber.toLocaleString('es-CL') 
    : total_haber;

  // 3. Evaluamos la plantilla para obtener el HTML final como string
  var htmlFinal = template.evaluate().getContent();

  // 4. Enviamos el correo usando GmailApp
  GmailApp.sendEmail(email, asunto, "Tu cliente de correo no soporta HTML.", {
    htmlBody: htmlFinal
  });
}

function testLibroDiario() {

  const asientosEncontrados = [
    {
      "municipio": 2026,
      "municipioNombre": "La Granja",
      "ejercicio": "MU294",
      "periodo": 1,
      "numeroAsiento": 1,
      "fechaAsiento": "2026-01-02T08:00:00.000Z",
      "glosaAsiento": "Ingresos día 02/01/2026 A Contrara",
      "codigoCuenta": "115-03-01-003-002-002",
      "nombreCuenta": "Permisos provisorios de Rentas",
      "debe": 484769,
      "haber": 0,
      "rutContraparte": ""
    },
    {
      "municipio": 2026,
      "municipioNombre": "La Granja",
      "ejercicio": "MU294",
      "periodo": 1,
      "numeroAsiento": 2,
      "fechaAsiento": "2026-01-02T08:00:00.000Z",
      "glosaAsiento": "Corrección flujo A Contrara",
      "codigoCuenta": "115-03-01-003-002-002",
      "nombreCuenta": "Permisos provisorios de Rentas",
      "debe": 0,
      "haber": 484769,
      "rutContraparte": ""
    },
    {
      "municipio": 2026,
      "municipioNombre": "La Granja",
      "ejercicio": "MU294",
      "periodo": 1,
      "numeroAsiento": 1,
      "fechaAsiento": "2026-01-05T08:00:00.000Z",
      "glosaAsiento": "Ingresos día 05/01/2026 A Contrara",
      "codigoCuenta": "115-03-01-003-002-002",
      "nombreCuenta": "Permisos provisorios de Rentas",
      "debe": 135101,
      "haber": 0,
      "rutContraparte": ""
    }
  ];

  // 2. Calculamos los totales usando el reducer optimizado
  const totales = asientosEncontrados.reduce((acumulador, item) => {
    acumulador.debe += item.debe || 0;
    acumulador.haber += item.haber || 0;
    return acumulador;
  }, { debe: 0, haber: 0 });

  const mailOptions = {
    keyword: "A Contrara",
    mes: "Enero",
    municipalidadTitle: "La Granja Prueba",
    periodo: "2026",
    id_document: "1DanABj66cZPb3oN6XPnBqpo5zgrQXMP33ls6HLnzXzQ",
    nombre_document: "Libro Diario Enero - Control Interno",
    link_document: "https://docs.google.com/spreadsheets/d/1DanABj66cZPb3oN6XPnBqpo5zgrQXMP33ls6HLnzXzQ/edit",
    nombre_tab: "Custom Format",
    total_debe: totales.debe,     // Pasamos el número crudo (la función lo formatea a $)
    total_haber: totales.haber,   // Pasamos el número crudo
    coincidencias: asientosEncontrados // Pasamos el array completo para que el HTML genere el bucle
  };

  enviarLibroDiarioBusquedaEmail( 'jerexxypunto@gmail.com', 'Prueba de correo', mailOptions );
}

