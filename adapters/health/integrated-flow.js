/**
 * Joint daily dashboard. ED beds and post-op beds remain separate pools.
 * No inferred interchangeability, patient-level assignment, or scheduling.
 */
import {draftDailyCoordination} from "./daily-flow.js";
import {draftSurgeryCoordination} from "./surgical-flow.js";
export function evaluateIntegratedDay(day){
  if(!day||day.provenance!=="synthetic" && day.provenance!=="observed")throw new Error("provenance required");
  if(!day.ed||!day.surgery)throw new Error("both ED and surgical observations required");
  if(day.ed.date!==day.surgery.date||day.ed.facility!==day.surgery.facility)
    throw new Error("facility and date must match");
  const ed=draftDailyCoordination(day.ed), surgery=draftSurgeryCoordination(day.surgery);
  return {
    facility:day.ed.facility,date:day.ed.date,provenance:day.provenance,
    emergency:ed.assessment,surgery:surgery.assessment,
    coordination:[...ed.actions.map(x=>({...x,service:"urgencia-cama-alta"})),
      ...surgery.actions.map(x=>({...x,service:"pabellones-recuperacion"}))],
    requiresHumanApproval:true,
    caveat:"Distinct bed pools. No transferable capacity or patient-level admission advice. Clinical teams must validate."};
}
export function summarizeIntegratedSeries(series){
  if(!Array.isArray(series)||!series.length)throw new Error("nonempty records required");
  const records=series.map(evaluateIntegratedDay);
  const unique=new Set(records.map(x=>x.facility+"|"+x.date));
  if(unique.size!==records.length)throw new Error("duplicate facility/date");
  const sorted=[...records].sort((a,b)=>a.date.localeCompare(b.date));
  const unmet=sorted.reduce((s,x)=>s+x.emergency.unmetAfterConfirmedDischarges,0);
  const surgeryGap=sorted.reduce((s,x)=>s+x.surgery.gapToSchedule,0);
  return {
    days:sorted.length,facility:sorted[0].facility,provenance:sorted[0].provenance,
    emergencyUnmetAfterConfirmedDischargesSum:unmet,
    scheduledSurgeryGapUpperBoundSum:surgeryGap,
    daysEDGap:sorted.filter(x=>x.emergency.unmetAfterConfirmedDischarges>0).length,
    daysSurgicalGap:sorted.filter(x=>x.surgery.gapToSchedule>0).length,
    records:sorted,
    warning:"Daily snapshots not unique patients; sum of daily gaps is not a count of people, cancellations or delayed procedures."};
}
