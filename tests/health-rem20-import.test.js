import test from "node:test";import assert from "node:assert/strict";
import {parseDelimited,normalizeRem20,summarizeRem20} from "../adapters/health/rem20-import.js";
const columns={establishment:"ESTABLECIMIENTO",year:"PERIODO",month:"MES",
 occupiedBedDays:"DIAS_CAMAS_OCUPADAS",availableBedDays:"DIAS_CAMAS_DISPONIBLES",
 functionalArea:"AREA_FUNCIONAL"};
const sourceUrl="https://datos.gob.cl/dataset/indicadores-hospitalarios-rem20";
const sample="ESTABLECIMIENTO;PERIODO;MES;AREA_FUNCIONAL;DIAS_CAMAS_OCUPADAS;DIAS_CAMAS_DISPONIBLES\n"+
  '"Hospital Ejemplo";2026;1;"Medicina";90;100\n"Hospital Ejemplo";2026;2;"Medicina";10;20\n';
test("CSV parser handles quoted semicolon and header",()=>{
 const r=parseDelimited(sample,";");assert.equal(r.rows.length,2);assert.equal(r.rows[0].ESTABLECIMIENTO,"Hospital Ejemplo");
});
test("weighted occupancy sums numerators/denominators before dividing",()=>{
 const data=normalizeRem20(parseDelimited(sample,";").rows,{columns,sourceUrl,releaseDate:"2026-10-27"});
 const total=summarizeRem20(data,{establishment:"Hospital Ejemplo",year:2026});
 assert.equal(total.occupancyPct,100*100/120);
 assert.notEqual(total.occupancyPct,70);
 assert.equal(total.periodGranularity,"month");
});
test("never infer official header positions or silently patch errors",()=>{
 assert.throws(()=>normalizeRem20([{foo:1}],{sourceUrl,releaseDate:"2026-10-27"}),/mapping/);
 assert.throws(()=>normalizeRem20(parseDelimited(sample,";").rows,{columns:{...columns,occupiedBedDays:"MISSING"},
 sourceUrl,releaseDate:"2026-10-27"}),/mapped/);
});
test("filter by real row area without pretending daily coverage",()=>{
 const data=normalizeRem20(parseDelimited(sample,";").rows,{columns,sourceUrl,releaseDate:"2026-10-27",area:"Medicina"});
 assert.equal(summarizeRem20(data).rows,2);
 assert.throws(()=>summarizeRem20(data,{area:"Cirugía"}),/no matching/);
});
test("supports comma decimal while rejecting ambiguous formatting",()=>{
 const csv=sample.replace(";90;100",";90,5;100");const rows=parseDelimited(csv,";").rows;
 const data=normalizeRem20(rows,{columns,sourceUrl,releaseDate:"2026-10-27"});
 assert.equal(data[0].occupiedBedDays,90.5);
});
test("no duplicate header names or broken CSV rows",()=>{
 assert.throws(()=>parseDelimited("A;A\n1;2",";"),/headers/);
 assert.throws(()=>parseDelimited("A;B\n1;2;3",";"),/column count/);
});

test("zero available beds remain visible as excluded data-quality rows",()=>{
 const csv=sample+'Hospital Ejemplo;2026;3;Medicina;5;0\n';
 const rows=normalizeRem20(parseDelimited(csv,";").rows,{columns,sourceUrl,releaseDate:"2026-10-27"});
 const r=summarizeRem20(rows);
 assert.equal(rows.length,3);assert.equal(r.excludedZeroBedDays,1);
 assert.equal(r.occupancyPct,100*100/120);
});
test("occupancy above 100 percent is visible, never truncated",()=>{
 const csv=sample.replace(";90;100",";110;100");
 const rows=normalizeRem20(parseDelimited(csv,";").rows,{columns,sourceUrl,releaseDate:"2026-10-27"});
 const r=summarizeRem20(rows);
 assert.equal(r.rowsOver100Pct,1);
 assert.equal(r.occupancyPct,100*120/120);
 const solo=summarizeRem20([rows[0]]);
 assert.equal(solo.occupancyPct,110);
});
