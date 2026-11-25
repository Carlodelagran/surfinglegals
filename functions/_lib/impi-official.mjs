/**
 * IMPI broker contract — only accepts attributable records from an approved
 * official source. It does NOT implement or imply an official IMPI API.
 */
const officialHost=h=>h==="impi.gob.mx"||h.endsWith(".impi.gob.mx");
export function officialUrl(value){
  try{
    const u=new URL(value);
    return u.protocol==="https:" && !u.username && !u.password && officialHost(u.hostname.toLowerCase()) && (!u.port || (u.hostname.toLowerCase()==="acervomarcas.impi.gob.mx"&&u.port==="8181"));
  }catch{return false;}
}
export function validateQuery(payload){
  if(!payload||typeof payload!=="object")throw Error("invalid_query");
  const marca=typeof payload.marca==="string"?payload.marca.trim():"";
  const clase=String(payload.clase??"").trim();
  if(marca.length<3||marca.length>100||!/^[1-9]$|^[1-3][0-9]$|^4[0-5]$/.test(clase))throw Error("invalid_query");
  if(/[\u0000-\u001f]/.test(marca))throw Error("invalid_query");
  return {marca,clase};
}
export function validateOfficialResponse(data,query){
  if(!data||data.schema!=="sl.impi.proveedor.oficial.v1")throw Error("unverified_format");
  if(data.origen!=="IMPI"||!officialUrl(data.fuente_url)||!officialUrl(data.consulta_url))throw Error("unverified_source");
  if(String(data.clase)!==query.clase || String(data.marca).normalize("NFC").toUpperCase()!==query.marca.normalize("NFC").toUpperCase())throw Error("query_mismatch");
  if(!Array.isArray(data.antecedentes)||data.antecedentes.length>3000 ||
      !Number.isInteger(data.total) || data.total!==data.antecedentes.length)throw Error("incomplete_results");
  if(typeof data.consultado_en!=="string" || Number.isNaN(Date.parse(data.consultado_en)))throw Error("invalid_timestamp");
  // Proof is tied to a request-specific official response; no generic demo fixtures.
  const records=data.antecedentes.map(r=>{
    if(!r||typeof r.denominacion!=="string"||!r.denominacion.trim()||
        !/^[0-9]{1,20}$/.test(String(r.expediente||"")) ||
        !Array.isArray(r.clases) || !r.clases.map(String).includes(query.clase) ||
        !officialUrl(r.expediente_url))throw Error("unverified_record");
    return {denominacion:r.denominacion.trim().slice(0,200),
      expediente:String(r.expediente),titular:String(r.titular||"").slice(0,250),
      clases:r.clases.map(String),registro:r.registro?String(r.registro):null,
      expediente_url:r.expediente_url,
      estatus:r.estatus_verificado?String(r.estatus_verificado):null};
  });
  if(new Set(records.map(x=>x.expediente)).size!==records.length)throw Error("duplicate_records");
  return {schema:"sl.impi.respuesta.v1",marca:query.marca,clase:query.clase,
    fuente:"IMPI",fuente_url:data.fuente_url,consulta_url:data.consulta_url,
    consultado_en:data.consultado_en,total:records.length,
    antecedentes:records,
    advertencia:"Los antecedentes requieren cotejo jurídico de servicios, vigencias y semejanza. La consulta no determina registrabilidad."};
}
