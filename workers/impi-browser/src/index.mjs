/**
 * Browser Run pilot. Separate from Cloudflare Pages production and SIGES.
 * Only the known reference query is accepted until explicitly unlocked.
 * This is intentionally NOT an API for visitors yet.
 */
import { launch } from "@cloudflare/playwright";

const FORM_URL="https://acervomarcas.impi.gob.mx:8181/marcanet/vistas/common/datos/bsqFoneticaCompleta.pgi";
const EXPECTED=[["2220564","RETRO GAME"],["2220543","RETRO GAME"],["1352323","GAME FEST"]];
const REF={marca:"RETRO GAME FEST",clase:"41"};

const respond=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store",
 "x-content-type-options":"nosniff","access-control-allow-origin":"null"}
});
function isOfficial(url){
 const u=new URL(url);
 return u.protocol==="https:"&&u.hostname==="acervomarcas.impi.gob.mx"&&u.port==="8181";
}
function validate(rows,marca,clase){
 if(!Array.isArray(rows)||rows.length===0||rows.length>3000)throw Error("resultados_incompletos");
 if(rows.some((r,i)=>r.orden_original!==i+1||!/^[0-9]{1,20}$/.test(r.expediente)||
   !r.denominacion || !r.clase.split(/[,;\/\s]+/).includes(clase)))throw Error("resultados_invalidos");
 if(new Set(rows.map(r=>r.expediente)).size!==rows.length)throw Error("expedientes_duplicados");
 if(marca===REF.marca&&clase===REF.clase){
   if(rows.length!==297)throw Error("conteo_no_coincidente");
   for(let i=0;i<3;i++)if(rows[i].expediente!==EXPECTED[i][0]||
     rows[i].denominacion.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase()!==EXPECTED[i][1])
     throw Error("antecedentes_referencia_no_coinciden");
 }
 return rows;
}
async function search(env){
 const browser=await launch(env.BROWSER);
 try{
  const page=await browser.newPage();
  await page.goto(FORM_URL,{waitUntil:"domcontentloaded",timeout:45000});
  if(!isOfficial(page.url()))throw Error("fuente_no_oficial");
  const cl=page.locator('[id="frmBsqFonetica:clases"]');
  const den=page.locator('[id="frmBsqFonetica:denominacion"]');
  await cl.waitFor({state:"visible",timeout:15000});
  await cl.fill(REF.clase);await den.fill(REF.marca);
  if(await cl.inputValue()!==REF.clase||await den.inputValue()!==REF.marca)throw Error("consulta_no_coincidente");
  await page.locator('[id="frmBsqFonetica:busquedaId2"]').click({timeout:20000});
  await page.waitForFunction(()=>{
    return [...document.querySelectorAll("table")].some(t=>{
      const h=[...t.querySelectorAll(":scope > thead > tr > th")].map(x=>x.textContent.toUpperCase());
      return h.some(x=>x.includes("DENOMINACI"))&&h.some(x=>x.includes("EXPEDIENTE"))&&
        t.querySelectorAll(":scope > tbody > tr").length>0;
    });
  },null,{timeout:45000});
  if(!isOfficial(page.url()))throw Error("fuente_no_oficial");
  const data=await page.locator("table").evaluateAll(tables=>{
    for(const t of tables){
      const headers=[...t.querySelectorAll(":scope > thead > tr > th")].map(x=>(x.textContent||"").trim());
      if(!headers.some(x=>/denominaci[oó]n/i.test(x))||!headers.some(x=>/expediente/i.test(x)))continue;
      const rows=[...t.querySelectorAll(":scope > tbody > tr")].map(tr=>
        [...tr.querySelectorAll(":scope > td")].map(td=>(td.textContent||"").trim()));
      if(rows.length)return {headers,rows};
    }
    return null;
  });
  if(!data)throw Error("tabla_no_encontrada");
  const keys=data.headers.map(x=>x.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase());
  const find=re=>keys.findIndex(k=>re.test(k));
  const cols={orden:find(/^#|^ORDEN$/),denominacion:find(/DENOMINACION/),
    expediente:find(/^EXPEDIENTE$/),titular:find(/^TITULAR$/),
    registro:find(/^REGISTRO$/),clase:find(/^CLASE$/)};
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
  validate(rows,REF.marca,REF.clase);
  return {ok:true,schema:"sl.impi.captura.navegador.v1",
    fuente:"MARCANET (consulta por navegador, sin certificación de estatus individual)",
    fuente_url:page.url(),fecha_consulta:new Date().toISOString(),
    marca:REF.marca,clase:REF.clase,total:rows.length,antecedentes:rows,
    advertencia:"Los datos no acreditan vigencia, ni determinan registrabilidad. Verificar fichas, servicios y actuaciones."};
 }finally{await browser.close();}
}
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname==="/health"&&request.method==="GET")
    return respond({ok:true,estado:"piloto_cerrado",búsqueda:"solo_referencia"});
  if(u.pathname!=="/internal/consulta"||request.method!=="POST")
    return respond({ok:false,error:"not_found"},404);
  // No secret means not enabled, regardless of deployment.
  if(!env.SL_IMPI_PILOT_KEY||!env.BROWSER)return respond({ok:false,error:"disabled"},503);
  // Never authorize browser or user-origin requests directly.
  const authorization=request.headers.get("authorization")||"";
  if(authorization!=="Bearer "+env.SL_IMPI_PILOT_KEY)
    return respond({ok:false,error:"forbidden"},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))
    return respond({ok:false,error:"invalid_content_type"},415);
  const body=await request.text();
  if(body.length>1000)return respond({ok:false,error:"too_large"},413);
  let data;
  try{data=JSON.parse(body);}catch{return respond({ok:false,error:"invalid_json"},400);}
  if(data?.marca!==REF.marca||String(data?.clase)!==REF.clase)
    return respond({ok:false,error:"pilot_reference_only"},422);
  try{return respond(await search(env));}
  catch(e){console.error("IMPI pilot:",String(e?.message||e));
    return respond({ok:false,error:"consulta_no_confirmada",mensaje:"El IMPI no entregó resultados completos y verificados en esta ejecución."},503);}
 }
};
