/* Surfing Legals: apoyo jurídico PRELIMINAR. No declara confundibilidad, vigencia ni registrabilidad. */
(function(root,factory){
  const api=factory(root.SLImpi);
  if(typeof module==="object" && module.exports) module.exports=api;
  else root.SLJuridico=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(SLImpi){
  "use strict";
  if(!SLImpi) throw Error("Debe cargarse analizador-impi.js primero.");
  const n=SLImpi.normalize;
  const words=v=>n(v).split(" ").filter(Boolean);
  function phoneticES(v){
    // Solo aproximación ortográfica en español: NO analiza pronunciación real inglesa.
    return n(v).replace(/V/g,"B").replace(/LL/g,"Y").replace(/QU([EI])/g,"K$1")
      .replace(/C([EI])/g,"S$1").replace(/Z/g,"S").replace(/GE/g,"JE").replace(/GI/g,"JI")
      .replace(/GUE/g,"GE").replace(/GUI/g,"GI").replace(/H/g,"").replace(/([AEIOU])\1+/g,"$1")
      .replace(/[^A-Z0-9]/g,"");
  }
  function report(query,records,metadata){
    const q=n(query);
    if(!q) throw Error("Indica una denominación válida.");
    if(!Array.isArray(records)) throw Error("Se necesita una lista de antecedentes.");
    const analyzed=records.map((r,index)=>{
      const c=n(r.denominacion), qt=words(q),ct=words(c);
      const raw=SLImpi.compare(q,c);
      const fullBeginning=c && q.startsWith(c+" ");
      const prefixMatch=c && (q===c || fullBeginning || c.startsWith(q+" "));
      const phoneticMatch=!!c && phoneticES(q)===phoneticES(c);
      const reasons=[];
      if(raw.exact) reasons.push("Denominación idéntica en escritura normalizada.");
      else if(fullBeginning) reasons.push("El signo propuesto comienza con la denominación completa del antecedente.");
      else if(prefixMatch) reasons.push("Coincidencia de denominación completa al comienzo de uno de los signos.");
      else if(raw.sharedOrdered) reasons.push("Ambos signos comparten una secuencia continua de palabras.");
      else if(raw.sharedTokens.length) reasons.push("Comparten palabras: "+raw.sharedTokens.join(", ")+".");
      if(phoneticMatch && !raw.exact) reasons.push("Equivalencia bajo reglas ortográficas aproximadas del español; pronunciación por verificar.");
      const act=String(r.actuacion||"");
      const evidenceReviewed=!!act && !/ficha individual no revisada/i.test(act);
      if(evidenceReviewed) reasons.push("Actuación anotada en CSV: "+act);
      else reasons.push("Ficha individual sin revisión documentada: verificar vigencia, actuaciones y posibles requerimientos.");
      if(!r.estatus) reasons.push("No se reportó un estatus registral verificado.");

      if(!r.servicios) reasons.push("Servicios específicos no cotejados con título o expediente.");
      const priority=raw.exact||fullBeginning||prefixMatch?"ALTA":raw.sharedOrdered||phoneticMatch?"MEDIA":"REVISAR";
      return {...r,indice_original:r.orden_original??index+1,comparacion:raw,prioridad:priority,razones:reasons,fonetica_aproximada_es:phoneticMatch,ficha_revisada:evidenceReviewed};
    });
    const tiers={ALTA:0,MEDIA:1,REVISAR:2};
    analyzed.sort((a,b)=>tiers[a.prioridad]-tiers[b.prioridad]||b.comparacion.score-a.comparacion.score||a.indice_original-b.indice_original);
    return {
      denominacion:query,clase:metadata?.clase??null,fecha_consulta:metadata?.fecha_consulta??null,
      total:analyzed.length,fichas_con_actuacion_revisada:analyzed.filter(r=>r.ficha_revisada).length,antecedentes:analyzed,
      traducciones_sugeridas:[],
      advertencias:[
        "La prioridad identifica expedientes a examinar, no determina riesgo legal ni registrabilidad.",
        "Los datos del CSV no sustituyen las fichas oficiales, actuaciones, títulos, servicios ni vigencias.",
        "La aproximación fonética implementada es exclusivamente ortográfica para español; en otras lenguas requiere revisión humana.",
        "Para traducciones literales y equivalencias conceptuales se necesita revisión lingüística contextual; no se generan hallazgos registrales ficticios."
      ]
    };
  }
  return {report,phoneticES};
});