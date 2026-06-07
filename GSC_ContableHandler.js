class GSC_ContableHandler {

    /**
     * Crea una instancia de `GSC_ContableHandler`.
     * @param {Object} [options={}] Opciones de configuración.
     * @param {Object} [options.planta={}] Configuración específica para planta.
     * @param {string} [options.planta.spreadsheetId] ID del spreadsheet de planta.
     * @param {Object} [options.contrata={}] Configuración específica para contrata.
     * @param {string} [options.contrata.spreadsheetId] ID del spreadsheet de contrata.
     * @param {string} [options.plantaSpreadsheetId] ID del spreadsheet de planta (modo compatibilidad).
     * @param {string} [options.contrataSpreadsheetId] ID del spreadsheet de contrata (modo compatibilidad).
     * @param {string} [options.spreadsheetId] ID del spreadsheet usado como contrata por compatibilidad hacia atrás.
     */
    constructor(options = {}) {
      const {
        planta = {},
        contrata = {},
        libroDiario = {},
        plantaSpreadsheetId,
        contrataSpreadsheetId,
        libroDiarioSpreadsheetId,
        spreadsheetId, // compatibilidad hacia atrás
      } = options;

      this.planta = {
        spreadsheetId: planta.spreadsheetId || plantaSpreadsheetId || false,
      };

      // Si solo se pasa `spreadsheetId`, se asume que corresponde a contrata (compatibilidad)
      this.contrata = {
        spreadsheetId:
          contrata.spreadsheetId || contrataSpreadsheetId || spreadsheetId || false,
      };

      this.libroDiario = {
        spreadsheetId:
        libroDiario.spreadsheetId || libroDiarioSpreadsheetId || spreadsheetId || false,
        staticsFields:
        libroDiario.staticsFields || []
      }

      console.log("GSC_ContableHandler");
      console.log( "this.planta", this.planta  );
      console.log( "this.contrata", this.contrata  );
      console.log( "this.libroDiario", this.libroDiario  );

    }

    _isNonEmptyString(value) {
      return typeof value === "string" && value.trim().length > 0;
    }

    _requireParam(condition, callerName, message, context = {}) {
      if (condition) return true;
      console.error(`[GSC_ContableHandler.${callerName}] ${message}`, context);
      return false;
    }

    /**
     * Obtiene la remuneración total de la columna J para una hoja dada.
     * @param {string} spreadsheetId ID del spreadsheet a consultar.
     * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet.
     * @returns {number} Suma total de los valores de remuneración encontrados en la columna J.
     */
    getRemuneracion( spreadsheetId, tabName ){

        console.log( "getRemuneracion spreadsheetId: ", spreadsheetId );

        if (!this._requireParam(this._isNonEmptyString(spreadsheetId), "getRemuneracion", "Falta o es inválido `spreadsheetId`.", { spreadsheetId })) {
            return 0;
        }
        if (!this._requireParam(this._isNonEmptyString(tabName), "getRemuneracion", "Falta o es inválido `tabName`.", { tabName })) {
            return 0;
        }

        const SheetHanlder = new GSC_SheetHandler({ spreadsheetId });

        // Otenemos un array de todos los registros en J
        const j_listRegisters = SheetHanlder.getRegisters( tabName, "J" );


        // Lo sumamos
        let remuneracion = SheetHanlder.sumarColumnaRemuneraciones(j_listRegisters);

        Logger.log(`En la columna J se ha encontrado ${remuneracion}`);

        // Lo retornamos
        return remuneracion;

    }

    /**
     * Obtiene la remuneración de bonos desde la columna M para una hoja dada.
     * @param {string} spreadsheetId ID del spreadsheet a consultar.
     * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet.
     * @returns {number} Suma total de los valores de remuneración de bonos en la columna M.
     */
    getRemuneracionBono( spreadsheetId, tabName ){

        if (!this._requireParam(this._isNonEmptyString(spreadsheetId), "getRemuneracionBono", "Falta o es inválido `spreadsheetId`.", { spreadsheetId })) {
            return 0;
        }
        if (!this._requireParam(this._isNonEmptyString(tabName), "getRemuneracionBono", "Falta o es inválido `tabName`.", { tabName })) {
            return 0;
        }

        const SheetHanlder = new GSC_SheetHandler({ spreadsheetId });

        // Otenemos un array de todos los registros en J
        const m_listRegisters = SheetHanlder.getRegisters( tabName, "M" );

        // Lo sumamos
        const remuneracionBono = SheetHanlder.sumarColumnaRemuneraciones(m_listRegisters);

         Logger.log(`En la columna M se ha encontrado ${remuneracionBono}`);

        // Lo retornamos
        return remuneracionBono;
    }

    /**
     * Calcula la remuneración personal (remuneración base, bonos y horas extraordinarias).
     * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet.
     * @param {string} spreadsheetId ID del spreadsheet a consultar.
     * @returns {{remuneracion: number, remuneracionBono: number, total_gastos: number, total_tiempo: number} | {error: string}} Objeto con los totales calculados o un error.
     */
    getRemuneracionPersonal( tabName, spreadsheetId ){

        console.log("getRemuneracionPersonal: ", spreadsheetId );

        if (!this._requireParam(this._isNonEmptyString(spreadsheetId), "getRemuneracionPersonal", "Falta o es inválido `spreadsheetId`.", { spreadsheetId })) {
            return { error: "Falta o es inválido spreadsheetId" };
        }
        if (!this._requireParam(this._isNonEmptyString(tabName), "getRemuneracionPersonal", "Falta o es inválido `tabName`.", { tabName })) {
            return { error: "Falta o es inválido tabName" };
        }

        // Sumar columnas Remuneracion (J) y Remuneracion Bono (M)
        const remuneracion = this.getRemuneracion(spreadsheetId, tabName);
        const remuneracionBono = this.getRemuneracionBono(spreadsheetId, tabName);

        console.log("remuneracion: ", remuneracion);
        console.log("remuneracionBono: ", remuneracionBono);

        // Procesar columnas O, P, Q (Horas Extraordinarias: diurnas, nocturnas, festivas)
        try {
            const montosYHorasExtra = this.procesarHorasExtraordinarias(tabName, spreadsheetId);
            Logger.log(montosYHorasExtra);
            return {
                remuneracion,
                remuneracionBono,
                ...montosYHorasExtra
            };
        } catch (error) {
            console.error("[GSC_ContableHandler.getRemuneracionPersonal] Error procesando horas extraordinarias.", { tabName, spreadsheetId, error });
            return { error: "La suma ha ocurrido un error en la suma da las columnas O,P,Q" };
        }
    }



  
    /**
     * Calcula la remuneración personal para la contrata usando el spreadsheet configurado en la instancia.
     * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet de contrata.
     * @returns {{remuneracion: number, remuneracionBono: number, total_gastos: number, total_tiempo: number} | {error: string}} Objeto con los totales calculados o un error.
     */
    getRemuneracionPersonalContrata(tabName) {
        console.log("Obteneindo remuneración Personal contrata" );
        if (!this._requireParam(this._isNonEmptyString(this.contrata?.spreadsheetId), "getRemuneracionPersonalContrata", "No hay `contrata.spreadsheetId` configurado.", { contrata: this.contrata })) {
            return { error: "Falta contrata.spreadsheetId" };
        }
        return this.getRemuneracionPersonal( tabName, this.contrata.spreadsheetId );
    }

    /**
     * Procesa las horas extraordinarias sumando las columnas O, P y Q.
     * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet.
     * @param {string} spreadsheetId ID del spreadsheet a consultar.
     * @returns {{total_gastos: number, total_tiempo: number}} Objeto con el total de gastos y total de tiempo de horas extraordinarias.
     */
    procesarHorasExtraordinarias(tabName, spreadsheetId) {
        if (!this._requireParam(this._isNonEmptyString(spreadsheetId), "procesarHorasExtraordinarias", "Falta o es inválido `spreadsheetId`.", { spreadsheetId })) {
            return { total_gastos: 0, total_tiempo: 0 };
        }
        if (!this._requireParam(this._isNonEmptyString(tabName), "procesarHorasExtraordinarias", "Falta o es inválido `tabName`.", { tabName })) {
            return { total_gastos: 0, total_tiempo: 0 };
        }
        // Definir columnas de interés
        const columnas = ["O", "P", "Q"];
        let total_gastos = 0;
        let total_tiempo = 0;

        for (const col of columnas) {
            const registros = this.getHorasExtraColumna(tabName, col, spreadsheetId);
            const suma = this.sumarHorasExtra(registros);
            total_gastos += suma.total_gastos;
            total_tiempo += suma.total_tiempo;
        }

        return { total_gastos, total_tiempo };
    }

    /**
     * Obtiene los registros de una columna de horas extraordinarias como arreglo.
     * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet.
     * @param {string} columna Letra de la columna a leer (por ejemplo "O", "P" o "Q").
     * @param {string} spreadsheetId ID del spreadsheet a consultar.
     * @returns {Array<Array<string>>} Arreglo de filas, donde cada fila es un arreglo con el valor de la columna.
     */
    getHorasExtraColumna(tabName, columna, spreadsheetId) {
        if (!this._requireParam(this._isNonEmptyString(spreadsheetId), "getHorasExtraColumna", "Falta o es inválido `spreadsheetId`.", { spreadsheetId })) {
            return [];
        }
        if (!this._requireParam(this._isNonEmptyString(tabName), "getHorasExtraColumna", "Falta o es inválido `tabName`.", { tabName })) {
            return [];
        }
        if (!this._requireParam(this._isNonEmptyString(columna), "getHorasExtraColumna", "Falta o es inválido `columna`.", { columna })) {
            return [];
        }
        const SheetHandler = new GSC_SheetHandler({ spreadsheetId });
        // Los registros comienzan en la fila 2 hasta la última con datos
        return SheetHandler.getRegisters(tabName, columna);
    }

    /**
     * Suma los valores de dinero y tiempo de una columna de horas extraordinarias.
     * Cada registro debe tener el formato `"$9.999 : 9,00 hrs"`.
     * @param {Array<Array<string>>} registros Lista de registros de la columna de horas extra.
     * @returns {{total_gastos: number, total_tiempo: number}} Objeto con el total de gastos y total de tiempo calculado.
     */
    sumarHorasExtra(registros) {

        let total_gastos = 0;
        let total_tiempo = 0;

        if (!Array.isArray(registros)) {
            console.error("[GSC_ContableHandler.sumarHorasExtra] `registros` inválido (no es array).", { registrosType: typeof registros });
            return { total_gastos, total_tiempo };
        }

        registros.forEach(row => {

            const valor = (row[0] || "").trim();
            if (valor.length === 0) return;

            // Verifica alfanumérico y formato esperado
            if (typeof valor === "string" && valor.includes(":")) {
                const partes = valor.split(":");
                if (partes.length !== 2) return;

                // Procesar monto, por ejemplo "$9.999 "
                let monto = partes[0].replace("$", "").replace(/\./g, "").trim();
                monto = parseInt(monto, 10);
                if (isNaN(monto)) monto = 0;

                // Procesar tiempo, por ejemplo " 9,00 hrs"
                let tiempoStr = partes[1].replace("hrs", "").replace(",", ".").trim();
                let tiempo = parseFloat(tiempoStr);
                if (isNaN(tiempo)) tiempo = 0;

                total_gastos += monto;
                total_tiempo += tiempo;
            }
            // Si no cumple formato, ignorar (alternativamente lanzar un error)
        });

        return { total_gastos, total_tiempo };
    }

    /**
     * Calcula la remuneración personal para la planta usando el spreadsheet configurado en la instancia.
     * @param {string} tabName Nombre de la pestaña/hoja dentro del spreadsheet de planta.
     * @returns {{remuneracion: number, remuneracionBono: number, total_gastos: number, total_tiempo: number} | {error: string}} Objeto con los totales calculados o un error.
     */
    getRemuneracionPersonalPlanta(tabName){
        console.log("Obteniendo remunración Planta");
        if (!this._requireParam(this._isNonEmptyString(this.planta?.spreadsheetId), "getRemuneracionPersonalPlanta", "No hay `planta.spreadsheetId` configurado.", { planta: this.planta })) {
            return { error: "Falta planta.spreadsheetId" };
        }
        return this.getRemuneracionPersonal( tabName, this.planta.spreadsheetId );
    }

    /**
     * Cruza (suma) los datos de remuneración personal de contrata y planta.
     * @param {{remuneracion: number, remuneracionBono: number, total_gastos: number, total_tiempo: number}} remuneracionPersonalContrata Datos de remuneración personal de contrata.
     * @param {{remuneracion: number, remuneracionBono: number, total_gastos: number, total_tiempo: number}} remuneracionPersonalPlanta Datos de remuneración personal de planta.
     * @returns {{total_remuneracion: number, total_remuneracion_bono: number, total_gastos: number, total_tiempo: number}} Objeto con los totales cruzados.
     */
    cruzarRemuneracionPersonal( remuneracionPersonalContrata, remuneracionPersonalPlanta ){

        console.log( "Cruzando remuneración PersonalContrara + PersonalPlanta" );
        if (remuneracionPersonalContrata?.error || remuneracionPersonalPlanta?.error) {
            console.error("[GSC_ContableHandler.cruzarRemuneracionPersonal] No se puede cruzar: hay error en inputs.", {
                remuneracionPersonalContrata,
                remuneracionPersonalPlanta,
            });
            return { error: "No se puede cruzar remuneraciones: inputs con error" };
        }
        const requiredFields = ["remuneracion", "remuneracionBono", "total_gastos", "total_tiempo"];
        const hasAll = (obj) => requiredFields.every((k) => typeof obj?.[k] === "number");
        if (!hasAll(remuneracionPersonalContrata) || !hasAll(remuneracionPersonalPlanta)) {
            console.error("[GSC_ContableHandler.cruzarRemuneracionPersonal] Inputs incompletos o inválidos.", {
                remuneracionPersonalContrata,
                remuneracionPersonalPlanta,
            });
            return { error: "Inputs incompletos para cruce" };
        }
        const total_remuneracion = remuneracionPersonalContrata.remuneracion + remuneracionPersonalPlanta.remuneracion;
        const total_remuneracion_bono = remuneracionPersonalContrata.remuneracionBono + remuneracionPersonalPlanta.remuneracionBono;
        const total_gastos = remuneracionPersonalContrata.total_gastos + remuneracionPersonalPlanta.total_gastos;
        const total_tiempo = remuneracionPersonalContrata.total_tiempo + remuneracionPersonalPlanta.total_tiempo;

        return {
          total_remuneracion,
          total_remuneracion_bono,
          total_gastos,
          total_tiempo
        }

    }



    /* 
        Cruzar remuneracion personal contratada con remuneracion personal planta
    */
    /**
     * Calcula y cruza la remuneración personal de contrata y planta para las pestañas indicadas.
     * @param {Object} params Parámetros para el cruce.
     * @param {string} params.contrataTabName Nombre de la pestaña/hoja para contrata.
     * @param {string} params.plantaTabName Nombre de la pestaña/hoja para planta.
     * @returns {{total_remuneracion: number, total_remuneracion_bono: number, total_gastos: number, total_tiempo: number} | {error: string}} Objeto con el resultado del cruce o un error.
     */
    crossRemuneracionPersonalContrataWithPersonalPlanta( { contrataTabName, plantaTabName } ){

        console.log("Cruzando gastos Contrata + Planta");

        if (!this._requireParam(this._isNonEmptyString(contrataTabName), "crossRemuneracionPersonalContrataWithPersonalPlanta", "Falta o es inválido `contrataTabName`.", { contrataTabName })) {
            return { error: "Falta contrataTabName" };
        }
        if (!this._requireParam(this._isNonEmptyString(plantaTabName), "crossRemuneracionPersonalContrataWithPersonalPlanta", "Falta o es inválido `plantaTabName`.", { plantaTabName })) {
            return { error: "Falta plantaTabName" };
        }

        const remuneracionPersonalContrata = this.getRemuneracionPersonalContrata( contrataTabName );
        const remuneracionPersonalPlanta = this.getRemuneracionPersonalPlanta(plantaTabName);
        const remuneracionPersonalCruzada = this.cruzarRemuneracionPersonal(remuneracionPersonalContrata, remuneracionPersonalPlanta);
        if (remuneracionPersonalCruzada?.error) {
            return {
                error: remuneracionPersonalCruzada.error,
                contrata: remuneracionPersonalContrata,
                planta: remuneracionPersonalPlanta
            };
        }
        return {
            "contrata" : remuneracionPersonalContrata ,
            "planta"    : remuneracionPersonalPlanta    ,
            "suma"     : remuneracionPersonalCruzada
        };
    }

    getLibroDiario( tabName, letterEnd = "K" ){
        if (!this._requireParam(this._isNonEmptyString(this.libroDiario?.spreadsheetId), "getLibroDiario", "No hay `libroDiario.spreadsheetId` configurado.", { libroDiario: this.libroDiario })) {
            return [];
        }
        if (!this._requireParam(this._isNonEmptyString(tabName), "getLibroDiario", "Falta o es inválido `tabName`.", { tabName })) {
            return [];
        }
        const libroDiarioHanlder = new GSC_SheetHandler( { spreadsheetId: this.libroDiario.spreadsheetId } );
        const libroDiarioRawRows = libroDiarioHanlder.getRow( tabName, letterEnd, "A", 1 );
        return libroDiarioRawRows;
    }

    libroDiarioFormatHeader( newFormat ){

        const newFormatHeaderTemplate = [
            "municipio",	
            "municipioNombre",
            "ejercicio",
            "periodo",
            "numeroAsiento",
            "fechaAsiento",
            "glosaAsiento",
            "codigoCuenta",
            "nombreCuenta",
            "debe",
            "haber",
            "rutContraparte",
            "nombreContraparte",
            "tipoDocumento",
            "numeroDocumento",
            "numeroDecreto",
            "fechaDecreto"
        ];

        newFormat.push( newFormatHeaderTemplate );
        Logger.log("Formateado el Header");
    }

    libroDiarioDetectStartTables( libroDiarioRows, tablesCounter, startTablesCords  ){

        console.log("Detectando comienzo de tablas.");

        libroDiarioRows.forEach( ( row , index ) => {

            const cursor = index + 2 ;

            // Las primeras 2 celdas de la fila contienen un numero natural.
            const first_two_cells = [ row[0], row[1]  ];
            if( first_two_cells.every( value => ! ( isNaN( parseInt( value ) ) ) ) ){
                    //console.log("Encontro el inicio de una tabla");
                    tablesCounter++;
                    startTablesCords.push( cursor );
            }

        } );

        return tablesCounter;
    }

    libroDiarioDetectEndTables( libroDiarioRows, endTablesCords ){

        console.log("Detectando fin de tablas.");

        libroDiarioRows.forEach( ( row , index ) => {

            const cursor = index + 2 ;

            // La segunda celda de la ultima fila contiene la cadena de texto: “Total Comprobante“
            const second_cell =  String(row[1]) ;
            if( second_cell.includes("Total Comprobante") ){
                    endTablesCords.push( cursor );
            }

        } );
    }

    libroDiarioDetectTables( libroDiarioRows, tabName  ){

        // Detecta cuantas veces inicia un tabla
        let tablesCounter = 0;
        const startTablesCords = [];
        const endTablesCords = [];
        const tablesDetected = [];

        console.log("Detectando tablas..");

        if (!Array.isArray(libroDiarioRows)) {
            console.error("[GSC_ContableHandler.libroDiarioDetectTables] `libroDiarioRows` inválido (no es array).", {
                libroDiarioRowsType: typeof libroDiarioRows,
            });
            return [];
        }
        if (!this._requireParam(this._isNonEmptyString(tabName), "libroDiarioDetectTables", "Falta o es inválido `tabName`.", { tabName })) {
            return [];
        }

        tablesCounter = this.libroDiarioDetectStartTables( libroDiarioRows, tablesCounter, startTablesCords );
        this.libroDiarioDetectEndTables( libroDiarioRows, endTablesCords );


        // Vamos a iterar tantas veces como tablas existan
        for (let index = 0; index < tablesCounter; index++) {

            const startCord =  startTablesCords[index];
            const endCord = endTablesCords[index];
            if (!Number.isFinite(startCord) || !Number.isFinite(endCord)) {
                console.error("[GSC_ContableHandler.libroDiarioDetectTables] Coordenadas faltantes para tabla detectada.", {
                    index,
                    startCord,
                    endCord,
                    startTablesCords,
                    endTablesCords,
                });
                continue;
            }
            
            const tableDetectedItem = new GSC_DetectedTableItem( startCord, endCord , [] );
            const tableHeader = tableDetectedItem.getHeader( this.libroDiario.spreadsheetId, tabName );
            const tableBody = tableDetectedItem.getBody(this.libroDiario.spreadsheetId, tabName );
            if (!tableHeader) {
                console.error("[GSC_ContableHandler.libroDiarioDetectTables] Header inválido: se omite tabla.", { index, startCord, endCord });
                continue;
            }
            if (!Array.isArray(tableBody)) {
                console.error("[GSC_ContableHandler.libroDiarioDetectTables] Body inválido: se omite tabla.", { index, startCord, endCord });
                continue;
            }
            tableDetectedItem.setHeader( tableHeader );
            tableDetectedItem.setBody( tableBody );
            tablesDetected.push(tableDetectedItem);
            
        }

        console.log(`Se han encontrado ${tablesCounter} tablas.`);
        return tablesDetected;

    }

    libroDiarioTableGetType( libroDiarioRows ){
        console.log("Detectando tipo de tabla..");
        return "default";
    }

    libroDiarioDetectHeader( libroDiarioRows, tableType ){
        console.log("Detectando header de tabla..");
        console.log("tableType: ", tableType);
        console.log("libroDiarioRows: ", libroDiarioRows);
    }

    libroDiarioDetectBody( libroDiarioRows, tableType ){
        console.log("Detectando body de tabla..");
    }

    libroDiarioParser( libroDiarioRows, tabName ){

        // Detecta el tipo de Tabla
        const tableType = this.libroDiarioTableGetType( libroDiarioRows );

        // Detecta el header de la tabla
        this.libroDiarioDetectHeader( libroDiarioRows, tableType );

        // Detecta el body de la tabla
        this.libroDiarioDetectBody( libroDiarioRows, tableType );

        // Genera un nuevo formato con los datos obtenidos

    }

    libroDiarioReorderFields( libroDiarioSpreadsheetId, tabName,  allNewRows ){

        // Abro Tabla de Libro Diario
        
        const libroDiarioRows = this.getLibroDiario( tabName );
        console.log("Obteniendo filas de LibroDiario");

        const staticsFields = this.libroDiario.staticsFields;

        const tables = this.libroDiarioDetectTables( libroDiarioRows, tabName  );
        if (!Array.isArray(allNewRows)) {
            console.error("[GSC_ContableHandler.libroDiarioReorderFields] `allNewRows` inválido (no es array).", { allNewRowsType: typeof allNewRows });
            return false;
        }
        if (!Array.isArray(staticsFields)) {
            console.error("[GSC_ContableHandler.libroDiarioReorderFields] `libroDiario.staticsFields` inválido (no es array).", { staticsFieldsType: typeof staticsFields });
            return false;
        }
        if (!Array.isArray(tables) || tables.length === 0) {
            console.error("[GSC_ContableHandler.libroDiarioReorderFields] No se detectaron tablas para reordenar.", { tabName });
            return false;
        }
        
        
        // Recorro cada fila del libro diario

        /*
            Deben generarse tantas filas como filas tenga cada tabla.
            Cada fila debe debe llevar los datos de la cabeceza de la tabla asi como las filas B(1),C(2),D(3),E(4)
        */
        
        console.log("Comenzamos a clasificar tablas");
        tables.map( table => {

            console.log("Entero a una iteracion");

            //   por cada fila los primero 4 items se establecen de forma estatica
            const row_template = [...staticsFields];
            //console.log("Se establecen parametros estaticos");
            
            //   por cada fila reordenamos las valores de las filas E hasta K
            //console.log("Insertamos valores de cabecera");
            row_template.push( table.header.num_asiento );
            row_template.push( table.header.fecha );
            row_template.push( table.header.glosa_asiento );

            //console.log("Comienzo a armar nuevo formato");

            table.body.forEach( raw_row => {

                const num_cuenta    = raw_row[1];
                const nombre_cuenta = raw_row[2];
                const debe          = raw_row[3];
                const haber         = raw_row[4];


                const row = [...row_template, num_cuenta, nombre_cuenta, debe, haber ];
                allNewRows.push( row );
                
            } );            
        
        });

        Logger.log("Filas reorganizadas");

        

    }

    libroDiarioWriteNewFormat( spreadsheetId, newFormat ){

      if (!this._requireParam(this._isNonEmptyString(spreadsheetId), "libroDiarioWriteNewFormat", "Falta o es inválido `spreadsheetId`.", { spreadsheetId })) {
        return false;
      }
      if (!Array.isArray(newFormat) || newFormat.length === 0) {
        console.error("[GSC_ContableHandler.libroDiarioWriteNewFormat] `newFormat` vacío o inválido.", {
          newFormatType: typeof newFormat,
          length: newFormat?.length,
        });
        return false;
      }
      const sheetHandler = new GSC_SheetHandler( { spreadsheetId: spreadsheetId } );

      // Valida si existe el tab "custom_format", si no existe crea un nuevo tab con este nombre
      const tabCustomFormatSheet = sheetHandler.validateTabCustomFormat();
      if (!tabCustomFormatSheet) {
        console.error("[GSC_ContableHandler.libroDiarioWriteNewFormat] No se pudo obtener/crear el tab 'Custom Format'.", { spreadsheetId });
        return false;
      }

      console.log(`Tenemos ${newFormat.length} Filas`);

      // Opcional: limpiamos el contenido anterior
      tabCustomFormatSheet.clearContents();

      // Dividiremos esta lista en segmentos de 150 filas
      const MAX_FILAS_POR_BLOQUE = 150;

      Logger.log("Comenzando proceso de escritura");

      for (let inicio = 0; inicio < newFormat.length; inicio += MAX_FILAS_POR_BLOQUE) {
        const fin = Math.min(inicio + MAX_FILAS_POR_BLOQUE, newFormat.length);
        const segmento = newFormat.slice(inicio, fin);

        // Aseguramos que cada fila tenga exactamente 17 columnas (A:Q)
        segmento.forEach(row => {
          if (row.length < 17) {
            const diferencia = 17 - row.length;
            for (let i = 0; i < diferencia; i++) {
              row.push("");
            }
          }
        });

        const filaInicioHoja = inicio + 1; // La primera fila en la hoja es la 1
        const filaFinHoja = filaInicioHoja + segmento.length - 1;
        const rangeA1 = `A${filaInicioHoja}:Q${filaFinHoja}`;

        const range = tabCustomFormatSheet.getRange(rangeA1);
        range.setValues(segmento);
      }

      Logger.log("Escritura terminada exitosamente");

      // Primera fila (encabezado) en negrita
      const headerRange = tabCustomFormatSheet.getRange("A1:Q1");
      headerRange.setFontStyle("bold");

      return true;
   
    }

  


    // Formatear Libro Diario
    formatearLibroDiario( tabName ){

        const newFormat = [];
        // Rango A : Q (17 Celdas)

        if (!this._requireParam(this._isNonEmptyString(tabName), "formatearLibroDiario", "Falta o es inválido `tabName`.", { tabName })) {
            return { ok: false, error: "Falta tabName" };
        }
        if (!this._requireParam(this._isNonEmptyString(this.libroDiario?.spreadsheetId), "formatearLibroDiario", "No hay `libroDiario.spreadsheetId` configurado.", { libroDiario: this.libroDiario })) {
            return { ok: false, error: "Falta libroDiario.spreadsheetId" };
        }

        // Ya existe la tab "Custom Format"? terminamos la ejecucion para no sobreescribir datos
        const sheetHandler = new GSC_SheetHandler( { spreadsheetId: this.libroDiario.spreadsheetId } );
        const tabCustomFormatSheet = sheetHandler.getTabByName("Custom Format");
        if (tabCustomFormatSheet) {
            console.error("[GSC_ContableHandler.formatearLibroDiario] El tab 'Custom Format' ya existe. Para evitar sobreescritura, se detiene el proceso.", { spreadsheetId: this.libroDiario.spreadsheetId });
            return { ok: false, error: "El tab 'Custom Format' ya existe. Por seguridad, no se sobreescribirá." };
        }

        console.log("tabCustomFormatSheet: ", tabCustomFormatSheet );

        const libroDiarioRawRows = this.getLibroDiario( tabName, "AR" );
        const libroDiarioRows = libroDiarioRawRows.map( row => {
             // Nos aseguramos de que no existan celdas vacias.
             const cells = []
             for (let i = 0; i < row.length; i++) {
                const cellValue = row[i];
                if( cellValue !== "" ){
                    cells.push({ value: cellValue, index: i });
                }
             }
             return cells;
        } ) ; 

        this.libroDiarioParser( libroDiarioRows, tabName );


    }

    reducirDumplicadosLibroDiario( libroDiarioRawRows ){

      // Sumamos las columas J (4) y K (5)
      const indiceGlosa = 2; // La columna de la frase

        const tablaSinDuplicados = [...new Map(
          libroDiarioRawRows.map(fila => [fila[indiceGlosa], fila])
        ).values()];

        return tablaSinDuplicados
    }

    sumarLibroDiarioGastos(  ){

      // Creamos Rango F2:K{ultima fila}
      // Hacemos la peticion

      const tabName = 'Custom Format';

      console.log("Sumando gastos de libro diario");
      console.log(this.libroDiario);

      if (!this._requireParam(this._isNonEmptyString(this.libroDiario?.spreadsheetId), "sumarLibroDiarioGastos", "No hay `libroDiario.spreadsheetId` configurado.", { libroDiario: this.libroDiario })) {
        return { error: "Falta libroDiario.spreadsheetId" };
      }
      const libroDiarioHanlder = new GSC_SheetHandler( { spreadsheetId: this.libroDiario.spreadsheetId } );
      const libroDiarioRawRows = libroDiarioHanlder.getRow( tabName , "K", "F" );
      if (!Array.isArray(libroDiarioRawRows)) {
        console.error("[GSC_ContableHandler.sumarLibroDiarioGastos] Respuesta inválida al leer filas.", { tabName });
        return { error: "No se pudieron leer filas de libro diario" };
      }

      const soloGastos = libroDiarioRawRows.map( ( item ) => {

        let debe = 0;
        let haber = 0;
        let nombre_cuenta = '';
        let codigoCuenta = '';

        if( item?.[2] ) codigoCuenta = item[2];
        if( item?.[3] ) nombre_cuenta = item[3];
        if( item?.[4] ) debe = item[4];
        if( item?.[5] ) haber = item[5];

        return { "debe": debe , "haber": haber, nombre_cuenta: nombre_cuenta, codigoCuenta: codigoCuenta  }
      
    } );



    function detect_planta(list, index, counter) {
          const nombre_cuenta = list[index].nombre_cuenta;
          // Parseamos a entero inmediatamente
          const debe = parseInt(list[index].debe, 10) || 0;
          const haber = parseInt(list[index].haber, 10) || 0;

          if (nombre_cuenta.includes('Planta')) {
              console.log('detect_planta', haber);
              counter.personal.push(list[index]);
              counter.total_haber = counter.total_haber + haber;
              counter.total_debe = counter.total_debe + debe;
          }
      }

      function detect_contrata(list, index, counter) {
          const nombre_cuenta = list[index].nombre_cuenta;
          const debe = parseInt(list[index].debe, 10) || 0;
          const haber = parseInt(list[index].haber, 10) || 0;

          if (nombre_cuenta.includes('Contrata')) {
              console.log('detect_contrata', haber);
              counter.personal.push(list[index]);
              counter.total_haber = counter.total_haber + haber;
              counter.total_debe = counter.total_debe + debe;
          }
      }

      function detect_horas_extra(list, index, counter) {
          const nombre_cuenta = list[index].nombre_cuenta;
          const debe = parseInt(list[index].debe, 10) || 0;
          const haber = parseInt(list[index].haber, 10) || 0;
          const numCuenta = list[index].codigoCuenta;

          if (nombre_cuenta.includes('Trabajos Extraordinarios')) {
              console.log('detect_horas_extra', haber);
              counter.total_haber = counter.total_haber + haber;
              counter.total_debe = counter.total_debe + debe;
              counter.personal.push(list[index]);
          }
      }
      
      const persona_planta = { total_debe: 0, total_haber: 0, personal: [] };
      const persona_contrata = { total_debe: 0, total_haber: 0, personal: [] };
      const horas_extra = { total_debe: 0, total_haber: 0,  personal: [] };

      // Sumar Haberes y deberes
      for ( let i = 0 ; i < soloGastos.length ; i++ ){

          detect_planta( soloGastos, i, persona_planta );
          detect_contrata( soloGastos, i, persona_contrata );
          detect_horas_extra( soloGastos, i, horas_extra );

      }

      const horas_extras_unique = Object.values(
        horas_extra.personal.reduce((acc, item) => {
      
          const key = item.codigoCuenta;
      
          if (!acc[key]) {
            acc[key] = {
              codigoCuenta: key,
              nombre_cuenta: item.nombre_cuenta,
              debe: 0,
              haber: 0
            };
          }
      
          acc[key].debe +=  parseInt( item.debe );
          acc[key].haber += parseInt( item.haber );
      
          return acc;
      
        }, {})
      );

      horas_extra.personal = horas_extras_unique;

      console.log("persona_planta: ", persona_planta);
      console.log("persona_contrata: ", persona_contrata);
      console.log("horas_extra: ", horas_extra);

      return { persona_contrata, persona_planta, horas_extra  }

    }


  

    trasparenciaReorder(){

      function reorderSheet(row){   

        function parserString( valor ){

            if (valor.length === 0) return;

              // Verifica alfanumérico y formato esperado
              if (typeof valor === "string" && valor.includes(":")) {
                  const partes = valor.split(":");
                  if (partes.length !== 2) return;

                  // Procesar monto, por ejemplo "$9.999 "
                  let monto = partes[0].replace("$", "").replace(/\./g, "").trim();
                  monto = parseInt(monto, 10);
                  if (isNaN(monto)) monto = 0;
                  return monto;
              }
        }

            // 14, 15, 16
            const o  = (row[14] || "").trim();
            const p  = (row[15] || "").trim();
            const q  = (row[16] || "").trim();

            if( o.includes("$") ){
                row[14] = parserString( o );
            }
            if( o.includes("No tiene") ) row[14] = "";

            if( p.includes("$") ){
                row[15] = parserString( p );
            }
            if( o.includes("No tiene") ) row[15] = "";

            if( q.includes("$") ){
                row[16] = parserString( q );
            }
            if( o.includes("No tiene") ) row[16] = "";

            return row;

        }


     
      const contratSpd = new GSC_SheetHandler({ spreadsheetId: this.contrata.spreadsheetId });
      const plantaSpd   = new GSC_SheetHandler( { spreadsheetId: this.planta.spreadsheetId } );
      if (!this._requireParam(this._isNonEmptyString(this.contrata?.spreadsheetId), "trasparenciaReorder", "No hay `contrata.spreadsheetId` configurado.", { contrata: this.contrata })) {
        return false;
      }
      if (!this._requireParam(this._isNonEmptyString(this.planta?.spreadsheetId), "trasparenciaReorder", "No hay `planta.spreadsheetId` configurado.", { planta: this.planta })) {
        return false;
      }

      // Los registros comienzan en la fila 2 hasta la última con datos
      const contratSheet =  contratSpd.getRow( "PersonalContara Enero", "U" );
      const contrataReorder = contratSheet.map( row =>  reorderSheet(row));
      contratSpd.crearTabSiNoExiste("Fomatted");
      contratSpd.write( contrataReorder, "A2", "U167", { tabName:  "Fomatted"}  );

      const plantaSheet = plantaSpd.getRow( "PersonalPaza Enero", "U" );
      const plantaReorder = plantaSheet.map( row =>  reorderSheet(row));
      plantaSpd.crearTabSiNoExiste("Fomatted");
      plantaSpd.write( plantaReorder, "A2", "U299", { tabName:  "Fomatted"}  );

    }

    compararTablas(list, comparation, tag) {

        console.log("comparation: ", comparation);
        const { trasnparencia, trasnparenciaHorasExtras, libroDiario, libroDiarioHorasExtras } = comparation;
        let tableMajor = "";
        let tableMinor = "";

        // Pregunta cual de los 2 valores es más grande
        let mayor, menor;
        if (trasnparencia > libroDiario) {
            mayor = trasnparencia;
            menor = libroDiario;
            tableMajor = tag;
            tableMinor = "Libro Diario";
        } else {
            mayor = libroDiario;
            menor = trasnparencia;
            tableMajor  = "Libro Diario";
            tableMinor  = tag;
        }

        let extraMayor, extraMenor;
        if (trasnparenciaHorasExtras > libroDiarioHorasExtras) {
            extraMayor = trasnparenciaHorasExtras;
            extraMenor = libroDiarioHorasExtras;
        } else {
            extraMayor = libroDiarioHorasExtras;
            extraMenor = trasnparenciaHorasExtras;
        }

        // Resta el más grande al más pequeño
        const diferencia = mayor - menor;
        const diferenciaHorasExtras = extraMayor - extraMenor;


        if ('contrata' === tag) {

            // guarda el resultado en list.contrata
            if (!list.contrata) list.contrata = {};
            list.contrata = {
                trasnparenciaNum: trasnparencia,
                libroDiarioNum: libroDiario,
                trasnparenciaHorasExtras: trasnparenciaHorasExtras,
                libroDiarioHorasExtras: libroDiarioHorasExtras,
                diferencia,
                diferenciaHorasExtras,
                tableMajor,
                tableMinor,
                extraMayor,
                extraMenor
            };
        }

        if ( 'planta' === tag ){
            // guarda el resultado en list.planta
            if (!list.planta) list.planta = {};
            list.planta = {
                trasnparenciaNum: trasnparencia,
                libroDiarioNum: libroDiario,   
                trasnparenciaHorasExtras: trasnparenciaHorasExtras,
                libroDiarioHorasExtras: libroDiarioHorasExtras,
                diferencia,
                diferenciaHorasExtras,
                tableMajor,
                tableMinor,
                extraMayor,
                extraMenor
            };
        }
    }


}