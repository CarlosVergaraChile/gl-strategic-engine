import test from "node:test";import assert from "node:assert/strict";
import {generateSyntheticHospitalDays} from "../adapters/health/synthetic-source.js";
import {evaluateIntegratedDay,summarizeIntegratedSeries} from "../adapters/health/integrated-flow.js";
test("28 days generated reproducibly without patient data",()=>{
 const a=generateSyntheticHospitalDays();const b=generateSyntheticHospitalDays();
 assert.deepEqual(a,b);assert.equal(a.records.length,28);
 assert.equal(a.provenance,"synthetic");
 assert.equal(a.records.some(r=>"patientName" in r.ed),false);
});
test("all synthetic observations pass contract and joint model",()=>{
 for(const day of generateSyntheticHospitalDays().records){
  const out=evaluateIntegratedDay(day);
  assert.equal(out.date,day.date);
  assert.ok(out.coordination.every(a=>a.requiresHumanApproval));
 }
});
test("no double counting of emergency and post-op beds",()=>{
 const day=generateSyntheticHospitalDays().records[0],out=evaluateIntegratedDay(day);
 assert.equal(out.emergency.effectiveBeds,day.ed.staffedBeds-day.ed.blockedBeds);
 assert.equal(out.surgery.limits.postopBedsAvailable,
  day.surgery.postopBedsEffective-day.surgery.postopBedsOccupied+day.surgery.postopDischargesConfirmed);
});
test("prevents date/facility mismatch",()=>{
 const day=generateSyntheticHospitalDays().records[0];
 assert.throws(()=>evaluateIntegratedDay({...day,surgery:{...day.surgery,date:"2026-01-01"}}),/match/);
});
test("cannot represent repeated snapshots as unique patients",()=>{
 const gen=generateSyntheticHospitalDays(), s=summarizeIntegratedSeries(gen.records);
 assert.equal(s.days,28);assert.match(s.warning,/not unique patients/);
 assert.throws(()=>summarizeIntegratedSeries([gen.records[0],gen.records[0]]),/duplicate/);
});
test("synthetic never confused with real data",()=>{
 const x=generateSyntheticHospitalDays().records[0];
 assert.equal(evaluateIntegratedDay(x).provenance,"synthetic");
 assert.throws(()=>evaluateIntegratedDay({...x,provenance:undefined}),/provenance/);
});
