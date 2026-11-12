/**
 * HealthEye: surgical-day capacity check. Illustrative operational bounds only.
 * Ward and PACU capacity are independent from aggregate ED census.
 * No allocation of individual patients or clinical/surgical scheduling.
 */
const count=(x,name)=>{if(!Number.isInteger(x)||x<0)throw new RangeError(name+" must be nonnegative integer");return x};
const required=["scheduledCases","staffedORs","casesPerOR","sterileSets","pacuSlots","pacuTurns","postopBedsEffective","postopBedsOccupied","postopDischargesConfirmed"];
export function validateSurgeryDay(d){
  if(!d||typeof d!=="object")throw new TypeError("surgical day required");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date||"")||!Number.isFinite(Date.parse(d.date+"T00:00:00Z")))throw new Error("invalid date");
  if(typeof d.facility!=="string"||!d.facility)throw new Error("facility required");
  if(typeof d.source!=="string"||!d.source)throw new Error("source required");
  for(const k of required)count(d[k],k);
  if(d.postopBedsOccupied>d.postopBedsEffective)throw new Error("post-op occupancy exceeds effective beds");
  if(d.postopDischargesConfirmed>d.postopBedsOccupied)throw new Error("post-op confirmed discharges exceed occupied");
  if(Object.hasOwn(d,"patientId")||Object.hasOwn(d,"patientName")||Object.hasOwn(d,"rut"))throw new Error("patient identifiers prohibited");
  if(d.caseMix!=="uniform-demo")throw new Error("v0 model supports only uniform-demo aggregate assumption");
  return Object.freeze({...d});
}
export function evaluateSurgeryDay(d){
  const x=validateSurgeryDay(d);
  const limits={
    scheduled:x.scheduledCases,
    staffedORCapacity:x.staffedORs*x.casesPerOR,
    sterileSets:x.sterileSets,
    pacuCapacity:x.pacuSlots*x.pacuTurns,
    postopBedsAvailable:x.postopBedsEffective-x.postopBedsOccupied+x.postopDischargesConfirmed,
  };
  const potentialCases=Math.min(...Object.values(limits));
  const limitingResources=Object.entries(limits).filter(([k,v])=>v===potentialCases).map(([k])=>k);
  return {
    facility:x.facility,date:x.date,source:x.source,
    limits,upperBoundCases:potentialCases,
    gapToSchedule:Math.max(0,x.scheduledCases-potentialCases),
    limitingResources,
    flags:limitingResources.filter(k=>k!=="scheduled").map(k=>({code:"REVIEW_"+k,severity:"review"})),
    limitations:"Aggregate upper bound only; does not account for specialty, case duration, acuity, infection control, recovery time, staff skill mix, cancellations or patient-level care.",
  };
}
export function draftSurgeryCoordination(d){
  const r=evaluateSurgeryDay(d);
  const owners={
    staffedORCapacity:"Coordinación de pabellones y dotación",
    sterileSets:"Esterilización e insumos",
    pacuCapacity:"Recuperación anestésica y enfermería",
    postopBedsAvailable:"Gestión de camas y equipos tratantes",
  };
  const actions=r.limitingResources.filter(k=>k!=="scheduled").map(k=>({
    id:"review-"+k,ownerRole:owners[k],reason:k,
    proposal:"Verificar disponibilidad, compatibilidad y posibilidades operacionales según protocolo local",
    requiresHumanApproval:true,
  }));
  return {assessment:r,actions,status:"PROPOSED_ONLY",warning:"No programa cirugía, no decide alta ni asigna cama a un paciente."};
}
