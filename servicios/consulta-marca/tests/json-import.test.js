/* Execute with: node servicios/consulta-marca/tests/json-import.test.js */
const assert=require('node:assert/strict');
const load=require('../consulta-json.js');
const input={
 schema:'sl.impi.consulta.v1',origen:'Work IMPI export',
 marca_buscada:'RETRO GAME FEST',clase_buscada:'41',total:2,
 fichas_con_actuacion_anotada:1,
 archivos:{pdf:{nombre:'IMPI.pdf',sha256:'abc'},csv:{nombre:'datos.csv',sha256:'xyz'}},
 antecedentes:[
  {orden_original:1,denominacion:'RETRO GAME',expediente:'2220564',titular:'Televisa',registro:'2157492',clases:['41'],tipo_signo:'M',actuacion_anotada:'Concesión 14/10/2020',ficha_revisada:true,estatus_registral_verificado:null},
  {orden_original:2,denominacion:'GAME FEST',expediente:'1352323',titular:'Fideicomiso',registro:null,clases:['35','41'],tipo_signo:'M',actuacion_anotada:'Ficha individual no revisada',ficha_revisada:false,estatus_registral_verificado:null}
 ]
};
const result=load.parse(JSON.stringify(input));
assert.equal(result.total,2);
assert.equal(result.registros[0].clase,'41');
assert.equal(result.registros[0].ficha_revisada,true);
assert.equal(result.registros[1].ficha_revisada,false);
assert.equal(result.registros[1].clase,'35, 41');
assert.equal(result.registros[0].estatus,'');
assert.equal(result.archivos.pdf.sha256,'abc');
assert.throws(()=>load.parse(JSON.stringify({...input,total:3})),/Cantidad declarada/);
assert.throws(()=>load.parse(JSON.stringify({...input,antecedentes:[input.antecedentes[0],input.antecedentes[0]]})),/orden original|duplicado/i);
console.log('JSON import contract tests passed');
