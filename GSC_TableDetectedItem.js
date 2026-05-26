class GSC_DetectedTableItem{

    constructor(  startCord = 0, endCord = 0 , insdeRange = [] ){
        this.startCord = startCord ;
        this.endCord = endCord ;
        this.insdeRange = insdeRange;
        this.header = [];
        this.body = [];
    }

    _validateCords(callerName){
      const startOk = Number.isFinite(this.startCord) && this.startCord > 0;
      const endOk = Number.isFinite(this.endCord) && this.endCord > 0;
      if (!startOk || !endOk) {
        console.error(`[GSC_DetectedTableItem.${callerName}] Coordenadas inválidas.`, {
          startCord: this.startCord,
          endCord: this.endCord,
        });
        return false;
      }
      if (this.endCord <= this.startCord) {
        console.error(`[GSC_DetectedTableItem.${callerName}] Rango inválido (endCord <= startCord).`, {
          startCord: this.startCord,
          endCord: this.endCord,
        });
        return false;
      }
      return true;
    }

    _validateParams(spreadsheetId, tabName, callerName){
      if (!spreadsheetId || typeof spreadsheetId !== "string") {
        console.error(`[GSC_DetectedTableItem.${callerName}] Falta o es inválido \`spreadsheetId\`.`, { spreadsheetId });
        return false;
      }
      if (!tabName || typeof tabName !== "string") {
        console.error(`[GSC_DetectedTableItem.${callerName}] Falta o es inválido \`tabName\`.`, { tabName });
        return false;
      }
      return true;
    }

    getRangeHeader(){
      if (!this._validateCords("getRangeHeader")) return null;
      return `A${this.startCord}:K${this.startCord}`;
    }

    getHeader( spreadsheetId, tabName ){
      if (!this._validateCords("getHeader")) return null;
      if (!this._validateParams(spreadsheetId, tabName, "getHeader")) return null;
      const rangeA1 = this.getRangeHeader();
      if (!rangeA1) return null;
      const sheetHandler = new GSC_SheetHandler({ spreadsheetId: spreadsheetId });
      const headerMatrix = sheetHandler.getValueFromSheet( tabName, rangeA1 );
      const headerRaw = Array.isArray(headerMatrix) && headerMatrix[0] ? headerMatrix[0] : null;
      if (!headerRaw) {
        console.error("[GSC_DetectedTableItem.getHeader] No se pudo leer el header (rango vacío).", {
          spreadsheetId,
          tabName,
          rangeA1,
        });
        return null;
      }

      const header = {
        "num_asiento": headerRaw[0],
        "fecha" : headerRaw[2],
        "num_cuenta": headerRaw[3],
        "glosa_asiento": headerRaw[5]
      };

      return header;
    }

    getBodyRowRange( ){
      if (!this._validateCords("getBodyRowRange")) return null;
      return `A${this.startCord + 1}:K${this.endCord - 1}`;
    }

    getBody( spreadsheetId, tabName ){

      const sheetHandler = new GSC_SheetHandler({ spreadsheetId: spreadsheetId });
      const rangeA1 = this.getBodyRowRange();
      if (!this._validateCords("getBody")) return [];
      if (!this._validateParams(spreadsheetId, tabName, "getBody")) return [];
      if (!rangeA1) return [];
      const body = sheetHandler.getValueFromSheet(tabName, rangeA1);
      if (!Array.isArray(body)) {
        console.error("[GSC_DetectedTableItem.getBody] Respuesta inválida leyendo body.", {
          spreadsheetId,
          tabName,
          rangeA1,
          bodyType: typeof body,
        });
        return [];
      }
      return body;
    }

    setHeader( header ){
        if (!header || typeof header !== "object") {
          console.error("[GSC_DetectedTableItem.setHeader] Header inválido.", { header });
          return false;
        }
        this.header = header; 
        return true;
    }
    
    setBody( body ){
      if (!Array.isArray(body)) {
        console.error("[GSC_DetectedTableItem.setBody] Body inválido (no es array).", { bodyType: typeof body });
        return false;
      }
      this.body = body;
      return true;
    }

}