/**
 * Local DEMO-only commitments portability; never for patient or institutional data.
 * Only JSON exported by this app. No backend or authenticated users.
 */
import {createCommitment,updateCommitment} from "./commitments.js";
const MAX_ITEMS=300,MAX_BYTES=300000;
export const DEMO_KEY="healtheye-demo-commitments-v1";
function plain(x){return x!==null&&typeof x==="object"&&!Array.isArray(x)}
export function validateDemoItems(items){
  if(!Array.isArray(items)||items.length>MAX_ITEMS)throw new Error("invalid or oversized commitment list");
  const ids=new Set();
  return items.map(item=>{
    if(!plain(item)||typeof item.id!=="string"||ids.has(item.id))throw new Error("invalid or duplicate item");
    ids.add(item.id);
    const needed=["id","facility","weekStarting","topicId","title","ownerRole","owner","createdAt","dueDate","status","evidence","notes","history"];
    if(needed.some(k=>!Object.hasOwn(item,k)))throw new Error("incomplete item");
    if(!Array.isArray(item.history)||item.history.length<1||item.history.length>50)throw new Error("invalid history");
    const baseline=createCommitment({
      id:item.id,facility:item.facility,weekStarting:item.weekStarting,topicId:item.topicId,title:item.title,
      ownerRole:item.ownerRole,owner:item.owner,createdAt:item.createdAt,dueDate:item.dueDate,
      status:"pending",evidence:"",notes:item.notes,
    });
    let current=baseline;
    if(item.history[0].status!=="pending"||item.history[0].at!==item.createdAt)throw new Error("invalid initial history");
    for(const h of item.history.slice(1)){
      if(!plain(h)||typeof h.by!=="string")throw new Error("invalid event");
      current=updateCommitment(current,{status:h.status,at:h.at,by:h.by,
        evidence:h.status==="completed"?item.evidence:"",notes:item.notes});
    }
    if(current.status!==item.status|| (item.status==="completed"&&!item.evidence.trim()))throw new Error("inconsistent last status");
    if(typeof item.evidence!=="string"||item.evidence.length>3000||item.notes.length>3000)throw new Error("oversized text");
    return {...item,history:item.history.map(h=>({status:h.status,at:h.at,by:h.by}))};
  });
}
export function encodeDemoBackup(items){
  const validated=validateDemoItems(items);
  const text=JSON.stringify({schema:"healtheye-commitments-demo-v1",provenance:"synthetic-or-manual-demo",
    warning:"DO NOT STORE PATIENT OR CONFIDENTIAL DATA",items:validated},null,2);
  if(new TextEncoder().encode(text).length>MAX_BYTES)throw new Error("backup too large");
  return text;
}
export function decodeDemoBackup(text){
  if(typeof text!=="string"||new TextEncoder().encode(text).length>MAX_BYTES)throw new Error("invalid/oversized backup");
  const obj=JSON.parse(text);
  if(!plain(obj)||obj.schema!=="healtheye-commitments-demo-v1"||
     obj.provenance!=="synthetic-or-manual-demo")throw new Error("unsupported backup format");
  return validateDemoItems(obj.items);
}
