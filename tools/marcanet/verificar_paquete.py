#!/usr/bin/env python3
"""Validate the structure of a Work-exported IMPI ZIP. No network calls."""
import argparse,csv,hashlib,io,json,re,sys,zipfile
from collections import Counter
from pathlib import Path

def verify(path, marca="", clase=""):
    path=Path(path)
    with zipfile.ZipFile(path) as z:
        entries=[x for x in z.infolist() if not x.is_dir()]
        if len(entries)>12 or sum(x.file_size for x in entries)>30_000_000:
            raise ValueError("Paquete supera límites de tamaño")
        csvs=[x for x in entries if x.filename.lower().endswith(".csv")]
        pdfs=[x for x in entries if x.filename.lower().endswith(".pdf")]
        if len(csvs)!=1 or len(pdfs)!=1:
            raise ValueError("Se requiere exactamente un CSV y un PDF")
        source_csv=z.read(csvs[0]);source_pdf=z.read(pdfs[0])
    if not source_pdf.startswith(b"%PDF-"):
        raise ValueError("Archivo PDF con cabecera inválida")
    rows=list(csv.DictReader(io.StringIO(source_csv.decode("utf-8-sig"),newline="")))
    if not rows:
        raise ValueError("CSV sin resultados")
    needed={"#","Denominación","Expediente","Registro","Titular","Clase","TS","Actuación o fecha publicada en ficha"}
    if not needed.issubset(rows[0]):
        raise ValueError("Columnas CSV diferentes del esquema esperado")
    errors=[]
    if [r["#"].strip() for r in rows]!=[str(i) for i in range(1,len(rows)+1)]:
        errors.append("Orden original no consecutivo")
    if any(not r["Expediente"].strip() for r in rows):
        errors.append("Faltan números de expediente")
    ids=[r["Expediente"].strip() for r in rows]
    if len(set(ids))!=len(ids):
        errors.append("Expedientes repetidos")
    classes=Counter(r["Clase"].strip() for r in rows)
    if clase and any(str(clase) not in re.findall(r"\d+",k) for k in classes):
        errors.append("Hay resultados que no incluyen la clase solicitada")
    action="Actuación o fecha publicada en ficha"
    reviewed=sum(bool(r[action].strip()) and not re.search("ficha individual no revisada",r[action],re.I) for r in rows)
    normalize=lambda s: re.sub(r"\s+"," ",re.sub(r"[^A-Z0-9]+"," ",s.upper())).strip()
    return {"estado":"validado_estructuralmente" if not errors else "requiere_revision",
      "nota":"No certifica vigencia ni contenido íntegro del PDF ni registrabilidad",
      "denominacion":marca,"clase_solicitada":clase,"resultados":len(rows),
      "expedientes_distintos":len(set(ids)),"clases_observadas":dict(classes),
      "registros_con_numero":sum(bool(r["Registro"].strip()) for r in rows),
      "fichas_con_actuacion_anotada":reviewed,
      "fichas_sin_revision_documentada":len(rows)-reviewed,
      "coincidencias_exactas":sum(normalize(r["Denominación"])==normalize(marca) for r in rows) if marca else None,
      "archivos":{"csv":csvs[0].filename,"csv_sha256":hashlib.sha256(source_csv).hexdigest(),
                  "pdf":pdfs[0].filename,"pdf_sha256":hashlib.sha256(source_pdf).hexdigest()},
      "errores":errors}

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("zip");p.add_argument("--marca",default="");p.add_argument("--clase",default="")
    args=p.parse_args()
    try:
        result=verify(args.zip,args.marca,args.clase)
        print(json.dumps(result,ensure_ascii=False,indent=2))
        sys.exit(0 if not result["errores"] else 1)
    except (ValueError,OSError,zipfile.BadZipFile,UnicodeError) as exc:
        print(json.dumps({"estado":"error","detalle":str(exc)},ensure_ascii=False),file=sys.stderr)
        sys.exit(2)
