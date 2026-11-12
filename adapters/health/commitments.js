/**
 * HealthEye management commitments v0.1.
 * Pure functions for weekly management agreements, without clinical data.
 * Persistence/authentication must be implemented by an authorized backend before multiuser use.
 */
const STATUSES=["pending","in_progress","blocked","completed","cancelled"];
function date(s){return typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s}
function mustText(s,name){if(typeof s!=="string"||!s.trim()||s.length>500)throw Error(name+" required (max 500 chars)")}
export function createCommitment({id,facility,weekStarting,topicId,title,ownerRole,owner,createdAt,dueDate,evidence="",status="pending",notes=""}){
 for(const [s,n] of [[id,"id"],[facility,"facility"],[topicId,"topicId"],[title,"title"],[ownerRole,"ownerRole"],[owner,"owner"]])mustText(s,n);
 if(!date(weekStarting)||!date(dueDate)||dueDate<weekStarting)throw Error("invalid commitment dates");
 if(!createdAt||!Number.isFinite(Date.parse(createdAt)))throw Error("createdAt required");
 if(!STATUSES.includes(status))throw Error("invalid status");
 if(typeof evidence!=="string"||evidence.length>3000||typeof notes!=="string"||notes.length>3000)throw Error("invalid notes/evidence");
 if(status==="completed"&&!evidence.trim())throw Error("evidence required to complete");
 return Object.freeze({id,facility,weekStarting,topicId,title,ownerRole,owner,createdAt,dueDate,evidence,status,notes,history:[{status,at:createdAt,by:owner}]});
}
export function updateCommitment(item,{status,evidence=item.evidence,notes=item.notes,at,by}){
 if(!item||!STATUSES.includes(status))throw Error("invalid transition status");
 mustText(by,"actor");if(!at||!Number.isFinite(Date.parse(at)))throw Error("timestamp required");
 if(new Date(at).getTime()<new Date(item.createdAt).getTime())throw Error("update precedes creation");
 if(["completed","cancelled"].includes(item.status))throw Error("closed commitment cannot be altered");
 if(status==="completed"&&(!evidence||!evidence.trim()))throw Error("completion evidence required");
 if(typeof evidence!=="string"||evidence.length>3000||typeof notes!=="string"||notes.length>3000)throw Error("invalid evidence/notes");
 return Object.freeze({...item,status,evidence,notes,history:[...item.history,{status,at,by}]});
}
export function commitmentDashboard(items,asOf){
 if(!Array.isArray(items)||!date(asOf))throw Error("items and asOf date required");
 const unique=new Set();
 for(const it of items){
  if(unique.has(it.id))throw Error("duplicate commitment id");
  unique.add(it.id);
  if(!STATUSES.includes(it.status))throw Error("invalid commitment");
 }
 const completed=items.filter(x=>x.status==="completed");
 const overdue=items.filter(x=>!["completed","cancelled"].includes(x.status)&&x.dueDate<asOf);
 const due=items.filter(x=>!["completed","cancelled"].includes(x.status)&&x.dueDate===asOf);
 const withValidEvidence=completed.filter(x=>x.evidence?.trim()).length;
 return {total:items.length,completed:completed.length,open:items.filter(x=>!["completed","cancelled"].includes(x.status)).length,
  overdue:overdue.length,dueToday:due.length,completedWithEvidence:withValidEvidence,
  completionRate:items.length?completed.length/items.length:null,
  overdueIds:overdue.map(x=>x.id),
  note:"Administrative completion tracking only, not evidence of clinical or financial benefit."};
}
export function exportCommitmentsCSV(items){
 const cols=["id","facility","weekStarting","topicId","title","ownerRole","owner","dueDate","status","evidence","notes"];
 const q=v=>'"'+String(v??"").replaceAll('"','""')+'"';
 return "\uFEFF"+[cols.join(";"),...items.map(it=>cols.map(k=>q(it[k])).join(";"))].join("\r\n");
}
