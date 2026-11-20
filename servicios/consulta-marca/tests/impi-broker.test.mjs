import assert from "node:assert/strict";
import {officialUrl,validateQuery,validateOfficialResponse}
  from "../../../functions/_lib/impi-official.mjs";
assert.equal(officialUrl("https://acervomarcas.impi.gob.mx/marcanet/"),true);
assert.equal(officialUrl("https://www.impi.gob.mx/"),true);
assert.equal(officialUrl("https://impi.gob.mx.evil.test/"),false);
assert.equal(officialUrl("http://marcanet.impi.gob.mx/"),false);
assert.equal(officialUrl("https://acervomarcas.impi.gob.mx:8181/marcanet/"),true);
assert.equal(officialUrl("https://impi.gob.mx:8181/"),false);
const q=validateQuery({marca:"RETRO GAME FEST",clase:41});
assert.deepEqual(q,{marca:"RETRO GAME FEST",clase:"41"});
assert.throws(()=>validateQuery({marca:"X",clase:41}),/invalid_query/);
assert.throws(()=>validateQuery({marca:"RETRO",clase:99}),/invalid_query/);
// Synthetic examples are ONLY for validating the contract; no official results claimed.
const fixture={schema:"sl.impi.proveedor.oficial.v1",origen:"IMPI",
 fuente_url:"https://acervomarcas.impi.gob.mx/",consulta_url:"https://acervomarcas.impi.gob.mx/marcanet/",
 marca:"RETRO GAME FEST",clase:"41",consultado_en:"2026-11-18T06:00:00Z",
 total:1,antecedentes:[{denominacion:"RETRO GAME",expediente:"2220564",
 titular:"EJEMPLO — NO ES DATO OFICIAL",clases:["41"],
 expediente_url:"https://acervomarcas.impi.gob.mx/marcanet/"}]};
const result=validateOfficialResponse(fixture,q);
assert.equal(result.antecedentes.length,1);
assert.equal(result.fuente,"IMPI");
assert.throws(()=>validateOfficialResponse({...fixture,total:2},q),/incomplete_results/);
assert.throws(()=>validateOfficialResponse({...fixture,consulta_url:"https://impostor.example/test"},q),/unverified_source/);
assert.throws(()=>validateOfficialResponse({...fixture,clase:"35"},q),/query_mismatch/);
assert.throws(()=>validateOfficialResponse({...fixture,antecedentes:[{...fixture.antecedentes[0],expediente_url:"https://example.org"}]},q),/unverified_record/);
assert.throws(()=>validateOfficialResponse({...fixture,antecedentes:[fixture.antecedentes[0],fixture.antecedentes[0]],total:2},q),/duplicate_records/);
console.log("IMPI official-source adapter contract: OK (synthetic fixtures only)");
