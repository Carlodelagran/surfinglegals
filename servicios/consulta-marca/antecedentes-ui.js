/* Surfing Legals - presentation of imported, non-live IMPI records.
 * All parsing and ranking occurs in visitor's browser; no data uploaded.
 */
(function(root,factory){
 const api=factory(root.SLImpi,root.SLJuridico,root.SLConsultaJSON);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SLAntecedentesUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(S,J,Json){
 'use strict';
 if(!S||!J||!Json)throw Error('Cargar motor IMPI y consulta-json primero.');
 const clean=v=>String(v==null?'':v).trim();
 function readCSV(csv){
   const rows=S.parseCSV(csv);
   if(rows.length<2)throw Error('El CSV no contiene antecedentes.');
   const headings=rows[0].map(S.normalize);
   const find=variants=>headings.findIndex(x=>variants.some(re=>re.test(x)));
   const m={
     denominacion:find([/^DENOMINACION$/, /^MARCA$/, /^SIGNO$/]),
     expediente:find([/^EXPEDIENTE$/]),
     titular:find([/^TITULAR$/, /^SOLICITANTE$/]),
     clase:find([/^CLASE$/, /^CLASE NIZA$/]),
     registro:find([/^REGISTRO$/]),
     estatus:find([/^ESTATUS$/, /^ESTADO$/, /^SITUACION$/]),
     actuacion:find([/^ACTUACION/, /^OBSERVACION/]),
     orden:find([/^#$/, /^ORDEN$/])
   };
   for(const key of ['denominacion','expediente','titular','clase']){
     if(m[key]<0)throw Error('No se reconoció la columna '+key+'. Utiliza el laboratorio para asignar columnas manualmente.');
   }
   const registros=S.rowsToRecords(rows,m);
   if(registros.length>15000)throw Error('El archivo excede 15,000 registros.');
   return {marca:null,clase:null,total:registros.length,registros,fuente:'CSV aportado por el usuario (origen y autenticidad sin verificación)',fecha_consulta:null,fichas_revisadas:0};
 }
 function analyze(content,filename,query){
   const data=filename.toLowerCase().endsWith('.json')?Json.parse(content):readCSV(content);
   if(data.marca && S.normalize(data.marca)!==S.normalize(query))throw Error('El archivo corresponde a otra denominación ('+data.marca+').');
   const report=J.report(query,data.registros,{clase:data.clase,fecha_consulta:data.fecha_consulta});
   return {report,source:data.fuente,declared:data.total,className:data.clase};
 }
 function render(result,target){
   target.replaceChildren();
   const summary=document.createElement('p');
   const counts={ALTA:0,MEDIA:0,REVISAR:0};
   result.report.antecedentes.forEach(x=>{counts[x.prioridad]=(counts[x.prioridad]||0)+1;});
   summary.textContent='Archivo analizado: '+result.declared+' antecedentes. Coincidencias de revisión prioritaria: '+counts.ALTA+' alta y '+counts.MEDIA+' media. Estos niveles NO son calificaciones de riesgo registral.';
   target.append(summary);
   const source=document.createElement('p');
   source.className='marca-note';
   source.textContent='Origen declarado: '+result.source+'. No es una consulta en tiempo real y la autenticidad del archivo no ha sido verificada.';
   target.append(source);
   if(!result.report.antecedentes.length)return;
   const header=document.createElement('h4');header.textContent='Antecedentes que requieren revisión';target.append(header);
   const list=document.createElement('ol');list.style.paddingLeft='20px';
   for(const r of result.report.antecedentes.slice(0,12)){
     const li=document.createElement('li');li.style.marginBottom='14px';
     const label=document.createElement('strong');
     label.textContent=r.denominacion+' — Prioridad '+r.prioridad;
     li.append(label);
     const explanation=document.createElement('p');explanation.className='marca-note';
     explanation.textContent='Expediente: '+r.expediente+' · Clase: '+r.clase+' · Titular: '+r.titular+'. '+r.razones[0];
     li.append(explanation);list.append(li);
   }
   target.append(list);
   const rest=document.createElement('p');rest.className='marca-note';
   rest.textContent='Se muestran hasta 12 antecedentes. Es necesario revisar actuaciones, vigencias, clases y servicios antes de emitir una opinión jurídica.';
   target.append(rest);
 }
 return {readCSV,analyze,render};
});