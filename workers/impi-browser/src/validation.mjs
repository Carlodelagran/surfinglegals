/**
 * Strict validation of a user-selected MARCANET phonetic search.
 * All records are only a browser capture until legally reviewed.
 */
export const REFERENCE = Object.freeze({marca:"RETRO GAME FEST",clase:"41"});
const REFERENCE_ROWS=[["2220564","RETRO GAME"],["2220543","RETRO GAME"],["1352323","GAME FEST"]];
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().trim();
export function queryFromInput(input){
  const marca=typeof input?.marca==="string"?input.marca.trim():"";
  const clase=String(input?.clase??"").trim();
  if(marca.length<3||marca.length>100||!/^([1-9]|[1-3][0-9]|4[0-5])$/.test(clase)||
     /[\u0000-\u001f\u007f]/.test(marca))
    throw Error("consulta_invalida");
  return {marca,clase};
}
export function allowedQuery(query,env){
  if(query.marca===REFERENCE.marca&&query.clase===REFERENCE.clase)return true;
  // Other queries are disabled unless explicitly listed by the operator.
  // Format: 'MARCA|41;OTRA MARCA|35' (up to 3 entries).
  const raw=String(env?.SL_IMPI_PILOT_ALLOWED_QUERIES||"").trim();
  if(raw.length>400)return false;
  const pairs=raw.split(";").filter(Boolean);
  if(pairs.length>3)return false;
  return pairs.some(pair=>{
    const [name,clase,extra]=pair.split("|");
    return !extra&&normalize(name)===normalize(query.marca)&&clase===query.clase;
  });
}
export function officialPage(url){
  try{
    const u=new URL(url);
    return u.protocol==="https:"&&u.hostname==="acervomarcas.impi.gob.mx"&&
      u.port==="8181"&&!u.username&&!u.password;
  }catch{return false;}
}
export function verifyRows(rows,query,{officialCount}={}){
  if(!Array.isArray(rows)||rows.length>3000)throw Error("resultados_no_validables");
  if(officialCount!==undefined&&officialCount!==null){
    if(!Number.isSafeInteger(officialCount)||officialCount!==rows.length)
      throw Error("conteo_no_coincidente");
  }
  const numbers=new Set();
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    if(!r||r.orden_original!==i+1||!/^[0-9]{1,20}$/.test(String(r.expediente))||
      !String(r.denominacion||"").trim()||
      !String(r.clase||"").split(/[,;\/\s]+/).includes(query.clase))
      throw Error("fila_invalida");
    if(numbers.has(r.expediente))throw Error("expediente_duplicado");
    numbers.add(r.expediente);
  }
  if(query.marca===REFERENCE.marca&&query.clase===REFERENCE.clase){
    if(rows.length!==297)throw Error("referencia_incompleta");
    for(let i=0;i<REFERENCE_ROWS.length;i++){
      if(String(rows[i].expediente)!==REFERENCE_ROWS[i][0] ||
         normalize(rows[i].denominacion)!==REFERENCE_ROWS[i][1])
        throw Error("referencia_distinta");
    }
  }
  return rows;
}
