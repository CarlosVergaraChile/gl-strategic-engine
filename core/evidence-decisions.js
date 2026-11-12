/**
 * Evidence guard for operational decision models.
 * Statistical reference data must NEVER silently become local model calibration.
 */
const VALID_KINDS = new Set(["observed","official_aggregate","synthetic","assumption"]);
export function validateEvidence(record) {
  if (!record || typeof record !== "object") throw new TypeError("evidence object required");
  const fields=["id","source","sourceUrl","observedAt","unit","geography","population","period","kind"];
  for (const field of fields) if (!record[field] || typeof record[field] !== "string") throw new Error("missing evidence field: "+field);
  if (!VALID_KINDS.has(record.kind)) throw new Error("invalid evidence kind");
  if (!Number.isFinite(record.value)) throw new Error("evidence value must be finite");
  if (!Number.isFinite(Date.parse(record.observedAt))) throw new Error("invalid observedAt");
  if (!/^https:\/\//.test(record.sourceUrl)) throw new Error("sourceUrl must be HTTPS");
  return Object.freeze({...record});
}

export function assessCalibrationFit(evidence, target) {
  validateEvidence(evidence);
  for (const field of ["unit","geography","population","period"]) {
    if (!target || typeof target[field] !== "string" || !target[field]) throw new Error("target missing "+field);
  }
  const mismatches=["unit","geography","population","period"]
    .filter(field=>evidence[field]!==target[field]);
  const canCalibrate=evidence.kind==="observed" && mismatches.length===0
    && evidence.qualityApproved===true;
  return {
    canCalibrate,
    mismatches,
    reasons:[
      ...(evidence.kind!=="observed"?["source is not direct local observations"]:[]),
      ...(evidence.qualityApproved!==true?["data quality not approved"]:[]),
      ...mismatches.map(x=>"scope mismatch: "+x),
    ],
    permittedUse:canCalibrate?"candidate local calibration input":"external reference or sanity check only",
  };
}

export function createDecisionRecord({decisionId,vertical,observedData,modelVersion,
  assumptionsVersion,asOf,horizon,candidates,selectedAction=null,approvedBy=null}) {
  if (![decisionId,vertical,modelVersion,assumptionsVersion,asOf,horizon].every(x=>typeof x==="string"&&x.length>0))
    throw new Error("decision identifiers and versions required");
  if (!Number.isFinite(Date.parse(asOf))) throw new Error("invalid asOf");
  if (!Array.isArray(observedData)||!Array.isArray(candidates)||!candidates.length)
    throw new Error("observedData and nonempty candidates required");
  for (const ev of observedData) validateEvidence(ev);
  if (selectedAction!==null && !candidates.some(x=>x.id===selectedAction)) throw new Error("unknown action");
  if (selectedAction!==null && (!approvedBy || typeof approvedBy!=="string"))
    throw new Error("human approval required to select an action");
  return Object.freeze({decisionId,vertical,modelVersion,assumptionsVersion,asOf,horizon,
    evidenceIds:observedData.map(x=>x.id),candidates,selectedAction,approvedBy,
    status:selectedAction===null?"PROPOSED":"APPROVED",
    resultObserved:null});
}
export function appendObservedOutcome(decision, {observedAt,metric,unit,value,evidenceId}) {
  if (decision.status!=="APPROVED") throw new Error("decision not approved");
  if (![observedAt,metric,unit,evidenceId].every(x=>typeof x==="string"&&x))
    throw new Error("outcome metadata required");
  if (!Number.isFinite(Date.parse(observedAt))||!Number.isFinite(value)) throw new Error("invalid outcome");
  return {...decision,status:"REVIEWED",resultObserved:{observedAt,metric,unit,value,evidenceId}};
}
