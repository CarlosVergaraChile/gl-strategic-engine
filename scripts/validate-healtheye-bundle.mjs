import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root=path.resolve(process.argv[2]||"dist/healtheye");
const pages=["index.html","semanal.html","compromisos.html","verificar.html"];
let checks=0;
for(const page of pages){
 const full=path.join(root,page);
 assert.ok(fs.existsSync(full),"missing page: "+page);
 const html=fs.readFileSync(full,"utf8");
 assert.match(html,/<script type="module">/,"missing module script: "+page);
 for(const [,specifier] of html.matchAll(/\bimport\s+.*?\s+from\s+["']([^"']+)["']/g)){
  const target=path.resolve(root,specifier);
  assert.ok(target.startsWith(root+path.sep),"import escapes artifact: "+specifier);
  assert.ok(fs.existsSync(target),"missing JS in "+page+": "+specifier);
  checks++;
 }
}
const modules=path.join(root,"adapters/health");
for(const file of fs.readdirSync(modules).filter(x=>x.endsWith(".js"))){
 const full=path.join(modules,file),js=fs.readFileSync(full,"utf8");
 for(const [,specifier] of js.matchAll(/\bfrom\s+["'](\.[^"']+)["']/g)){
  assert.ok(fs.existsSync(path.resolve(modules,specifier)),"missing nested module "+file+":"+specifier);
  checks++;
 }
}
const version=JSON.parse(fs.readFileSync(path.join(root,"version.json"),"utf8"));
assert.equal(version.product,"HealthEye");
assert.equal(version.release,"v0.5-rc");
assert.ok(/^[a-f0-9]{40}$/.test(version.commit),"missing commit SHA");
console.log("HealthEye bundle: "+pages.length+" pages, "+checks+" imports, "+version.release+" "+version.commit);
