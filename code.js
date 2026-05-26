// Sirve index por defecto; ?route=nombre carga el HTML nombre (sin .html).
function doGet(e) {
  var raw = e && e.parameter && e.parameter.route;
  var route = raw ? String(raw).replace(/[^a-zA-Z0-9_-]/g, "") : "";
  if (!route) route = "index";

  console.log("route:", route );

  try {
    return HtmlService.createTemplateFromFile(route)
      .evaluate()
      .setTitle("Contabilidad cruzada")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    console.error("error: ",  err );
    return HtmlService.createTemplateFromFile("index")
      .evaluate()
      .setTitle("Contabilidad cruzada")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// Funcion GLOBAL para importal templates HTML
function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}


function getPageUrl(){
  return ScriptApp.getService().getUrl();
}
