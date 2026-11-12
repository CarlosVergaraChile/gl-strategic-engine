import test from "node:test";
import assert from "node:assert/strict";
import {validateEvidence,assessCalibrationFit,createDecisionRecord,appendObservedOutcome} from "../core/evidence-decisions.js";
const official={id:"sernapesca-2025-total-mortality",source:"SERNAPESCA 2025 sanitary report",
  sourceUrl:"https://www.sernapesca.cl/informes-y-datos/resultados-de-gestion/",
  observedAt:"2025-12-31",unit:"percent",value:9.7,geography:"Chile",
  population:"all marine salmonid grow-out centers",period:"calendar-year-2025",
  kind:"official_aggregate",qualityApproved:true};
test("official external aggregate cannot silently calibrate center-level model",()=>{
  const r=assessCalibrationFit(official,{unit:"percent",geography:"center-X",population:"Atlantic salmon cycle",period:"cycle"});
  assert.equal(r.canCalibrate,false);
  assert.equal(r.mismatches.length,3);
});
test("direct local observation requires quality approval",()=>{
  const e={...official,kind:"observed",geography:"center-X",population:"Atlantic salmon cycle",period:"cycle",qualityApproved:false};
  const target={unit:e.unit,geography:e.geography,population:e.population,period:e.period};
  assert.equal(assessCalibrationFit(e,target).canCalibrate,false);
  assert.equal(assessCalibrationFit({...e,qualityApproved:true},target).canCalibrate,true);
});
test("human approval and provenance required before decision",()=>{
  const options={decisionId:"d-1",vertical:"AquaEye",observedData:[official],
    modelVersion:"0.3",assumptionsVersion:"v1",asOf:"2026-11-11T00:00:00Z",
    horizon:"week",candidates:[{id:"hold",label:"No change"},{id:"investigate",label:"Inspect"}]};
  assert.equal(createDecisionRecord(options).status,"PROPOSED");
  assert.throws(()=>createDecisionRecord({...options,selectedAction:"investigate"}),/human approval/);
  const approved=createDecisionRecord({...options,selectedAction:"investigate",approvedBy:"human-operator"});
  const reviewed=appendObservedOutcome(approved,{observedAt:"2026-11-18",metric:"mortality",unit:"percent",value:0.6,evidenceId:"e-2"});
  assert.equal(reviewed.status,"REVIEWED");
});
test("evidence validation rejects incomplete provenance",()=>{
  assert.throws(()=>validateEvidence({...official,sourceUrl:"http://example.com"}),/HTTPS/);
});
