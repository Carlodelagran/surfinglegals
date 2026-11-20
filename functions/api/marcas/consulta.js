import {officialUrl,validateQuery,validateOfficialResponse} from "../../_lib/impi-official.mjs";
const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store",
    "x-content-type-options":"nosniff"}
});
const preview="feature-consulta-marca-v1.surfinglegals.pages.dev";
const unavailable=()=>json({ok:false,estado:"no_disponible",error:"fuente_oficial_no_conectada",
  mensaje:"La consulta automatizada al IMPI todavía no está habilitada. No se mostrarán resultados simulados."},503);
export function onRequestGet(){return unavailable();}
export async function onRequestPost({request,env}){
  // Pilot route must never run on the production hostname or an arbitrary preview.
  const target=new URL(request.url);
  if(target.hostname!==preview || request.headers.get("origin")!=="https://"+preview)
    return json({ok:false,error:"preview_only"},403);
  if(env.IMPI_OFFICIAL_PROVIDER_ENABLED!=="true")return unavailable();
  if(!officialUrl(env.IMPI_OFFICIAL_API_URL)||!env.IMPI_OFFICIAL_API_KEY||
      !env.TURNSTILE_SECRET)return unavailable();
  try{
    if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
      return json({ok:false,error:"invalid_content_type"},415);
    if(Number(request.headers.get("content-length")||0)>8000)return json({ok:false,error:"payload_too_large"},413);
    const raw=await request.text();
    if(raw.length>8000)return json({ok:false,error:"payload_too_large"},413);
    const input=JSON.parse(raw),query=validateQuery(input);
    const captcha=typeof input.turnstile_token==="string"?input.turnstile_token:"";
    if(!captcha || captcha.length>3000)return json({ok:false,error:"captcha_required"},400);
    const check=new FormData();
    check.set("secret",env.TURNSTILE_SECRET);
    check.set("response",captcha);
    const ip=request.headers.get("CF-Connecting-IP");
    if(ip)check.set("remoteip",ip);
    const verdict=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {method:"POST",body:check,redirect:"error",signal:AbortSignal.timeout(8000)});
    if(!verdict.ok || !(await verdict.json()).success)return json({ok:false,error:"captcha_invalid"},403);
    // IMPI_OFFICIAL_API_URL is intentionally unset. It must be a documented,
    // authorized official API endpoint before this route is enabled.
    const upstream=await fetch(env.IMPI_OFFICIAL_API_URL,{
      method:"POST",redirect:"manual",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+env.IMPI_OFFICIAL_API_KEY},
      body:JSON.stringify({denominacion:query.marca,clase:query.clase}),
      signal:AbortSignal.timeout(20000)
    });
    if(upstream.status!==200)return unavailable();
    const type=upstream.headers.get("content-type")||"";
    if(!type.toLowerCase().includes("application/json"))return unavailable();
    const data=await upstream.json();
    const result=validateOfficialResponse(data,query);
    return json({ok:true,...result});
  }catch(err){
    console.error("Official IMPI provider unavailable:",String(err?.message||err));
    return unavailable();
  }
}
