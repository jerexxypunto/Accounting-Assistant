/**
 * Acceso a Drive y hojas de cálculo con validación de entrada y límites defensivos.
 */
class GSC_DriveHandler {
  /** Patrón conservador para IDs de archivos de Google (letras, dígitos, guiones). */
  static get _ID_PATTERN() {
    return /^[a-zA-Z0-9_-]{10,128}$/;
  }

  static get _DEFAULT_MAX_FILES() {
    return 500;
  }

  static get _ABS_MAX_FILES() {
    return 2000;
  }

  static get _MAX_NAME_LENGTH() {
    return 256;
  }

  /**
   * @param {string} spd_id
   * @returns {string} id recortado y validado
   * @private
   */
  _normalizeSpreadsheetId(spd_id) {
    if (spd_id == null || typeof spd_id !== 'string') {
      throw new Error('GSC_DriveHandler: el identificador debe ser una cadena de texto.');
    }
    const id = spd_id.trim();
    if (!GSC_DriveHandler._ID_PATTERN.test(id)) {
      throw new Error('GSC_DriveHandler: formato de identificador no permitido.');
    }
    return id;
  }

  /**
   * @param {string} spd_id
   * @returns {{ name: string }[]}
   */
  listSpreadSheetTab(spd_id) {
    const id = this._normalizeSpreadsheetId(spd_id);
    try {
      const spd = SpreadsheetApp.openById(id);
      const tabs = spd.getSheets();
      return tabs.map(function (tab) {
        return { name: tab.getName() };
      });
    } catch (e) {
      throw new Error(
        'GSC_DriveHandler: no se pudo abrir la hoja de cálculo o no hay permisos suficientes.'
      );
    }
  }

  /**
   * @param {{ name?: string, maxFiles?: number }} [options]
   * @returns {string|null} nombre normalizado en minúsculas, o null si no hay filtro
   * @private
   */
  _parseNameFilter(options) {
    if (!options || options.name == null) {
      return null;
    }
    if (typeof options.name !== 'string') {
      throw new Error('GSC_DriveHandler: el nombre de búsqueda debe ser una cadena de texto.');
    }
    const trimmed = options.name.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.length > GSC_DriveHandler._MAX_NAME_LENGTH) {
      throw new Error('GSC_DriveHandler: el nombre de búsqueda supera la longitud permitida.');
    }
    return trimmed.toLowerCase();
  }

  /**
   * Lista hojas de cálculo accesibles y sus pestañas.
   * @param {{ name?: string, maxFiles?: number }} [options]
   * - `name`: si se indica, solo entran archivos cuyo título coincide exactamente (sin distinguir mayúsculas/minúsculas).
   * - `maxFiles`: sin `name`, máximo de archivos recorridos del iterador (1 … 2000). Con `name`, máximo de coincidencias devueltas; el recorrido se corta al examinar como mucho ABS_MAX_FILES archivos.
   * @returns {{ id: string, name: string, tabs: { name: string }[] }[]}
   */
  listSpreadSheet(options) {
    options = options || {};
    const raw = options.maxFiles != null ? Number(options.maxFiles) : NaN;
    const cap = Number.isFinite(raw)
      ? Math.min(
          Math.max(Math.floor(raw), 1),
          GSC_DriveHandler._ABS_MAX_FILES
        )
      : GSC_DriveHandler._DEFAULT_MAX_FILES;

    const nameFilter = this._parseNameFilter(options);

    const list = [];
    let processed = 0;

    try {
      const files = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
      while (files.hasNext()) {
        if (nameFilter) {
          if (list.length >= cap || processed >= GSC_DriveHandler._ABS_MAX_FILES) {
            break;
          }
        } else if (processed >= cap) {
          break;
        }

        const file = files.next();
        processed++;

        if (nameFilter && file.getName().trim().toLowerCase() !== nameFilter) {
          continue;
        }

        const spd_id = file.getId();
        try {
          const tabs = this.listSpreadSheetTab(spd_id);
          list.push({
            id: spd_id,
            name: file.getName(),
            tabs: tabs
          });
        } catch (inner) {
          // Archivo visible en Drive pero no abrible como spreadsheet (revocados, borradores, etc.)
          continue;
        }
      }
    } catch (e) {
      throw new Error('GSC_DriveHandler: error al acceder a Google Drive.');
    }

    return list;
  }

  /**
   * Carpetas en la raíz de Mi unidad (mismo criterio que DriveApp.getFolders()).
   * @returns {{ name: string, id: string }[]}
   */
  listRootFolders() {
    const list = [];
    try {
      const folders = DriveApp.getRootFolder().getFolders();
      while (folders.hasNext()) {
        const folder = folders.next();
        list.push({ name: folder.getName(), id: folder.getId() });
      }
    } catch (e) {
      throw new Error('GSC_DriveHandler: error al listar carpetas en la raíz de Drive.');
    }
    return list;
  }

  /**
   * Hojas de cálculo y subcarpetas directas dentro de una carpeta (por id de carpeta).
   * Las subcarpetas van primero; luego las hojas. Cada subcarpeta lleva `isFolder: true` y `tabs: []`.
   * @param {{ name?: string, id: string }} folderRef — se usa `id`; `name` es opcional (compatibilidad).
   * @returns {{ id: string, name: string, tabs: { name: string }[], isFolder?: boolean }[]}
   */
  listFilesFrom(folderRef) {
    if (!folderRef || typeof folderRef !== 'object' || folderRef.id == null) {
      throw new Error('GSC_DriveHandler: listFilesFrom requiere un objeto con `id` de carpeta.');
    }
    const folderId = this._normalizeSpreadsheetId(String(folderRef.id));

    let folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      throw new Error(
        'GSC_DriveHandler: no se encontró la carpeta o no hay permisos suficientes.'
      );
    }

    const list = [];
    try {
      const subfolders = folder.getFolders();
      while (subfolders.hasNext()) {
        const f = subfolders.next();
        list.push({
          id: f.getId(),
          name: f.getName(),
          isFolder: true,
          tabs: []
        });
      }

      const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
      while (files.hasNext()) {
        const file = files.next();
        const spd_id = file.getId();
        try {
          const tabs = this.listSpreadSheetTab(spd_id);
          list.push({
            id: spd_id,
            name: file.getName(),
            tabs: tabs
          });
        } catch (inner) {
          continue;
        }
      }
    } catch (e) {
      throw new Error('GSC_DriveHandler: error al listar hojas de cálculo en la carpeta.');
    }

    list.sort(function (a, b) {
      var af = Boolean(a.isFolder);
      var bf = Boolean(b.isFolder);
      if (af !== bf) {
        return af ? -1 : 1;
      }
      return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
        sensitivity: 'base'
      });
    });

    return list;
  }

}

function testDrive() {
  driveHandler = new GSC_DriveHandler();
  const list = driveHandler.listRootFolders();
  list.forEach( ( item, i ) => {
    if( i < 3){
      //const files = driveHandler.listFilesFrom(item);
      //console.log(item);
    }
  } );
  console.log(list);
  
  //const folders = DriveApp.getRootFolder();
  //console.log( folders.getFolders() );
}
