import test from "node:test";
import assert from "node:assert/strict";
import {REFERENCE,queryFromInput,allowedQuery,officialPage,verifyRows} from "../src/validation.mjs";
const sample=i=>({
  orden_original:i+1,denominacion:i===0?"RETRO GAME":"OTRA MARCA",
  expediente:String(1000000+i),clase:"35 41 42",
  titular:"Titular de prueba",registro:""
});
test("no confuses classes with invalid numbers",()=>{
 assert.deepEqual(queryFromInput({marca:"RETRO GAME FEST",clase:41}),REFERENCE);
 for(const clase of ["0","46","999","1 OR 1","-1"])
   assert.throws(()=>queryFromInput({marca:"TESTING",clase}),/consulta_invalida/);
 assert.throws(()=>queryFromInput({marca:"A",clase:41}),/consulta_invalida/);
});
test("only known search unlocked by default",()=>{
 assert.equal(allowedQuery(REFERENCE,{}),true);
 assert.equal(allowedQuery({marca:"OTRA MARCA",clase:"35"},{}),false);
 assert.equal(allowedQuery({marca:"OTRA MARCA",clase:"35"},{SL_IMPI_PILOT_ALLOWED_QUERIES:"OTRA MARCA|35"}),true);
 assert.equal(allowedQuery({marca:"OTRA MARCA",clase:"41"},{SL_IMPI_PILOT_ALLOWED_QUERIES:"OTRA MARCA|35"}),false);
});
test("only genuine IMPI hostname and protocol",()=>{
 assert.equal(officialPage("https://acervomarcas.impi.gob.mx:8181/marcanet/"),true);
 assert.equal(officialPage("https://acervomarcas.impi.gob.mx.evil.test:8181/"),false);
 assert.equal(officialPage("http://acervomarcas.impi.gob.mx:8181/"),false);
});
test("rows validate complete sequence and Niza multiple classes",()=>{
 const q={marca:"OTRA MARCA",clase:"41"};
 const rows=[sample(0),sample(1)];
 assert.equal(verifyRows(rows,q).length,2);
 assert.throws(()=>verifyRows(rows,q,{officialCount:3}),/conteo_no_coincidente/);
 assert.throws(()=>verifyRows([{...sample(0),orden_original:2}],q),/fila_invalida/);
 assert.throws(()=>verifyRows([sample(0),{...sample(1),expediente:sample(0).expediente}],q),/expediente_duplicado/);
 assert.throws(()=>verifyRows([{...sample(0),clase:"35"}],q),/fila_invalida/);
});
test("reference case can never pass with fabricated or partial data",()=>{
 assert.throws(()=>verifyRows([sample(0)],REFERENCE),/referencia_incompleta/);
 const rows=Array.from({length:297},(_,i)=>sample(i));
 assert.throws(()=>verifyRows(rows,REFERENCE),/referencia_distinta/);
});
