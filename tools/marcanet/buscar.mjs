/**
 * Surfing Legals | MARCANET automation proof-of-concept.
 *
 * Experimental: the selectors and site flow MUST be validated on a live browser.
 * No bypass of security controls, no excessive retries and no modification of IMPI data.
 *
 * Usage:
 *   npm install
 *   npm run buscar -- --clase 41 --marca "RETRO GAME FEST"
 *
 * Requires Node.js 20+ and Playwright Chromium installed.
 * The interactive browser is deliberately visible, so the operator can supervise.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const ORIGIN = "https://acervomarcas.impi.gob.mx:8181/";
function flag(name) {
  const i=process.argv.indexOf("--"+name);
  return i<0?"":(process.argv[i+1]||"").trim();
}
const clase=flag("clase"), marca=flag("marca");
if(!/^(?:[1-9]|[1-3][0-9]|4[0-5])$/.test(clase) || !marca || marca.length>120) {
  console.error('Uso: npm run buscar -- --clase 41 --marca "RETRO GAME FEST"');
  process.exit(2);
}
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const folder=resolve("evidencia",stamp);
await mkdir(folder,{recursive:true});
const history=[];
let currentStep="inicialización";
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({acceptDownloads:true,locale:"es-MX"});
const page=await context.newPage();
const report={fuente:ORIGIN,marca,clase,startedAt:new Date().toISOString(),status:"running",history,downloads:[],notice:"Flujo experimental; evidencia pendiente de verificación de origen"};
const record=async(step,detail)=>{
  history.push({step,detail,time:new Date().toISOString(),url:page.url()});
  console.log("[" + step + "] " + detail);
};
async function snapshot(step){
  try {
    const name=step.replace(/[^a-z0-9_-]/gi,"_")+".png";
    await page.screenshot({path:join(folder,name),fullPage:true});
    await record("screenshot",name);
  } catch (e) {await record("screenshot_error",String(e.message));}
}
async function firstVisible(locators,description){
  for(const loc of locators) {
    if(await loc.count()===1 && await loc.isVisible()) return loc;
  }
  throw Error("No se localizó de forma inequívoca: "+description+". Revisar captura.");
}
try {
  currentStep="abrir_portal";
  await page.goto(ORIGIN,{waitUntil:"domcontentloaded",timeout:45000});
  await record(currentStep,"Portal abierto");
  await snapshot("01_inicio");

  currentStep="busqueda_avanzada";
  const advanced=await firstVisible([
    page.getByRole("link",{name:/b[uú]squeda avanzada/i}),
    page.getByRole("button",{name:/b[uú]squeda avanzada/i}),
    page.getByText(/b[uú]squeda avanzada/i,{exact:true})
  ],"Búsqueda avanzada");
  await advanced.click();
  await record(currentStep,"Se abrió búsqueda avanzada");
  await snapshot("02_avanzada");

  currentStep="busqueda_fonetica";
  const phonetic=await firstVisible([
    page.getByRole("link",{name:/b[uú]squeda fon[eé]tica/i}),
    page.getByRole("button",{name:/b[uú]squeda fon[eé]tica/i}),
    page.getByText(/b[uú]squeda fon[eé]tica/i,{exact:true})
  ],"Búsqueda fonética");
  await phonetic.click();
  await record(currentStep,"Se seleccionó búsqueda fonética");
  await snapshot("03_fonetica");

  currentStep="capturar_clase";
  const classField=await firstVisible([
    page.getByRole("textbox",{name:/clase/i}),
    page.getByLabel(/clase/i),
    page.locator('input[name="clase"]'),
    page.locator('input[id="clase"]')
  ],"Campo Clase");
  await classField.fill(clase);
  await record(currentStep,"Clase capturada: "+clase);

  currentStep="capturar_denominacion";
  const nameField=await firstVisible([
    page.getByRole("textbox",{name:/denominaci[oó]n/i}),
    page.getByLabel(/denominaci[oó]n/i),
    page.locator('input[name="denominacion"]'),
    page.locator('input[id="denominacion"]')
  ],"Campo Denominación");
  await nameField.fill(marca);
  await record(currentStep,"Denominación capturada: "+marca);
  await snapshot("04_formulario");

  currentStep="ejecutar_busqueda";
  const search=await firstVisible([
    page.getByRole("button",{name:/^(buscar|consultar|b[uú]squeda)$/i}),
    page.getByRole("link",{name:/^(buscar|consultar)$/i}),
    page.locator('input[type="submit"]')
  ],"Botón Buscar/Consultar");
  await search.click();
  await record(currentStep,"Se ejecutó la búsqueda; todavía NO se ha confirmado que cargaron resultados");
  await page.waitForTimeout(3000);
  await snapshot("05_resultado");
  if(await page.getByText(/cargando/i).first().isVisible().catch(()=>false)) {
    throw Error("El portal continúa mostrando Cargando; los resultados no están confirmados.");
  }
  // IMPORTANT: No count or extraction without validating DOM selectors and provenance.
  currentStep="verificacion_pendiente";
  report.status="manual_review_required";
  await record(currentStep,"El operador debe verificar tabla, cantidad y PDF oficial. No se reportan filas sin validación.");
  console.log("Revisa la captura 05_resultado. El script NO confirma número de antecedentes.");
} catch(error) {
  report.status="blocked";
  report.blockedAt=currentStep;
  report.error=String(error.message||error);
  await record("bloqueo",report.error);
  await snapshot("ERROR_"+currentStep);
  console.error("Bloqueo en: "+currentStep+" — "+report.error);
} finally {
  report.finishedAt=new Date().toISOString();
  const raw=JSON.stringify(report,null,2);
  await writeFile(join(folder,"manifest.json"),raw);
  await writeFile(join(folder,"manifest.sha256"),createHash("sha256").update(raw).digest("hex")+"  manifest.json\n");
  await browser.close();
  console.log("Evidencia:",folder);
}
if(report.status==="blocked")process.exitCode=1;
