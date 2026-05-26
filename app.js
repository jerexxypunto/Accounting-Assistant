const personaContrata = {
  spid : "1y3IljU8xpN0pBgxbtXsOQzOnAp7ghWNJPVfnTsoMAoU",
  tabName : "PersonalContara Enero"
}

const personalPlanta = {
  spid : "1GyuENj-oYgVfM2fFAD8fZwwSkSGL0P9hp7ZCDQvLGS4",
  tabName : "PersonalPaza Enero" 
}

const libroDiario = {
  spreadsheetId : "1X1vsdCkX7IyNax56pJ_vMoFlMZSzG6GAr_96hGJuCb8",
  tabName : "MACA_cal" ,
  staticsFields: ["MU294",	"San Miguel",	"2025",	"12" ]
}

function main( option, creds, params = false ){


    const handler = new GSC_ContableHandler({
      planta: { spreadsheetId: creds.personalPlanta.spreadsheetId },
      contrata: { spreadsheetId: creds.personaContrata.spreadsheetId },
      libroDiario: { 
        spreadsheetId: creds.libroDiario.spreadsheetId, 
        staticsFields: [ 
          creds.municipioConf["staticsFields[municipio]"] ,
          creds.municipioConf["staticsFields[municipioNombre]"],
          creds.municipioConf["staticsFields[ejercicio]"],
          creds.municipioConf["staticsFields[periodo]"]
        ]
        } 
    });

    console.log("creds: ", creds );
    console.log("option: ", option );

    if( option === 'trasparenciRecopilate' ){
      
      const remuneracionPersonalCruzada = handler.crossRemuneracionPersonalContrataWithPersonalPlanta({ 
        "contrataTabName": creds.personaContrata.contrataTabName, 
        "plantaTabName": creds.personalPlanta.plantaTabName 
      });
      return remuneracionPersonalCruzada
    }

    if( option === 'formatear' ){
      const libroDiarioTabName = creds.libroDiario.libroDiarioTabName;
      console.log(libroDiarioTabName);
      const libroDiarioFormateado = handler.formatearLibroDiario(libroDiarioTabName);
      return libroDiarioFormateado
    }

    if( option === 'libroDiarioRecopilate'  ){
      const libroDiario = handler.sumarLibroDiarioGastos();
  
      return {     
        libroDiario: libroDiario
      };

      // { major: major, diff: diff }

    }

    if( option === 'comparar'  ){

      console.log("params: ", params );

      const { portalTrasparencia, libroDiario } = params;

      console.log("libroDiario: ", libroDiario );

      const { contrata, planta } = portalTrasparencia;
      let comparation = {};    

      console.log( "test", libroDiario.horas_extra.personal );

      // Compara Contrata
      handler.compararTablas( comparation, 
        { trasnparencia: contrata.remuneracion , 
          trasnparenciaHorasExtras: contrata.total_gastos,
          libroDiario:libroDiario.persona_contrata.total_debe ,
          libroDiarioHorasExtras:  libroDiario.horas_extra.personal.find( item => {               
                const codigoCuenta = item.codigoCuenta;
                // Si el codigo contiene 215-21-02 es una cuenta de contrata
                return codigoCuenta.includes( "215-21-02" )   } 
          ).haber
        }, 
      'contrata' );

      // Compara Planta
      handler.compararTablas( comparation, 
        { trasnparencia: planta.remuneracion , 
          trasnparenciaHorasExtras: planta.total_gastos,
          libroDiario: libroDiario.persona_planta.total_debe ,
          libroDiarioHorasExtras: libroDiario.horas_extra.personal.find( item => {               
                const codigoCuenta = item.codigoCuenta;
                // Si el codigo contiene 215-21-01 es una cuenta de planta
                return codigoCuenta.includes( "215-21-01" )   } 
          ).haber
        }, 
      'planta' );

      return { comparation: comparation }
    }

}

function spreadSheetList( q ){
  const driveHandler = new GSC_DriveHandler();
  const sheetOption = { maxFiles: 20 };
  if( q ){
    sheetOption.name = q;
  }
  const list = driveHandler.listSpreadSheet(sheetOption);

  return list;
}

/**
 * Carpetas en la raíz de Drive (para el selector por carpeta → hojas de cálculo).
 * @returns {{ name: string, id: string }[]}
 */
function listDriveRootFolders() {
  const driveHandler = new GSC_DriveHandler();
  return driveHandler.listRootFolders();
}

/**
 * Hojas de cálculo y subcarpetas directas dentro de una carpeta.
 * Las entradas con `isFolder: true` son subcarpetas (mismo nivel que las hojas en esa carpeta).
 * @param {string} folderId
 * @returns {{ id: string, name: string, tabs: { name: string }[], isFolder?: boolean }[]}
 */
