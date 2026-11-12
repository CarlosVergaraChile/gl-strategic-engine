/**
 * Four-week SYNTHETIC generator. Not sampled from HEC, MINSAL or NHS records.
 * Deterministic PRNG; generates coordinated but independently scoped
 * daily ED/ward and surgical/PACU/postop capacity observations.
 */
function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
const bounded=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function generateSyntheticHospitalDays({seed=20261112,startDate="2026-10-12",days=28,facility="Hospital SIMULADO"}={}){
  if(!Number.isInteger(seed)||!Number.isInteger(days)||days<1||days>366)throw new Error("invalid generator parameters");
  const start=new Date(startDate+"T12:00:00Z");if(!Number.isFinite(start.getTime()))throw new Error("invalid startDate");
  const random=rng(seed), out=[];
  for(let i=0;i<days;i++){
    const dt=new Date(start.getTime()+86400000*i),date=dt.toISOString().slice(0,10);
    const weekend=[0,6].includes(dt.getUTCDay());
    const physicalBeds=100,enabledBeds=92,staffedBeds=weekend?80:84,blockedBeds=2+Math.floor(random()*6);
    const effective=staffedBeds-blockedBeds;
    const occupiedBeds=bounded(Math.round(effective*(0.86+random()*.11)),0,effective);
    const expectedDischarges=bounded(Math.round(occupiedBeds*(0.07+random()*.065)),0,occupiedBeds);
    const confirmedDischarges=bounded(Math.round(expectedDischarges*(0.55+random()*.35)),0,expectedDischarges);
    const edPatientsAwaitingBed=5+Math.floor(random()*18);
    const recordedAt=date+"T08:00:00Z";
    const ed={date,facility,source:"SYNTHETIC_HEALTHEYE_V1",recordedAt,
      physicalBeds,enabledBeds,staffedBeds,blockedBeds,occupiedBeds,
      edPatientsAwaitingBed,edPatientsAwaitingBedSinceHours:3+Math.floor(random()*20),
      expectedDischarges,confirmedDischarges};
    const postopBedsEffective=25,postopBedsOccupied=17+Math.floor(random()*7);
    const postopDischargesConfirmed=Math.floor(random()*Math.min(5,postopBedsOccupied)+0.5);
    const surgery={date,facility,source:"SYNTHETIC_HEALTHEYE_V1",caseMix:"uniform-demo",
      scheduledCases:weekend?0:10+Math.floor(random()*8),
      staffedORs:weekend?0:3+Math.floor(random()*2),casesPerOR:4,
      sterileSets:weekend?0:9+Math.floor(random()*8),
      pacuSlots:weekend?0:3+Math.floor(random()*2),
      pacuTurns:weekend?0:3,
      postopBedsEffective,postopBedsOccupied,postopDischargesConfirmed};
    out.push({date,facility,provenance:"synthetic",ed,surgery});
  }
  return {schema:"healtheye-synthetic-v1",provenance:"synthetic",
    provenanceWarning:"FICTITIOUS DATA; not HEC, MINSAL or FONASA",
    seed,startDate,days,records:out};
}
