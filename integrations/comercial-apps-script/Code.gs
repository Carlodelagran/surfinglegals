/**
 * Surfing Legals — receptor de prospectos en Apps Script.
 * Proyecto independiente de SIGES. Instalar como Apps Script ligado a
 * la hoja "SL - Inteligencia Comercial - PRUEBA V1".
 *
 * Se requieren propiedades de script:
 *   SL_SHEET_ID: ID de la hoja comercial
 *   SL_INGEST_TOKEN: secreto aleatorio de al menos 32 caracteres (no publicar)
 *
 * Este código no despliega por sí solo un endpoint ni cambia SIGES.
 */
const FIELDS = Object.freeze([
  'ID','FechaAlta','Nombre','Empresa','Unidad','Servicio','Canal','OrigenURL',
  'Email','Telefono','Estado','Prioridad','SiguienteAccion','FechaSeguimiento',
  'Notas','Actualizado'
]);
function output_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function clean_(v,max) {
  return String(v == null ? '' : v).trim().slice(0,max).replace(/[\u0000-\u001f\u007f]/g,' ');
}
function cellSafe_(v,max) {
  const s=clean_(v,max);
  return /^[=+\-@]/.test(s) ? "'"+s : s;
}
function validate_(p) {
  if (!p || typeof p!=='object') throw Error('Solicitud inválida');
  if (p.schema!=='sl.lead.marca.v1') throw Error('Versión no admitida');
  const marca=clean_(p.marca,100), servicios=clean_(p.productos_servicios,600);
  const nombre=clean_(p.nombre_contacto,100), correo=clean_(p.correo_contacto,160);
  const etapa=clean_(p.etapa,50), source=clean_(p.origen_url,300);
  const accepted=p.acepto_privacidad===true;
  if (!marca || !servicios || !nombre || !correo || !accepted) throw Error('Faltan datos obligatorios o aceptación de privacidad');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) throw Error('Correo no válido');
  if (!/^https:\/\/(?:www\.)?surfinglegals\.com(?:\/|$)/i.test(source)) throw Error('Origen no autorizado');
  if (typeof p.aviso_version!=='string' || !p.aviso_version.trim()) throw Error('Falta versión del aviso de privacidad');
  const requestId=clean_(p.request_id,80);
  if (!/^[0-9a-fA-F-]{36}$/.test(requestId)) throw Error('Identificador de envío inválido');
  return {marca,servicios,nombre,correo,etapa,source,requestId,
    aviso:clean_(p.aviso_version,60),acceptedAt:clean_(p.aceptado_en,40)};
}
function doPost(e) {
  try {
    const props=PropertiesService.getScriptProperties();
    const token=props.getProperty('SL_INGEST_TOKEN');
    const id=props.getProperty('SL_SHEET_ID');
    if(!token || token.length<32 || !id) return output_({ok:false,error:'backend_not_configured'});
    const body=e && e.postData && e.postData.contents;
    if(!body || body.length>12000) return output_({ok:false,error:'invalid_body'});
    const raw=JSON.parse(body);
    if(raw.token!==token) return output_({ok:false,error:'unauthorized'});
    const p=validate_(raw.lead);
    const lock=LockService.getScriptLock();
    if(!lock.tryLock(10000)) return output_({ok:false,error:'temporarily_busy'});
    try {
      const sheet=SpreadsheetApp.openById(id).getSheetByName('PROSPECTOS');
      if(!sheet) return output_({ok:false,error:'sheet_missing'});
      const head=sheet.getRange(1,1,1,FIELDS.length).getDisplayValues()[0];
      if(FIELDS.some((v,i)=>head[i]!==v))return output_({ok:false,error:'schema_mismatch'});
      const last=sheet.getLastRow();
      const existing=last>1?sheet.getRange(2,1,last-1,1).getValues().flat():[];
      const leadId='WEB-MARCA-'+p.requestId;
      if(existing.includes(leadId))return output_({ok:true,id:leadId,duplicate:true});
      const now=new Date();
      const row=[
        leadId,now,p.nombre,'','Marcas','Registro de marca','Web - Consulta preliminar',
        cellSafe_(p.source,300),cellSafe_(p.correo,160),'',
        'Nuevo','Normal','Contactar para diagnóstico','',
        cellSafe_('Marca: '+p.marca+' | Productos/servicios: '+p.servicios+' | Etapa: '+p.etapa+
          ' | Privacidad: '+p.aviso+' | Aceptada: '+p.acceptedAt,1500),now
      ];
      sheet.appendRow(row);
      SpreadsheetApp.flush();
      return output_({ok:true,id:leadId,duplicate:false});
    } finally {lock.releaseLock();}
  } catch(error) {
    console.error('Error en receptor: '+String(error));
    return output_({ok:false,error:'request_failed'});
  }
}

/**
 * Ejecutar manualmente desde el editor Apps Script antes de implementar.
 * Solo comprueba configuración y encabezados; NO escribe prospectos.
 */
function comprobarConfiguracion() {
  const properties=PropertiesService.getScriptProperties();
  const id=properties.getProperty('SL_SHEET_ID');
  const token=properties.getProperty('SL_INGEST_TOKEN');
  const estado={
    hojaConfigurada:!!id,
    tokenConfigurado:!!token && token.length>=32,
    pestanaExiste:false,
    encabezadosCorrectos:false
  };
  if(id){
    const sheet=SpreadsheetApp.openById(id).getSheetByName('PROSPECTOS');
    estado.pestanaExiste=!!sheet;
    if(sheet){
      const headers=sheet.getRange(1,1,1,FIELDS.length).getDisplayValues()[0];
      estado.encabezadosCorrectos=FIELDS.every((name,i)=>headers[i]===name);
    }
  }
  console.log(JSON.stringify(estado));
  return estado;
}
