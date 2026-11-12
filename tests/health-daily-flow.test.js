import test from "node:test";
import assert from "node:assert/strict";
import {validateDailyCensus,assessDailyFlow,draftDailyCoordination} from "../adapters/health/daily-flow.js";
const fixture={facility:"Demo hospital",date:"2026-11-11",source:"synthetic-fixture",recordedAt:"2026-11-11T07:00:00Z",
 physicalBeds:100,enabledBeds:90,staffedBeds:80,blockedBeds:5,occupiedBeds:72,
 edPatientsAwaitingBed:12,edPatientsAwaitingBedSinceHours:15,expectedDischarges:7,confirmedDischarges:4};
test("effective beds not theoretical/funded beds",()=>{
 const x=validateDailyCensus(fixture); assert.equal(x.effectiveBeds,75);assert.equal(x.availableNow,3);
});
test("expected discharges are not treated as certain",()=>{
 const x=assessDailyFlow(fixture);assert.equal(x.projectedWithConfirmedDischarges,7);
 assert.equal(x.projectedIfAllExpectedDischargesOccur,10);assert.equal(x.unmetAfterConfirmedDischarges,5);
});
test("clinical decisions never automatic",()=>{
 const x=draftDailyCoordination(fixture);assert.equal(x.status,"PROPOSED_ONLY");
 assert.equal(x.actions.length,3);assert.ok(x.actions.every(a=>a.requiresHumanApproval));
});
test("invalid capacity and missing evidence rejected",()=>{
 assert.throws(()=>validateDailyCensus({...fixture,staffedBeds:110}),/staffed/);
 assert.throws(()=>validateDailyCensus({...fixture,edPatientsAwaitingBedSinceHours:undefined}),/duration/);
});
test("patient identifiers prohibited",()=>{
 assert.throws(()=>validateDailyCensus({...fixture,patientName:"test"}),/prohibited/);
});
test("no phantom deficit when resources cover demand",()=>{
 const x=assessDailyFlow({...fixture,occupiedBeds:60,edPatientsAwaitingBed:5,
 edPatientsAwaitingBedSinceHours:1,expectedDischarges:3,confirmedDischarges:3});
 assert.equal(x.unmetAfterConfirmedDischarges,0);
});
