/**
 * HealthEye daily operational flow contract (experimental, non-clinical).
 * Aggregate-only; no patient IDs/names, no clinical treatment recommendations.
 * Beds are effective only when physically enabled AND staffed.
 */
const FIELDS=["physicalBeds","enabledBeds","staffedBeds","occupiedBeds",
  "blockedBeds","edPatientsAwaitingBed","expectedDischarges","confirmedDischarges"];
function whole(x,k){if(!Number.isInteger(x)||x<0)throw new RangeError(k+" must be a nonnegative integer");}
export function validateDailyCensus(d){
 if(!d||typeof d!=="object")throw new TypeError("census required");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date||"")||!Number.isFinite(Date.parse(d.date+"T00:00:00Z")))throw new Error("invalid census date");
 if(!d.facility||typeof d.facility!=="string")throw new Error("facility required");
 if(!d.source||typeof d.source!=="string")throw new Error("source required");
 if(!d.recordedAt||!Number.isFinite(Date.parse(d.recordedAt)))throw new Error("recordedAt required");
 for(const k of FIELDS)whole(d[k],k);
 if(d.enabledBeds>d.physicalBeds)throw new Error("enabled beds exceed physical beds");
 if(d.staffedBeds>d.enabledBeds)throw new Error("staffed beds exceed enabled beds");
 if(d.blockedBeds>d.staffedBeds)throw new Error("blocked beds exceed staffed beds");
 const effectiveBeds=d.staffedBeds-d.blockedBeds;
 if(d.occupiedBeds>effectiveBeds)throw new Error("occupied beds exceed effective beds");
 if(d.confirmedDischarges>d.expectedDischarges)throw new Error("confirmed discharges exceed expected");
 if(d.expectedDischarges>d.occupiedBeds)throw new Error("expected discharges exceed census");
 if(d.edPatientsAwaitingBed>0 && d.edPatientsAwaitingBedSinceHours===undefined)throw new Error("ED waiting duration aggregate required");
 if(d.edPatientsAwaitingBedSinceHours!==undefined){
   if(!Number.isFinite(d.edPatientsAwaitingBedSinceHours)||d.edPatientsAwaitingBedSinceHours<0)throw new Error("invalid ED wait duration");
 }
 const prohibited=["patientId","patientName","rut","diagnosis","medicalRecord"];
 for(const k of prohibited)if(Object.hasOwn(d,k))throw new Error("personal or clinical field prohibited: "+k);
 return Object.freeze({...d,effectiveBeds,availableNow:effectiveBeds-d.occupiedBeds});
}
export function assessDailyFlow(d){
 const x=validateDailyCensus(d);
 const projectedConfirmed=Math.min(x.effectiveBeds,x.availableNow+x.confirmedDischarges);
 const projectedUncertain=Math.min(x.effectiveBeds,x.availableNow+x.expectedDischarges);
 const unmetNow=Math.max(0,x.edPatientsAwaitingBed-x.availableNow);
 const unmetConfirmed=Math.max(0,x.edPatientsAwaitingBed-projectedConfirmed);
 const gapDueToUnconfirmedDischarges=x.expectedDischarges-x.confirmedDischarges;
 const flags=[];
 if(x.edPatientsAwaitingBed>0 && x.edPatientsAwaitingBedSinceHours>=12)
   flags.push({code:"ED_WAIT_12H",severity:"review",message:"Review aggregate emergency wait exceeding 12 hours"});
 if(unmetConfirmed>0)flags.push({code:"CAPACITY_GAP",severity:"review",message:"Demand exceeds available plus confirmed discharges"});
 if(gapDueToUnconfirmedDischarges>0 && unmetConfirmed>0)
   flags.push({code:"DISCHARGE_UNCERTAINTY",severity:"review",message:"Potential but unconfirmed discharges are not available beds"});
 return {facility:x.facility,date:x.date,source:x.source,recordedAt:x.recordedAt,
   effectiveBeds:x.effectiveBeds,availableNow:x.availableNow,
   projectedWithConfirmedDischarges:projectedConfirmed,
   projectedIfAllExpectedDischargesOccur:projectedUncertain,
   unmetNow,unmetAfterConfirmedDischarges:unmetConfirmed,
   unconfirmedDischarges:gapDueToUnconfirmedDischarges,flags,
   completeness:"complete-for-aggregate-census",
   limitations:"No bed-patient matching, specialty, infection control, staffing-by-shift, transport, or clinical discharge readiness."};
}
export function draftDailyCoordination(d){
 const r=assessDailyFlow(d), actions=[];
 if(r.unmetAfterConfirmedDischarges>0){
   actions.push({id:"verify-bed-readiness",ownerRole:"Bed management and nursing",
     proposal:"Verify effective and compatible bed availability before considering assignments",
     evidenceCode:"CAPACITY_GAP",kind:"coordination",requiresHumanApproval:true});
 }
 if(r.unconfirmedDischarges>0){
   actions.push({id:"verify-discharge-status",ownerRole:"Treating teams and bed management",
     proposal:"Review which expected discharges have confirmed clinical and operational readiness",
     evidenceCode:"DISCHARGE_UNCERTAINTY",kind:"coordination",requiresHumanApproval:true});
 }
 if(r.flags.some(f=>f.code==="ED_WAIT_12H")){
   actions.push({id:"review-delayed-transfers",ownerRole:"Emergency and bed management",
     proposal:"Review delayed transfer causes and responsible handoffs under local protocols",
     evidenceCode:"ED_WAIT_12H",kind:"coordination",requiresHumanApproval:true});
 }
 return {date:r.date,facility:r.facility,assessment:r,
   actions,status:"PROPOSED_ONLY",warning:"Not a clinical order; human decision and local policies required."};
}
