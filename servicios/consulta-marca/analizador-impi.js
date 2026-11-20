/* Surfing Legals | IMPI CSV analysis helpers (V1). No automatic registrability conclusions. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SLImpi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function parseCSV(input, delimiter) {
    const text = String(input || '').replace(/^\uFEFF/, '');
    if (!delimiter) {
      const first = text.split(/\r?\n/, 1)[0] || '';
      delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    }
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === delimiter) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (quoted) throw new Error('CSV mal formado: comillas sin cerrar');
    row.push(cell); if (row.some(v => v.trim())) rows.push(row);
    return rows;
  }
  function normalize(value) {
    return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }
  function tokens(v) { return normalize(v).split(' ').filter(Boolean); }
  function levenshtein(a,b) {
    a = normalize(a); b = normalize(b);
    let previous = Array.from({length:b.length+1},(_,i)=>i);
    for (let i=1;i<=a.length;i++) {
      const current = [i];
      for (let j=1;j<=b.length;j++) current[j] = Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
      previous=current;
    }
    return previous[b.length];
  }
  function compare(query, candidate) {
    const q = normalize(query), c = normalize(candidate), qt=tokens(q), ct=tokens(c);
    if (!q || !c) return {level:'sin_dato', exact:false, sameBeginning:false, sharedOrdered:false, sharedTokens:[], score:0};
    const exact = q===c;
    const sameBeginning = q.startsWith(c+' ') || c.startsWith(q+' ');
    const sharedTokens = qt.filter(t=>ct.includes(t));
    const ordered = (short,long) => long.join(' ').includes(short.join(' '));
    const sharedOrdered = ordered(qt,ct) || ordered(ct,qt);
    const similarity = 1 - levenshtein(q,c)/Math.max(q.length,c.length);
    const overlap = sharedTokens.length/Math.max(qt.length,ct.length);
    const score = Math.round(100 * Math.max(exact?1:0, sameBeginning?.92:0,sharedOrdered?.83:0, overlap*.66, similarity*.56));
    return {level:exact?'identica':sameBeginning?'inicio_coincidente':sharedOrdered?'secuencia_compartida':sharedTokens.length?'palabras_compartidas':'baja_similitud_textual',exact,sameBeginning,sharedOrdered,sharedTokens,score};
  }
  function rowsToRecords(rows, mapping) {
    if (!Array.isArray(rows) || rows.length===0) return [];
    const cols=rows[0];
    for (const required of ['denominacion','expediente','titular','clase']) if (mapping[required]===undefined || mapping[required]<0 || mapping[required]>=cols.length) throw new Error('Asigna la columna '+required);
    return rows.slice(1).map((r,i)=>({
      orden_original:mapping.orden>=0?(Number(r[mapping.orden])||i+1):i+1,
      denominacion:r[mapping.denominacion]||'', expediente:r[mapping.expediente]||'', titular:r[mapping.titular]||'',
      clase:r[mapping.clase]||'', registro:mapping.registro>=0?r[mapping.registro]||'':'',
      estatus:mapping.estatus>=0?r[mapping.estatus]||'':'',
      actuacion:mapping.actuacion>=0?r[mapping.actuacion]||'':'',
      fuente:'CSV importado: los datos de actuaciones solo se consideran documentados si fueron expresamente revisados',
      datos_originales:r,
    }));
  }
  function rank(query,records) { return records.map(record=>({...record,comparacion:compare(query,record.denominacion)})).sort((a,b)=>b.comparacion.score-a.comparacion.score||a.orden_original-b.orden_original); }
  return {parseCSV,normalize,compare,rowsToRecords,rank};
});
