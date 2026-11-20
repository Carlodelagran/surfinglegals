/**
 * Preview-only gateway from the Surfing Legals laboratory to a separate
 * browser-controlled MARCANET Worker. Disabled until the lab is deployed.
 * Never trusts upstream data solely because it returned HTTP 200.
 */
import {validateQuery} from "../../_lib/impi-official.mjs";
const preview="feature-consulta-marca-v1.surfinglegals.pages.dev";
const reply=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{"content-type":"application/json; charset=utf-8",
   "cache-control":"no-store","x-content-type-options":"nosniff"}
});
function allowedWorkerUrl(value){
 try{
  const url=new URL(value);
  return url.protocol==="https:"&&!url.port&&!url.username&&!url.password&&
    /^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)&&
    (url.pathname==="/"||url.pathname==="")&&!url.search&&!url.hash;
 }catch{return false;}
}
const disabled=()=>reply({ok:false,estado:"no_disponible",
 mensaje:"La búsqueda automática del IMPI todavía no está habilitada en este laboratorio."},503);
export const onRequestGet=()=>disabled();
export async function onRequestPost({request,env}){
 const target=new URL(request.url);
 if(target.hostname!==preview||request.headers.get("origin")!=="https://"+preview)
  return reply({ok:false,error:"solo_preview"},403);
 if(env.SL_IMPI_BROWSER_ENABLED!=="true"||
   !allowedWorkerUrl(env.SL_IMPI_BROWSER_URL)||!env.SL_IMPI_PILOT_KEY||
   !env.TURNSTILE_SECRET)return disabled();
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
  return reply({ok:false,error:"contenido_invalido"},415);
 if(Number(request.headers.get("content-length")||0)>5000)
  return reply({ok:false,error:"peticion_grande"},413);
 const raw=await request.text();
 if(raw.length>5000)return reply({ok:false,error:"peticion_grande"},413);
 let data,query;
 try{
  data=JSON.parse(raw);
  query=validateQuery(data);
 }catch{return reply({ok:false,error:"consulta_invalida"},422);}
 if(typeof data.turnstile_token!=="string"||!data.turnstile_token||
   data.turnstile_token.length>3000)return reply({ok:false,error:"verificacion_requerida"},400);
 try{
  const form=new FormData();
  form.set("secret",env.TURNSTILE_SECRET);
  form.set("response",data.turnstile_token);
  const ip=request.headers.get("CF-Connecting-IP");
  if(ip)form.set("remoteip",ip);
  const verify=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",
   {method:"POST",body:form,signal:AbortSignal.timeout(10000)});
  if(!verify.ok||!(await verify.json()).success)
   return reply({ok:false,error:"verificacion_fallida"},403);
  const url=new URL(env.SL_IMPI_BROWSER_URL);
  url.pathname="/internal/consulta";
  const res=await fetch(url.toString(),{
    method:"POST",redirect:"manual",signal:AbortSignal.timeout(90000),
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+env.SL_IMPI_PILOT_KEY},
    body:JSON.stringify(query)
  });
  if(res.status!==200||!(res.headers.get("content-type")||"").includes("application/json"))
    return disabled();
  const result=await res.json();
  if(!result||result.ok!==true||result.schema!=="sl.impi.captura.navegador.v1"||
      result.marca!==query.marca||result.clase!==query.clase||
      !/^https:\/\/acervomarcas\.impi\.gob\.mx:8181\//.test(result.fuente_url)||
      !Array.isArray(result.antecedentes)||!Number.isInteger(result.total_capturado)||
      result.total_capturado!==result.antecedentes.length||
      result.antecedentes.length>3000)return disabled();
  const seen=new Set();
  for(let i=0;i<result.antecedentes.length;i++){
   const a=result.antecedentes[i];
   if(!a||a.orden_original!==i+1||!/^\d{1,20}$/.test(String(a.expediente))||
      !String(a.denominacion||"").trim()||
      !String(a.clase||"").split(/[,;\/\s]+/).includes(query.clase)||
      seen.has(String(a.expediente)))return disabled();
   seen.add(String(a.expediente));
  }
  return reply({ok:true,marca:query.marca,clase:query.clase,
    fuente:"MARCANET / IMPI (captura de navegador)",fecha_consulta:result.fecha_consulta,
    fuente_url:result.fuente_url,total_capturado:result.total_capturado,
    totalidad_verificada:result.totalidad_verificada===true,
    antecedentes:result.antecedentes.slice(0,25).map(a=>({
      orden:a.orden_original,denominacion:String(a.denominacion).slice(0,220),
      expediente:String(a.expediente),registro:String(a.registro||"").slice(0,35),
      titular:String(a.titular||"").slice(0,300),clase:String(a.clase).slice(0,80)})),
    advertencia:"Son antecedentes obtenidos por consulta automatizada. No acredita el estado jurídico de cada expediente ni determina registrabilidad."});
 }catch(e){
  console.error("IMPI lab gateway:",String(e?.message||e));
  return disabled();
 }
}
