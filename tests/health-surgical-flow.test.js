import test from "node:test";import assert from "node:assert/strict";
import {validateSurgeryDay,evaluateSurgeryDay,draftSurgeryCoordination} from "../adapters/health/surgical-flow.js";
const base={date:"2026-11-12",facility:"Hospital demostrativo",source:"synthetic",caseMix:"uniform-demo",scheduledCases:15,staffedORs:3,casesPerOR:4,sterileSets:13,pacuSlots:4,pacuTurns:3,postopBedsEffective:20,postopBedsOccupied:14,postopDischargesConfirmed:3};
test("OR and PACU produce independent limits",()=>{const x=evaluateSurgeryDay(base);assert.equal(x.upperBoundCases,9);assert.deepEqual(x.limitingResources,["postopBedsAvailable"]);assert.equal(x.gapToSchedule,6)});
test("PACU becomes bottleneck separately from ward",()=>{const x=evaluateSurgeryDay({...base,pacuSlots:2,postopBedsEffective:30});assert.equal(x.upperBoundCases,6);assert.ok(x.limitingResources.includes("pacuCapacity"))});
test("limited sterile instruments constrain",()=>{const x=evaluateSurgeryDay({...base,sterileSets:2});assert.equal(x.upperBoundCases,2);assert.ok(x.limitingResources.includes("sterileSets"))});
test("confirmed post-op discharges differ from unconfirmed",()=>{const x=evaluateSurgeryDay({...base,postopDischargesConfirmed:0});assert.equal(x.limits.postopBedsAvailable,6)});
test("no clinical order issued",()=>{const x=draftSurgeryCoordination(base);assert.equal(x.status,"PROPOSED_ONLY");assert.ok(x.actions.every(a=>a.requiresHumanApproval))});
test("reject impossible bed values or personal information",()=>{assert.throws(()=>validateSurgeryDay({...base,postopBedsOccupied:40}),/occupancy/);assert.throws(()=>validateSurgeryDay({...base,rut:"123"}),/prohibited/)});
