/* Ejecutar con: node servicios/consulta-marca/tests/analisis.test.js */
const assert=require("node:assert/strict");
const path=require("node:path");
const base=path.join(__dirname,"..");
const S=require(path.join(base,"analizador-impi.js"));
globalThis.SLImpi=S;
const J=require(path.join(base,"analisis-juridico.js"));
const csv='Denominacion,Expediente,Titular,Clase,Registro\n"RETRO GAME","2220564","Titular prueba",41,2157492\n"GAME FEST","1352323","Otro titular",41,\n"RETRO GAME FEST","0001","Ejemplo",41,\n';
const rows=S.parseCSV(csv),records=S.rowsToRecords(rows,{denominacion:0,expediente:1,titular:2,clase:3,registro:4,estatus:-1});
assert.equal(records.length,3);
const result=J.report("RETRO GAME FEST",records,{clase:41});
assert.equal(result.antecedentes[0].denominacion,"RETRO GAME FEST");
assert.equal(result.antecedentes[1].denominacion,"RETRO GAME");
assert.equal(result.antecedentes[1].prioridad,"ALTA");
assert.ok(result.antecedentes[1].razones.some(x=>x.includes("comienza")));
assert.equal(result.traducciones_sugeridas.length,0);
assert.equal(J.phoneticES("VACA"),J.phoneticES("BACA"));
assert.equal(result.total,3);
console.log("Pruebas básicas del analizador: OK");

// Fixture de ocho columnas con el esquema exacto observado en el CSV recibido.
const csvIMPI = '#,Denominación,Expediente,Registro,Titular,Clase,TS,Actuación o fecha publicada en ficha\n'+
 '1,RETRO GAME,2220564,2157492,TELEVISA,41,M,Concesión 14/10/2020. Fecha de vigencia publicada 13/06/2029.\n'+
 '2,GAME FEST,1352323,,FIDEICOMISO,41,M,Ficha individual no revisada\n';
const parsedIMPI=S.parseCSV(csvIMPI);
const mappedIMPI=S.rowsToRecords(parsedIMPI,{orden:0,denominacion:1,expediente:2,registro:3,titular:4,clase:5,estatus:-1,actuacion:7});
assert.equal(mappedIMPI[0].orden_original,1);
assert.equal(mappedIMPI[0].actuacion.startsWith('Concesión'),true);
const resultIMPI=J.report('RETRO GAME FEST',mappedIMPI,{clase:41});
assert.equal(resultIMPI.fichas_con_actuacion_revisada,1);
assert.equal(resultIMPI.antecedentes.find(x=>x.expediente==='2220564').prioridad,'ALTA');
assert.equal(resultIMPI.antecedentes.find(x=>x.expediente==='1352323').ficha_revisada,false);
