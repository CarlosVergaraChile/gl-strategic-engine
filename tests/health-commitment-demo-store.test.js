import test from "node:test";
import assert from "node:assert/strict";
import {createCommitment,updateCommitment} from "../adapters/health/commitments.js";
import {encodeDemoBackup,decodeDemoBackup} from "../adapters/health/commitment-demo-store.js";
const input={id:"demo-a",facility:"Hospital DEMOSTRATIVO",weekStarting:"2026-11-09",topicId:"ed-capacity-gap",
 title:"Revisar censo diario",ownerRole:"Gestión de camas",owner:"Equipo de camas",
 createdAt:"2026-11-09T08:00:00Z",dueDate:"2026-11-14"};
test("manual JSON export/import preserves agreements",()=>{
 const item=createCommitment(input);
 assert.deepEqual(decodeDemoBackup(encodeDemoBackup([item])),[item]);
});
test("closed agreement and evidence survive reload",()=>{
 const item=updateCommitment(createCommitment(input),{status:"completed",evidence:"Acta demostrativa",at:"2026-11-10T10:00:00Z",by:"Equipo"});
 const [reloaded]=decodeDemoBackup(encodeDemoBackup([item]));
 assert.equal(reloaded.status,"completed");assert.equal(reloaded.history.length,2);
});
test("backup refuses manipulated completion without evidence",()=>{
 const obj=JSON.parse(encodeDemoBackup([createCommitment(input)]));
 obj.items[0].status="completed";
 assert.throws(()=>decodeDemoBackup(JSON.stringify(obj)),/inconsistent/);
});
test("backup refuses invalid schema and duplicate ids",()=>{
 const it=createCommitment(input);
 assert.throws(()=>decodeDemoBackup(JSON.stringify({schema:"unknown",items:[it]})),/unsupported/);
 assert.throws(()=>encodeDemoBackup([it,it]),/duplicate/);
});
test("backup enforces size and valid json",()=>{
 assert.throws(()=>decodeDemoBackup("{"),/SyntaxError|JSON/);
 assert.throws(()=>decodeDemoBackup("x".repeat(300001)),/oversized/);
});
