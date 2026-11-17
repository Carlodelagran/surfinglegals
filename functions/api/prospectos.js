/**
 * Cloudflare Pages Function: POST /api/prospectos
 *
 * Requires env.SL_APPS_SCRIPT_URL, env.SL_INGEST_TOKEN,
 * env.SL_ALLOWED_ORIGINS, env.SL_PRIVACY_VERSION,
 * env.TURNSTILE_SECRET.
 * Install only with explicit deployment configuration and privacy notice.
 */
const reply=(data,status)=>new Response(JSON.stringify(data),{
  status,
  headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
    "x-content-type-options":"nosniff"}
});
const allowed=(origin,env)=>{
  const sources=(env.SL_ALLOWED_ORIGINS||"https://surfinglegals.com,https://www.surfinglegals.com")
    .split(",").map(x=>x.trim()).filter(Boolean);
  return !!origin && sources.includes(origin);
};
function clean(v,max){return typeof v==="string"?v.trim().slice(0,max):"";}
export async function onRequestPost({request,env}){
  try{
    if(!env.SL_APPS_SCRIPT_URL||!env.SL_INGEST_TOKEN||!env.TURNSTILE_SECRET||!env.SL_PRIVACY_VERSION){
      return reply({ok:false,error:"service_unavailable"},503);
    }
    const origin=request.headers.get("origin");
    if(!allowed(origin,env))return reply({ok:false,error:"origin_not_allowed"},403);
    if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
      return reply({ok:false,error:"invalid_content_type"},415);
    const len=Number(request.headers.get("content-length")||0);
    if(len>12000)return reply({ok:false,error:"payload_too_large"},413);
    const raw=await request.text();
    if(raw.length>12000)return reply({ok:false,error:"payload_too_large"},413);
    const p=JSON.parse(raw);
    if(p.schema!=="sl.lead.marca.v1")return reply({ok:false,error:"invalid_schema"},400);
    const mark=clean(p.marca,100),services=clean(p.productos_servicios,600),
      name=clean(p.nombre_contacto,100),email=clean(p.correo_contacto,160);
    if(!mark||!services||!name||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return reply({ok:false,error:"invalid_fields"},400);
    // Fase piloto: únicamente se aceptan datos sintéticos en el dominio de pruebas.
    // La recepción de clientes reales requiere una decisión posterior de activación.
    const previewOrigin="https://feature-consulta-marca-v1.surfinglegals.pages.dev";
    if(origin!==previewOrigin)
      return reply({ok:false,error:"pilot_preview_only"},403);
    if(mark!=="PRUEBA INTERNA - MARCA DEMO" ||
       services!=="Solicitud técnica ficticia sin datos de clientes." ||
       name!=="Prospecto Ficticio" || email!=="prueba-interna@example.com")
      return reply({ok:false,error:"pilot_synthetic_only"},403);
    if(p.aviso_version!==env.SL_PRIVACY_VERSION)
      return reply({ok:false,error:"privacy_required"},400);
    if(!/^[0-9a-fA-F-]{36}$/.test(clean(p.request_id,80)))
      return reply({ok:false,error:"invalid_request_id"},400);
    const captcha=clean(p.turnstile_token,3000);
    if(!captcha)return reply({ok:false,error:"captcha_required"},400);
    const check=new FormData();
    check.set("secret",env.TURNSTILE_SECRET);
    check.set("response",captcha);
    const ip=request.headers.get("CF-Connecting-IP");
    if(ip)check.set("remoteip",ip);
    const verdict=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {method:"POST",body:check,signal:AbortSignal.timeout(8000)});
    const siteverify=await verdict.json().catch(()=>null);
    if(!verdict.ok || !siteverify?.success){
      // Only the official, non-secret Turnstile error codes are revealed for pilot troubleshooting.
      const codes=Array.isArray(siteverify?.["error-codes"]) ? siteverify["error-codes"] : [];
      const permitted=new Set(["missing-input-secret","invalid-input-secret","missing-input-response",
        "invalid-input-response","bad-request","timeout-or-duplicate","internal-error"]);
      const diagnostics=codes.filter(code=>permitted.has(code));
      return reply({ok:false,error:"captcha_invalid",diagnostic:diagnostics},403);
    }
    const lead={
      schema:p.schema,marca:mark,productos_servicios:services,
      nombre_contacto:name,correo_contacto:email,
      etapa:clean(p.etapa,50),origen_url:origin+"/servicios/consulta-marca/",
      request_id:p.request_id,
      aviso_version:p.aviso_version,aviso_puesto_a_disposicion_en:new Date().toISOString()
    };
    // Redirects from Apps Script ContentService may reach script.googleusercontent.com.
    // Never send secrets to an unvalidated destination.
    const target=new URL(env.SL_APPS_SCRIPT_URL);
    if(target.protocol!=="https:"||target.hostname!=="script.google.com"||
       !target.pathname.startsWith("/macros/s/"))
      return reply({ok:false,error:"invalid_backend_url"},503);
    const upstream=await fetch(target.toString(),{
      method:"POST",headers:{"content-type":"text/plain;charset=UTF-8"},
      body:JSON.stringify({token:env.SL_INGEST_TOKEN,lead}),
      signal:AbortSignal.timeout(15000),
      redirect:"follow"
    });
    if(!upstream.ok)return reply({ok:false,error:"backend_failure"},502);
    const data=await upstream.json().catch(()=>null);
    if(!data?.ok || !/^WEB-MARCA-/.test(data.id||""))
      return reply({ok:false,error:"not_confirmed"},502);
    return reply({ok:true,id:data.id,duplicate:!!data.duplicate},200);
  }catch(err){
    console.error("Lead intake failed",String(err?.message||err));
    return reply({ok:false,error:"temporary_failure"},503);
  }
}
export function onRequestGet(){return reply({ok:false,error:"method_not_allowed"},405);}
