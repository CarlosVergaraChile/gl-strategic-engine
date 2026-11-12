/**
 * HealthEye weekly tactical review v0.4.
 * Inputs: independently validated aggregate daily snapshots.
 * Outputs: frequencies of review signals, not clinical recommendations,
 * counts of unique patients, inferred causal impact, or service quality.
 */
import {evaluateIntegratedDay} from "./integrated-flow.js";

const nonnegativeInt=(x,label)=>{
  if(!Number.isInteger(x)||x<0)throw new RangeError(label+" must be nonnegative integer");
};
function mondayUTC(date){
  const d=new Date(date+"T12:00:00Z");
  if(!Number.isFinite(d.getTime()))throw new RangeError("invalid date");
  const day=(d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-day);
  return d.toISOString().slice(0,10);
}
const DEFINITION=[
  {id:"ed-capacity-gap",label:"Brecha urgencia tras altas confirmadas",domain:"Urgencia–cama–alta",
   ownerRole:"Gestión de camas / Urgencia",
   reviewQuestion:"¿Qué restricciones impiden disponer de camas compatibles y con dotación?"},
  {id:"discharge-verification",label:"Altas previstas sin confirmar",domain:"Urgencia–cama–alta",
   ownerRole:"Equipos tratantes / Gestión de camas",
   reviewQuestion:"¿Qué verificaciones clínicas y logísticas siguen pendientes?"},
  {id:"ed-delay",label:"Espera agregada superior a 12 horas",domain:"Urgencia–cama–alta",
   ownerRole:"Urgencia / Coordinación de hospitalización",
   reviewQuestion:"¿Qué traspasos o exámenes generan las esperas más prolongadas?"},
  {id:"surgery-capacity-gap",label:"Capacidad quirúrgica teórica inferior a lo programado",domain:"Pabellones–recuperación",
   ownerRole:"Programación / Pabellones",
   reviewQuestion:"¿Dónde aparece la restricción y es realmente aplicable al tipo de cirugía?"},
];
const definition=Object.fromEntries(DEFINITION.map(x=>[x.id,x]));
function rawSignals(evaluated,raw){
  const signals=[];
  if(evaluated.emergency.unmetAfterConfirmedDischarges>0)signals.push("ed-capacity-gap");
  if(evaluated.emergency.unconfirmedDischarges>0)signals.push("discharge-verification");
  if(evaluated.emergency.flags.some(x=>x.code==="ED_WAIT_12H"))signals.push("ed-delay");
  if(evaluated.surgery.gapToSchedule>0)signals.push("surgery-capacity-gap");
  return signals.map(id=>({...definition[id],date:evaluated.date,
    source:raw.ed.source,provenance:evaluated.provenance}));
}
export function reviewWeeklyOperations(input,{minObservedDays=5}={}){
  if(!Array.isArray(input)||!input.length)throw new Error("nonempty daily series required");
  nonnegativeInt(minObservedDays,"minObservedDays");
  const rows=input.map(raw=>({raw,out:evaluateIntegratedDay(raw)}));
  const facility=rows[0].out.facility,provenance=rows[0].out.provenance;
  const week=mondayUTC(rows[0].out.date);
  const dates=new Set();
  for(const {out} of rows){
    if(out.facility!==facility)throw new Error("mixed facilities prohibited");
    if(out.provenance!==provenance)throw new Error("mixed synthetic/observed sources prohibited");
    if(mondayUTC(out.date)!==week)throw new Error("weekly review requires one ISO week");
    if(dates.has(out.date))throw new Error("duplicate daily snapshot");
    dates.add(out.date);
  }
  const ordered=rows.sort((a,b)=>a.out.date.localeCompare(b.out.date));
  const signalRows=ordered.flatMap(({raw,out})=>rawSignals(out,raw));
  const signals=DEFINITION.map(def=>{
    const matching=signalRows.filter(x=>x.id===def.id);
    const counts=matching.length;
    return {...def,daysFlagged:counts,daysReported:ordered.length,
      shareOfReportedDays:counts/ordered.length,
      dates:matching.map(x=>x.date),status:counts>0?"REVIEW":"NO_SIGNAL_IN_REPORTED_DAYS"};
  });
  const bottlenecks={};
  for(const {out} of ordered)for(const b of out.surgery.limitingResources){
    if(b==="scheduled")continue;
    bottlenecks[b]=(bottlenecks[b]||0)+1;
  }
  const dayCount=ordered.length,possibleDays=7;
  const quality={daysReported:dayCount,expectedCalendarDays:possibleDays,
    daysMissing:possibleDays-dayCount,hasSufficientCoverage:dayCount>=minObservedDays,
    provenance,sourceLabels:[...new Set(ordered.map(x=>x.raw.ed.source))],
    missingDates:[]};
  for(let i=0;i<7;i++){
    const dt=new Date(week+"T12:00:00Z");dt.setUTCDate(dt.getUTCDate()+i);
    const day=dt.toISOString().slice(0,10);
    if(!dates.has(day))quality.missingDates.push(day);
  }
  return {
    facility,weekStarting:week,weekEnding:(()=>{
      const d=new Date(week+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+6);
      return d.toISOString().slice(0,10);
    })(),
    provenance,quality,signals,
    surgicalLimitingResources:bottlenecks,
    proposedAgenda:signals.filter(x=>x.daysFlagged>0).map(x=>({
      topicId:x.id,ownerRole:x.ownerRole,question:x.reviewQuestion,
      evidence:`${x.daysFlagged}/${dayCount} jornadas reportadas`,
      approvalRequired:true,
      estimatedBenefit:null,implementationEffort:null,priorityScore:null,
    })),
    caution:"Counts are days with model-defined review signals; not unique patients, avoidable cancellations, estimated benefits, or causal evidence. No clinical actions are authorized."
  };
}
export function makeWeeklyReviews(series,options={}){
  if(!Array.isArray(series)||!series.length)throw new Error("daily series required");
  const groups=new Map();
  for(const day of series){
    const key=day.facility+"|"+mondayUTC(day.date);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(day);
  }
  return [...groups.values()].map(group=>reviewWeeklyOperations(group,options))
    .sort((a,b)=>a.weekStarting.localeCompare(b.weekStarting));
}
