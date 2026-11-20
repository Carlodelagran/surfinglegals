/**
 * Pilot browser-powered MARCANET capture for the internal Surfing Legals lab.
 * It does not file an IMPI action or determine registrability.
 */
import {launch} from "@cloudflare/playwright";
import {REFERENCE,queryFromInput,allowedQuery,officialPage,verifyRows}
  from "./validation.mjs";

const FORM_URL="https://acervomarcas.impi.gob.mx:8181/marcanet/vistas/common/datos/bsqFoneticaCompleta.pgi";
const respond=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store",
 "x-content-type-options":"nosniff","access-control-allow-origin":"null"}
});
const getColumns=cols=>{
 const n=cols.map(v=>String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase());
 const find=re=>n.findIndex(x=>re.test(x));
 return {orden:find(/^(#|ORDEN|NUMERO)$/),denominacion:find(/DENOMINACION/),
  expediente:find(/^EXPEDIENTE$/),titular:find(/^TITULAR$/),registro:find(/^REGISTRO$/),
  clase:find(/^CLASE$/)};
};
async function search(env,query){
 const browser=await launch(env.BROWSER);
 try{
  const page=await browser.newPage();
  console.log("IMPI etapa: navegando");
  const response=await page.goto(FORM_URL,{waitUntil:"domcontentloaded",timeout:45000});
  console.log("IMPI etapa: navegacion",JSON.stringify({http:response?.status(),url:page.url(),titulo:(await page.title()).slice(0,120)}));
  if(!officialPage(page.url()))throw Error("fuente_no_oficial");
  const cl=page.locator('[id="frmBsqFonetica:clases"]');
  const den=page.locator('[id="frmBsqFonetica:denominacion"]');
  console.log("IMPI etapa: esperando formulario");
  await cl.waitFor({state:"visible",timeout:15000});
  console.log("IMPI etapa: formulario visible");
  await cl.fill(query.clase);
  console.log("IMPI etapa: clase capturada");
  await den.fill(query.marca);
  console.log("IMPI etapa: denominacion capturada");
  console.log("IMPI etapa: verificando campos");
  if((await cl.inputValue()).trim()!==query.clase ||
     (await den.inputValue()).trim()!==query.marca)throw Error("consulta_no_coincidente");
  console.log("IMPI etapa: pulsando buscar");
  await page.locator('[id="frmBsqFonetica:busquedaId2"]').click({timeout:20000});
  console.log("IMPI etapa: esperando tabla");
  await page.waitForFunction(()=>{
    return [...document.querySelectorAll("table")].some(t=>{
      const h=[...t.querySelectorAll(":scope > thead > tr > th")].map(x=>x.textContent.toUpperCase());
      return h.some(x=>x.includes("DENOMINACI"))&&h.some(x=>x.includes("EXPEDIENTE"))&&
        t.querySelectorAll(":scope > tbody > tr").length>0;
    });
  },null,{timeout:45000});
  console.log("IMPI etapa: tabla detectada",JSON.stringify({url:page.url()}));
  if(!officialPage(page.url()))throw Error("fuente_no_oficial");
  // PrimeFaces can replace form fields after AJAX. Inputs were checked before click;
  // result count and reference expediente identities are validated below.
  console.log("IMPI etapa: extrayendo filas");
  const data=await page.locator("table").evaluateAll(tables=>{
    for(const t of tables){
      const headers=[...t.querySelectorAll(":scope > thead > tr > th")].map(x=>(x.textContent||"").trim());
      if(!headers.some(x=>/denominaci[oó]n/i.test(x))||
         !headers.some(x=>/expediente/i.test(x)))continue;
      const rows=[...t.querySelectorAll(":scope > tbody > tr")].map(tr=>
        [...tr.querySelectorAll(":scope > td")].map(td=>(td.textContent||"").trim()));
      if(rows.length)return {headers,rows};
    }
    return null;
  });
  if(!data)throw Error("tabla_no_encontrada");
  const cols=getColumns(data.headers);
  if(["denominacion","expediente","titular","clase"].some(k=>cols[k]<0))
    throw Error("columnas_incompletas");
  const rows=data.rows.map((r,i)=>({
    orden_original:cols.orden<0?i+1:Number(r[cols.orden]),
    denominacion:r[cols.denominacion]||"",
    expediente:r[cols.expediente]||"",
    titular:r[cols.titular]||"",
    registro:cols.registro<0?"":r[cols.registro]||"",
    clase:r[cols.clase]||""
  }));
  verifyRows(rows,query);
  const reference=query.marca===REFERENCE.marca&&query.clase===REFERENCE.clase;
  return {ok:true,schema:"sl.impi.captura.navegador.v1",
    fuente:"MARCANET — consulta automatizada al sitio web del IMPI",
    fuente_url:page.url(),fecha_consulta:new Date().toISOString(),
    marca:query.marca,clase:query.clase,
    total_capturado:rows.length,
    totalidad_verificada:reference,
    antecedentes:rows,
    advertencia:reference
      ? "297 filas verificadas contra el caso de referencia. Sin validación individual de estatus, vigencia ni registrabilidad."
      : "Resultados capturados en navegador. No se ha confirmado el conteo total oficial ni revisado los estatus. No se puede inferir disponibilidad o registrabilidad."};
 }finally{await browser.close();}
}
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname==="/health"&&request.method==="GET")
    return respond({ok:true,estado:"piloto_cerrado",busqueda_referencia:REFERENCE.marca,
      disponibilidad:"no confirma acceso del IMPI ni configuración del navegador"});
  if(u.pathname!=="/internal/consulta"||request.method!=="POST")
    return respond({ok:false,error:"not_found"},404);
  if(!env.SL_IMPI_PILOT_KEY||!env.BROWSER)
    return respond({ok:false,error:"disabled"},503);
  if(request.headers.get("authorization")!=="Bearer "+env.SL_IMPI_PILOT_KEY)
    return respond({ok:false,error:"forbidden"},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return respond({ok:false,error:"invalid_content_type"},415);
  if(Number(request.headers.get("content-length")||0)>1000)
    return respond({ok:false,error:"too_large"},413);
  const body=await request.text();
  if(body.length>1000)return respond({ok:false,error:"too_large"},413);
  let query;
  try{query=queryFromInput(JSON.parse(body));}
  catch{return respond({ok:false,error:"consulta_invalida"},422);}
  if(!allowedQuery(query,env))
    return respond({ok:false,error:"consulta_no_autorizada_en_piloto"},422);
  try{return respond(await search(env,query));}
  catch(e){
    console.error("IMPI pilot:",String(e?.message||e));
    return respond({ok:false,error:"consulta_no_confirmada",
      mensaje:"MARCANET no entregó resultados completos y validados en esta ejecución."},503);
  }
 }
};
