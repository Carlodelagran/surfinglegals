/* Surfing Legals - importa JSON generado por tools/marcanet/importar_paquete.py.
   Archivo local: no lo envía a servidores. Estatus no se infiere desde actuaciones. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object" && module.exports)module.exports=api;
 else root.SLConsultaJSON=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const required=["orden_original","denominacion","expediente","titular","clases","ficha_revisada"];
 const text=v=>v==null?"":String(v);
 function parse(input){
   const data=typeof input==="string"?JSON.parse(input):input;
   if(!data || data.schema!=="sl.impi.consulta.v1" || !Array.isArray(data.antecedentes))throw Error("Formato JSON desconocido: se requiere sl.impi.consulta.v1");
   if(data.antecedentes.length>15000)throw Error("El archivo supera 15 000 antecedentes");
   if(!data.marca_buscada || !/^(?:[1-9]|[1-3]\d|4[0-5])$/.test(text(data.clase_buscada)))throw Error("Faltan marca o clase válida");
   if(data.total!==data.antecedentes.length)throw Error("Cantidad declarada no coincide con las filas");
   const seen=new Set();
   const records=data.antecedentes.map((r,index)=>{
     if(!r || required.some(key=>r[key]===undefined))throw Error("Fila "+(index+1)+" incompleta");
     if(!Array.isArray(r.clases) || !r.clases.map(text).includes(text(data.clase_buscada)))throw Error("Clase incompatible en expediente "+text(r.expediente));
     const order=Number(r.orden_original);
     if(!Number.isInteger(order) || order!==index+1)throw Error("El orden original no es consecutivo");
     const id=text(r.expediente).trim();if(!id || seen.has(id))throw Error("Expediente vacío o duplicado: "+id);
     seen.add(id);
     const note=text(r.actuacion_anotada);
     const reviewed=!!r.ficha_revisada && !!note && !/ficha individual no revisada/i.test(note);
     return {
       orden_original:order,denominacion:text(r.denominacion),expediente:id,
       registro:text(r.registro),titular:text(r.titular),clase:r.clases.map(text).join(", "),
       clases:r.clases.map(text),tipo_signo:text(r.tipo_signo),
       actuacion:note,estatus:"",servicios:"",
       ficha_revisada:reviewed,fuente:"JSON importado de paquete IMPI (no consulta en tiempo real)"
     };
   });
   const reviewed=records.filter(r=>r.ficha_revisada).length;
   if(data.fichas_con_actuacion_anotada!==reviewed)throw Error("Inconsistencia en cantidad de fichas revisadas");
   const hashes=data.archivos||{};
   return {
     marca:data.marca_buscada,clase:text(data.clase_buscada),total:records.length,
     fuente:data.origen||"ZIP oficial importado por operador",archivos:hashes,registros:records,
     fecha_consulta:data.fecha_consulta||null,limitaciones:Array.isArray(data.limitaciones)?data.limitaciones:[],
     fichas_revisadas:reviewed
   };
 }
 return {parse};
});