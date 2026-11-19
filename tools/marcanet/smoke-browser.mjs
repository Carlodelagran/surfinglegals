#!/usr/bin/env node
/**
 * Smoke test: one human-supervised MARCANET phonetic search in a real browser.
 * Not a public API, not a service, not a bypass of access controls.
 * Usage:
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *   node tools/marcanet/smoke-browser.mjs "RETRO GAME FEST" 41
 *
 * Stops without a result if IMPI changes its UI, requires human verification,
 * fails to present a recognized results table or blocks automation.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const marca = String(process.argv[2] || "").trim();
const clase = String(process.argv[3] || "").trim();
if (marca.length < 3 || marca.length > 100 || !/^(?:[1-9]|[1-3][0-9]|4[0-5])$/.test(clase)) {
  console.error('Uso: node tools/marcanet/smoke-browser.mjs "RETRO GAME FEST" 41');
  process.exit(2);
}
const base = "https://acervomarcas.impi.gob.mx:8181/";
const salida = path.resolve("tmp/marcanet-pruebas");
await fs.mkdir(salida, { recursive: true });
const browser = await chromium.launch({ headless: false, slowMo: 130 });
try {
  const context = await browser.newContext({
    locale: "es-MX", acceptDownloads: true,
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 45000 });
  const isOfficial = () => {
    const u = new URL(page.url());
    if (u.hostname !== "acervomarcas.impi.gob.mx" || u.protocol !== "https:")
      throw new Error("Navegación fuera de la fuente oficial; detener.");
  };
  isOfficial();
  const queryInput = page.locator('[id="frmBsqFonetica:denominacion"]');
  if (!(await queryInput.count())) {
    await page.getByText(/búsqueda fonética/i).first().click({ timeout: 15000 });
  }
  await queryInput.waitFor({ state: "visible", timeout: 20000 });
  const classInput = page.locator('[id="frmBsqFonetica:clases"]');
  if (!(await classInput.count())) throw new Error("No se localizó el campo de clase.");
  await classInput.fill(clase);
  await queryInput.fill(marca);
  // PrimeFaces may use validators/auto-complete. Do not guess how to bypass them.
  if ((await classInput.inputValue()).trim() !== clase ||
      (await queryInput.inputValue()).trim() !== marca)
    throw new Error("No se confirmó la captura de la clase y denominación.");
  await page.locator('[id="frmBsqFonetica:busquedaId2"]').click({ timeout: 15000 });
  await page.waitForFunction(() => {
    return [...document.querySelectorAll("table")].some(t => {
      const headers = [...t.querySelectorAll("thead th")].map(x => x.textContent.toUpperCase());
      return headers.some(x => x.includes("DENOMINACI")) &&
        headers.some(x => x.includes("EXPEDIENTE")) &&
        t.querySelectorAll("tbody tr").length > 0;
    });
  }, { timeout: 45000 }).catch(() => {});
  isOfficial();
  const tables = await page.locator("table").evaluateAll(list => list.map((t,i) => ({
    index:i,
    headers:[...t.querySelectorAll("thead th")].map(x => (x.textContent||"").trim()),
    rows:t.querySelectorAll("tbody tr").length
  })));
  const table = tables.find(t => t.headers.some(x => /denominaci[oó]n/i.test(x)) &&
                                  t.headers.some(x => /expediente/i.test(x)) && t.rows > 0);
  await page.screenshot({ path: path.join(salida, "marcanet-busqueda.png"), fullPage: true });
  if (!table) {
    await fs.writeFile(path.join(salida, "tablas-diagnostico.json"),
      JSON.stringify({ marca, clase, url:page.url(), tables },null,2));
    throw new Error("No hubo tabla de resultados reconocible. Revisar captura y tablas; no reportar coincidencias.");
  }
  const data = await page.locator("table").nth(table.index).evaluate(t => ({
    columns:[...t.querySelectorAll("thead th")].map(x => (x.textContent||"").trim()),
    rows:[...t.querySelectorAll("tbody tr")].map(tr =>
      [...tr.querySelectorAll("td")].map(x => (x.textContent||"").trim())),
  }));
  const normalize=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const columns=data.columns.map(normalize);
  const find=re=>columns.findIndex(x=>re.test(x));
  const index={orden:find(/^(#|NUMERO|ORDEN)$/),denominacion:find(/DENOMINACION/),
    expediente:find(/EXPEDIENTE/),registro:find(/^REGISTRO/),
    titular:find(/TITULAR|SOLICITANTE/),clase:find(/^CLASE/)};
  if (index.denominacion<0 || index.expediente<0 || index.clase<0 || index.titular<0)
    throw new Error("Faltan columnas legales obligatorias: no exportar como evidencia.");
  const antecedentes=data.rows.filter(row=>row.some(Boolean)).map((row,i)=>({
    orden_original:index.orden<0?i+1:Number(row[index.orden])||i+1,
    denominacion:row[index.denominacion]||"",
    expediente:row[index.expediente]||"",
    registro:index.registro<0?"":row[index.registro]||"",
    titular:row[index.titular]||"",
    clase:row[index.clase]||"",
  }));
  if(!antecedentes.length || antecedentes.some(r=>!r.expediente || !r.denominacion ||
     !r.clase.split(/\s*[,;/]\s*/).includes(clase)))
    throw new Error("Resultados no compatibles con clase o expediente: detener.");
  const report={
    schema:"sl.impi.captura.navegador.v1",origen:"MARCANET",
    nota:"Captura de navegador controlado, pendiente de cotejo individual de expedientes y autenticidad.",
    marca_buscada:marca,clase_buscada:clase,
    consulta_en:new Date().toISOString(),pagina:page.url(),total_capturado:antecedentes.length,
    columnas_originales:data.columns,antecedentes
  };
  await fs.writeFile(path.join(salida,"resultado-bruto.json"),JSON.stringify(report,null,2));
  console.log("Captura local completada:",antecedentes.length,"filas; salida:",salida);
  console.log("Confirmar frente al encabezado y contador oficiales, no asumir que todas las coincidencias fueron descargadas.");
  await page.waitForTimeout(1500);
} finally {
  await browser.close();
}
