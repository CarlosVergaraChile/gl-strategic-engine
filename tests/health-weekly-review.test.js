import test from "node:test";
import assert from "node:assert/strict";
import {generateSyntheticHospitalDays} from "../adapters/health/synthetic-source.js";
import {reviewWeeklyOperations,makeWeeklyReviews} from "../adapters/health/weekly-review.js";

const data=generateSyntheticHospitalDays({startDate:"2026-10-12",days:28,seed:77}).records;
test("28 days produce four isolated ISO weekly reviews",()=>{
 const weeks=makeWeeklyReviews(data);
 assert.equal(weeks.length,4);
 assert.ok(weeks.every(w=>w.quality.daysReported===7));
 assert.ok(weeks.every(w=>w.quality.daysMissing===0));
 assert.equal(weeks[0].weekStarting,"2026-10-12");
});
test("weekly counts are frequencies, never patient counts",()=>{
 const week=reviewWeeklyOperations(data.slice(0,7));
 assert.ok(week.signals.every(x=>x.daysFlagged<=7));
 assert.ok(week.proposedAgenda.every(a=>a.estimatedBenefit===null&&a.priorityScore===null));
 assert.match(week.caution,/not unique patients/);
});
test("missing days are explicit and change denominator",()=>{
 const review=reviewWeeklyOperations(data.slice(0,7).filter(x=>x.date!=="2026-10-15"));
 assert.equal(review.quality.daysMissing,1);
 assert.deepEqual(review.quality.missingDates,["2026-10-15"]);
 assert.ok(review.signals.every(x=>x.daysReported===6));
});
test("mix of institutions or data kinds is rejected",()=>{
 const other={...data[1],facility:"Another",ed:{...data[1].ed,facility:"Another"},surgery:{...data[1].surgery,facility:"Another"}};
 assert.throws(()=>reviewWeeklyOperations([data[0],other]),/mixed facilities/);
 assert.throws(()=>reviewWeeklyOperations([data[0],{...data[1],provenance:"observed"}]),/mixed synthetic\/observed/);
});
test("duplicate snapshot and crossed week rejected",()=>{
 assert.throws(()=>reviewWeeklyOperations([data[0],data[0]]),/duplicate/);
 assert.throws(()=>reviewWeeklyOperations([data[0],data[8]]),/one ISO week/);
});
test("no unjustified risk ranking",()=>{
 const x=reviewWeeklyOperations(data.slice(0,7));
 assert.ok(x.proposedAgenda.every(a=>a.approvalRequired));
 assert.ok(x.proposedAgenda.every(a=>a.implementationEffort===null));
});
test("independent deterministic output for same daily inputs",()=>{
 assert.deepEqual(makeWeeklyReviews(data),makeWeeklyReviews(data));
});
