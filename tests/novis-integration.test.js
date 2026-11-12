import test from "node:test";
import assert from "node:assert/strict";
import { summarizeROIEvents } from "../adapters/novis/index.js";
const a={process_name:"Proceso A",created_at:"2026-11-10T10:00:00Z",
  saving_amount_usd:100,time_saved_hours:2,currency:"USD",status:"completed",
  process_category:"Operaciones",provenance:"synthetic"};
test("NovisEye does not present simulated events as observed savings",()=>{
  assert.throws(()=>summarizeROIEvents([a],{sourceType:"observed"}),/provenance/);
});
test("NovisEye only totals completed events",()=>{
  const r=summarizeROIEvents([a,{...a,status:"failed",saving_amount_usd:999}],{sourceType:"synthetic"});
  assert.equal(r.completedSavings,100);assert.equal(r.events,2);assert.equal(r.completed,1);
});
test("NovisEye rejects mixed currency",()=>{
  assert.throws(()=>summarizeROIEvents([{...a,currency:"CLP"}],{sourceType:"synthetic"}),/currency/);
});