function listSpreadSheetsInFolder( folderId ) {
  const driveHandler = new GSC_DriveHandler();
  return driveHandler.listFilesFrom({ id: folderId });
}

function auditoriaRun({
  portalTrasparencia: portalTrasparenciaOpt ,
  libroDiario: libroDiarioOpt ,
  comparation,
  email,
  staticsFields}
){


    console.log("portalTrasparenciaOpt: ", portalTrasparenciaOpt);
    console.log("libroDiarioOpt: ", libroDiarioOpt );
    const municipalidadTitle = staticsFields.join(" - "); // (año ... mes al final)
    console.log("staticsFields: ", staticsFields );

    const [ municipio, municipioNombre, ejercicio, periodo ] = staticsFields;

    const asunto = `Asunto ${municipioNombre}`;

    const portalTransparencia = {
      remuneracion: portalTrasparenciaOpt.suma.total_remuneracion ,
      extra: portalTrasparenciaOpt.suma.total_gastos ,
    };

    const libroDiario = {
      remuneracion: libroDiarioOpt.persona_planta.total_debe + libroDiarioOpt.persona_contrata.total_debe ,
      extra: libroDiarioOpt.horas_extra.total_haber
    };

    const diferencia = {
      remuneracion: libroDiario.remuneracion - portalTransparencia.remuneracion,
      extra: libroDiario.extra - portalTransparencia.extra ,
    };

    function calcPersentaje( trasparencia, libroDiario ){
      const parte = libroDiario - trasparencia;
      return ( (parte / libroDiario) * 100).toFixed(2) + "%"
    }

    function moneyParser(num) {

          // Divide el string con numeros en donde cada fragmento tenga 3 caracteres:
          // Elimina caracteres no numéricos (opcional, véase requerimientos reales)
          num = String(num).replace(/\D/g, '');
      
          // Separa el string en fragmentos de tres caracteres desde la derecha
          let parts = [];
          for(let i = num.length; i > 0; i -= 3) {
              let start = Math.max(i - 3, 0);
              parts.unshift(num.slice(start, i));
          }
          return "$" + parts.join(".");
      }

    const remnPersentage = calcPersentaje( portalTransparencia.remuneracion, libroDiario.remuneracion );
    const extraPersentage = calcPersentaje( portalTransparencia.extra, libroDiario.extra );

    const year = new Date().getFullYear();

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
    

    const mensajeDiferecia = `En el cuadro anterior se observa una diferencia de un ${remnPersentage} en las remuneraciones brutas del personal de planta y contrata publicado en transparencia activa en el mes de ${getMesLabel(periodo)} ${year} y el libro contable Diario de igual periodo.`;

    /*
    const bullets = [
      "Respecto a las horas extraordinarias del personal de planta y contrata mes de enero, los valores no han sido publicados en forma separada en el portal de transparencia.",
      "Lo anterior incumple con los principios de la Ley de Transparencia de mantener información pública en forma correcta y oportuna."
    ];
    */
    const bullets = [];

    libroDiario.remuneracion         = moneyParser(libroDiario.remuneracion);
    portalTransparencia.remuneracion = moneyParser(portalTransparencia.remuneracion);
    diferencia.remuneracion          = moneyParser(diferencia.remuneracion);

    libroDiario.extra         = moneyParser(libroDiario.extra);
    portalTransparencia.extra = moneyParser(portalTransparencia.extra);
    diferencia.extra          = moneyParser(diferencia.extra);

    enviarAuditoriaPorEmail(email, asunto, {
      // Opcional: si los pasas, se usan tal cual; si no, se derivan desde municipalidadTitle
      mesAuditoria: periodo,       // o "Diciembre"
      anioAuditoria: ejercicio,  // o 2025

      municipalidadTitle,
      portalTransparencia,
      libroDiario,
      diferencia,
      mensajeDiferecia,
      bullets,
    });
}

function test(){
  
  const handler = new GSC_ContableHandler({
    planta: { spreadsheetId: personalPlanta.spid },
    contrata: { spreadsheetId: personaContrata.spid },
    libroDiario: { spreadsheetId: libroDiario.spid, staticsFields: libroDiario.staticsFields }
  });

  const libroDiarioTabName = libroDiario.tabName;

  handler.formatearLibroDiario(libroDiarioTabName);


}

function buscarEnHoja(id, query) {
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheets()[0]; // O la que necesites
  var data = sheet.getDataRange().getValues();
  var resultados = [];
  var queryLower = query.toLowerCase();

  for (var i = 0; i < data.length; i++) {
    var filaTexto = data[i].join(" ").toLowerCase();
    if (filaTexto.indexOf(queryLower) !== -1) {
      resultados.push({
        fila: i + 1,
        contenido: data[i].slice(0, 5).join(" | ") + "..." // Resumen de la fila
      });
    }
  }
  return resultados;
}

