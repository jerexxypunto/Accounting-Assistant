class GSC_SheetHandler {
  
  /**
   * Crea una instancia de `GSC_SheetHandler`.
   * @param {Object} [options={}] Opciones de configuración.
   * @param {string} [options.defaultRangeA1="A1:J10"] Rango A1 por defecto a leer en las hojas.
   * @param {string} [options.spreadsheetId] ID del spreadsheet de Google asociado.
   */
  constructor(options = {}) {
    this.defaultRangeA1 = options.defaultRangeA1 || "A1:J10";
    this.spreadsheetId = options.spreadsheetId || false;

  }

  _validateSpreadsheetId(callerName) {
    if (!this.spreadsheetId || typeof this.spreadsheetId !== "string") {
      console.error(`[GSC_SheetHandler.${callerName}] Falta o es inválido \`spreadsheetId\`.`, {
        spreadsheetId: this.spreadsheetId,
      });
      return false;
    }
    return true;
  }

  _openSpreadsheet(callerName) {
    if (!this._validateSpreadsheetId(callerName)) return null;
    try {
      return SpreadsheetApp.openById(this.spreadsheetId);
    } catch (err) {
      console.error(`[GSC_SheetHandler.${callerName}] Error abriendo spreadsheet por ID.`, {
        spreadsheetId: this.spreadsheetId,
        err,
      });
      return null;
    }
  }

  _getSheetByName(spreadSheet, tabName, callerName) {
    if (!tabName || typeof tabName !== "string") {
      console.error(`[GSC_SheetHandler.${callerName}] Falta o es inválido \`tabName\`.`, { tabName });
      return null;
    }
    const sheet = spreadSheet.getSheetByName(tabName);
    if (!sheet) {
      console.error(`[GSC_SheetHandler.${callerName}] No existe la hoja.`, {
        tabName,
        spreadsheetId: this.spreadsheetId,
      });
      return null;
    }
    return sheet;
  }

  /**
   * Obtiene el número de la última fila con datos en una hoja.
   * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet.
   * @returns {number} Número de la última fila con datos.
   */
  getLastRow( tabName ){

    console.log(`Obteniendo la última fila de ${tabName}`);
    console.log(this.spreadsheetId);

    const spreadSheet = this._openSpreadsheet("getLastRow");
    if (!spreadSheet) return 0;
    const sheet = this._getSheetByName(spreadSheet, tabName, "getLastRow");
    if (!sheet) return 0;
    Logger.log(sheet);
    const lastRow = sheet.getLastRow?.() ?? 0;
    
    Logger.log( `En el tab: "${tabName}", doc_id: "${this.spreadsheetId}", la última fila es: ${lastRow}` );
    return lastRow;

  }

  /**
   * Obtiene los valores de un rango de una hoja como matriz bidimensional.
   * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet.
   * @param {string} [rangeA1=this.defaultRangeA1] Rango A1 a leer dentro de la hoja.
   * @returns {Array<Array<*>>} Matriz con los valores del rango solicitado.
   * @throws {Error} Si la hoja no existe.
   */
  getValueFromSheet( tabName, rangeA1 = this.defaultRangeA1) {
    const spreadSheet = this._openSpreadsheet("getValueFromSheet");
    if (!spreadSheet) return [];
    const sheet = this._getSheetByName(spreadSheet, tabName, "getValueFromSheet");
    if (!sheet) return [];
    if (!rangeA1 || typeof rangeA1 !== "string") {
      console.error("[GSC_SheetHandler.getValueFromSheet] Falta o es inválido `rangeA1`.", { rangeA1 });
      return [];
    }
    try {
      console.log('Obteniendo Rango: ', rangeA1 );
      return sheet.getRange(rangeA1).getValues();
    } catch (err) {
      console.error("[GSC_SheetHandler.getValueFromSheet] Error leyendo rango.", {
        tabName,
        rangeA1,
        spreadsheetId: this.spreadsheetId,
        err,
      });
      return [];
    }
  }

  /**
   * Obtiene los valores de un rango de una hoja y los devuelve como JSON.
   * @param {string} sheetName Nombre de la pestaña/hoja dentro del spreadsheet.
   * @param {string} [rangeA1=this.defaultRangeA1] Rango A1 a leer dentro de la hoja.
   * @returns {string} Cadena JSON que representa la matriz de valores.
   */
  getValueFromSheetJSON( sheetName, rangeA1 = this.defaultRangeA1) {
    const values = this.getValueFromSheet( sheetName, rangeA1);
    return JSON.stringify(values);
  }

  /**
   * Obtiene todos los registros de una columna desde la fila 2 hasta la última fila con datos.
   * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet.
   * @param {string} column Letra de la columna a leer (por ejemplo "A", "J", "M").
   * @returns {Array<Array<*>>} Lista de registros de la columna en formato de matriz de filas.
   */
  getRegisters(tabName, column){

     if (!tabName || typeof tabName !== "string") {
       console.error("[GSC_SheetHandler.getRegisters] Falta o es inválido `tabName`.", { tabName });
       return [];
     }
     if (!column || typeof column !== "string") {
       console.error("[GSC_SheetHandler.getRegisters] Falta o es inválido `column`.", { column });
       return [];
     }
     // Obtener la ultima fila con un registro
     const lastRow = this.getLastRow(tabName);
     if (!lastRow || lastRow < 2) return [];

     // Armamos RANGO en base a la ultima fila registrada
     const newRage = `${column}2:${column}${lastRow}`;
     Logger.log(`Rango generado: ${newRage}`);

     // Otenemos un array de todos los registros
     const listRegsters = this.getValueFromSheet( tabName, newRage );

     return listRegsters;
  }

  getRow(tabName, column, start = "A", row_start = 2 ){

     if (!tabName || typeof tabName !== "string") {
       console.error("[GSC_SheetHandler.getRow] Falta o es inválido `tabName`.", { tabName });
       return [];
     }
     if (!column || typeof column !== "string") {
       console.error("[GSC_SheetHandler.getRow] Falta o es inválido `column`.", { column });
       return [];
     }
     if (!start || typeof start !== "string") {
       console.error("[GSC_SheetHandler.getRow] Falta o es inválido `start`.", { start });
       return [];
     }
     // Obtener la ultima fila con un registro
     const lastRow = this.getLastRow(tabName);
     if (!lastRow || lastRow < 2) return [];

     // Armamos RANGO en base a la ultima fila registrada
     const newRage = `${start}${row_start}:${column}${lastRow}`;
     Logger.log(`Rango generado: ${newRage}`);

     // Otenemos un array de todos los registros
     const listRegsters = this.getValueFromSheet( tabName, newRage );

     return listRegsters;
  }

  /**
   * Suma los valores numéricos de una lista de registros de remuneraciones.
   * Cada valor puede incluir símbolos de moneda y separadores de miles, por ejemplo `"$9.999"`.
   * @param {Array<Array<string>>} listRegisters Lista de registros donde cada fila contiene el valor en la primera columna.
   * @returns {number} Suma total de las remuneraciones.
   */
  sumarColumnaRemuneraciones( listRegisters ){
    let remuneracion = 0;
    
    listRegisters.forEach( row => {

      const valor = row[0];
      let parsedValor = `${valor}`;

      if(  parsedValor.includes("$") ){
        // Retiro el signo peso.
        parsedValor = valor.split("$")[1];
      }

      if( parsedValor.includes(".") ){
        // Quito los puntos
        parsedValor = parsedValor.replaceAll(".", "");
      }

      // Convierto a entero
      parsedValor = parseInt(parsedValor);

      if( isNaN( parsedValor ) ){
        parsedValor = 0;
      }
           
      remuneracion = remuneracion + parsedValor;
    } );

    return remuneracion
  }

  validateTabCustomFormat(){

    const spreadSheet = this._openSpreadsheet("validateTabCustomFormat");
    if (!spreadSheet) return null;
    const sheetsRaw = spreadSheet.getSheets();
    const sheets = sheetsRaw.map( s => {
        return {
          "name": s.getSheetName(),
          "id": s.getSheetId()
        }
    } );

    const tabName = "Custom Format";

    if( ! sheets.some( e => e.name == tabName ) ){
        Logger.log("No fue encontrada la hoja 'Custom Format'. Se creo la hoja 'Custom Format' exitosamente");
        spreadSheet.insertSheet(tabName);
    }else{
       Logger.log("Fue encontrada la hoja 'Custom Format'");
    }

    const tabCustomFormatSheet = spreadSheet.getSheetByName(tabName);

    return tabCustomFormatSheet;
     
  }

  write( values, start, end, { tabName } ){

    const range = `${start}:${end}`;

    console.log("range: ", range );

    if (!values || !Array.isArray(values)) {
      console.error("[GSC_SheetHandler.write] Falta o es inválido `values`.", { valuesType: typeof values });
      return false;
    }
    if (!start || typeof start !== "string" || !end || typeof end !== "string") {
      console.error("[GSC_SheetHandler.write] Falta o es inválido `start/end`.", { start, end });
      return false;
    }
    const spreadSheet = this._openSpreadsheet("write");
    if (!spreadSheet) return false;
    const sheet = this._getSheetByName(spreadSheet, tabName, "write");
    if (!sheet) return false;
    try {
      sheet.getRange(range).setValues(values);
      return true;
    } catch (err) {
      console.error("[GSC_SheetHandler.write] Error escribiendo rango.", {
        tabName,
        range,
        spreadsheetId: this.spreadsheetId,
        err,
      });
      return false;
    }


  }

  crearTabSiNoExiste(nombreTab) {
    if (!nombreTab || typeof nombreTab !== "string") {
      console.error("[GSC_SheetHandler.crearTabSiNoExiste] Falta o es inválido `nombreTab`.", { nombreTab });
      return null;
    }
    const spreadsheet = this._openSpreadsheet("crearTabSiNoExiste");
    if (!spreadsheet) return null;
    let hoja = spreadsheet.getSheetByName(nombreTab);
    
    if (!hoja) {
      hoja = spreadsheet.insertSheet(nombreTab);
      Logger.log("Tab creado: " + nombreTab);
    } else {
      Logger.log("El tab ya existe.");
    }
    
    return hoja;
  }

  getTabByName( tabName ){
    
    if (!tabName || typeof tabName !== "string") {
      console.error("[GSC_SheetHandler.getTabByName] Falta o es inválido `tabName`.", { tabName });
      return null;
    }
    const spreadSheet = this._openSpreadsheet("getTabByName");
    if (!spreadSheet) return null;
    const sheet = this._getSheetByName(spreadSheet, tabName, "getTabByName");
    if (!sheet) return null;
    return sheet;
  
  }

  obtenerFilasComoObjetos() {

  // 1. Obtener la hoja de cálculo activa y la pestaña actual
  const valores = this.getRow( 'Custom Format','L', 'A',  1 );
  
  // Si la hoja está vacía o solo tiene la cabecera, retornar un arreglo vacío
  if (valores.length <= 1) {
    return [];
  }
  
  // 3. Separar la primera fila (cabeceras) del resto (datos)
  const cabeceras = valores[0];
  const filasDatos = valores.slice(1);
  
  // 4. Mapear cada fila de datos a un objeto basado en las cabeceras
  const resultado = filasDatos.map(fila => {
    const objetoFila = {};
    
    cabeceras.forEach((cabecera, indice) => {
      // Limpiamos espacios en blanco extra que puedan tener las cabeceras por error
      const propiedad = cabecera.toString().trim(); 
      
      // Asignamos el valor de la celda a la propiedad del objeto
      if (propiedad !== "") {
        const parsedValor = fila[indice];
        objetoFila[propiedad] = parsedValor;
      }
    });
    
    return objetoFila;
  });
  
  // 5. Mostrar el resultado en los logs (para pruebas) y retornarlo

  return resultado;
}

}