function ejemploEnviarAuditoriaPorEmail() {

  const municipalidadTitle = "2025 - San Miguel - MU294 - 12"; // (año ... mes al final)
  const email = "jerexxypunto@gmail.com";
  const asunto = "Auditoría San Miguel";

  const portalTransparencia = {
    remuneracion: 100000000,
    extra: 4500000,
  };

  const libroDiario = {
    remuneracion: 98250000,
    extra: 3900000,
  };

  const diferencia = {
    remuneracion: 1750000,
    extra: 600000,
  };

  function calcPersentaje( trasparencia, libroDiario ){
    const parte = libroDiario - trasparencia;
    return ( (parte / libroDiario) * 100).toFixed(2) + "%"
  }

  function moneyParser(num) {

        // Divide el string con numeros en donde cada fragmento tenga 3 caracteres:
        // Elimina caracteres no numéricos (opcional, véase requerimientos reales)
        num = String(num).replace(/\D/g, '');
    
        // Separa el string en fragmentos de tres caracteres desde la derecha
        let parts = [];
        for(let i = num.length; i > 0; i -= 3) {
            let start = Math.max(i - 3, 0);
            parts.unshift(num.slice(start, i));
        }
        return "$" + parts.join(".");
    }

  const remnPersentage = calcPersentaje( portalTransparencia.remuneracion, libroDiario.remuneracion );
  const extraPersentage = calcPersentaje( portalTransparencia.extra, libroDiario.extra );

  const mensajeDiferecia = `En el cuadro anterior se observa una diferencia de un ${remnPersentage} en las remuneraciones brutas del personal de planta y contrata publicado en transparencia activa en el mes de enero 2026 y el libro contable Diario de igual periodo.`;

  const bullets = [
    "Respecto a las horas extraordinarias del personal de planta y contrata mes de enero, los valores no han sido publicados en forma separada en el portal de transparencia.",
    "Lo anterior incumple con los principios de la Ley de Transparencia de mantener información pública en forma correcta y oportuna."
  ];

  libroDiario.remuneracion         = moneyParser(libroDiario.remuneracion);
  portalTransparencia.remuneracion = moneyParser(portalTransparencia.remuneracion);
  diferencia.remuneracion          = moneyParser(diferencia.remuneracion);

  libroDiario.extra         = moneyParser(libroDiario.extra);
  portalTransparencia.extra = moneyParser(portalTransparencia.extra);
  diferencia.extra          = moneyParser(diferencia.extra);

  enviarAuditoriaPorEmail(email, asunto, {
    // Opcional: si los pasas, se usan tal cual; si no, se derivan desde municipalidadTitle
    mesAuditoria: 12,       // o "Diciembre"
    anioAuditoria: "2025",  // o 2025

    municipalidadTitle,
    portalTransparencia,
    libroDiario,
    diferencia,
    mensajeDiferecia,
    bullets,
  });
}

function buscarEnLibroDiario( allMemos, termino, columna ){

  console.log("Buscando en Libro Diario → termino: ", termino, " columna: ", columna );
  console.log( "allMemos: ", allMemos );

  const libroDiario = allMemos['contabilidad-config-libro-diario'];

  // Abro Hoja
  const hoja = new GSC_SheetHandler( { spreadsheetId: libroDiario.spreadsheetId } );
  // Obtengo valores
  const registro = hoja.obtenerFilasComoObjetos();
  const match = [];

  registro.forEach( row => {

    if( ! row.hasOwnProperty( 'debe' ) ||  row.debe == "" ){
        row.debe = 0;
    }

    if( ! row.hasOwnProperty( 'haber' ) ||  row.haber == "" ){
        row.haber = 0;
    }

    if( columna == 'codigoCuenta' && row.codigoCuenta.includes( termino )  ){
        match.push( row );
    }

    if( columna == 'nombreCuenta' && row.nombreCuenta.includes( termino ) ){
        match.push( row )
    }

    if( columna == 'glosaAsiento' && row.glosaAsiento.includes( termino ) ){
        match.push( row )
    }

    if( columna == 'rut' ){

      const rutRaw = row.rutContraparte;
      let rutClean = rutRaw.replace("-", "");
      rutClean = rutClean.replaceAll(".", "");

      let terminoSearch = termino.replace('-', '');
      terminoSearch = terminoSearch.replaceAll(".", "");

      if( rutClean.includes( terminoSearch ) ){
        match.push( row );
      }
      
    }

  } );
  
  return JSON.stringify(match);
}

function buscarEnLibroDiarioTest(){
  const termino = '20255983-2';
  const search = buscarEnLibroDiario( { 'contabilidad-config-libro-diario': libroDiario } ,termino, 'rut');
  console.log( 'search', search );
}

