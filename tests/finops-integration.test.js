import test from "node:test";
import assert from "node:assert/strict";
import {evaluateGraph} from "../core/graph-v3.js";
import {evaluateFinops,finopsUncertainty} from "../adapters/finops/index.js";

test("topological ordering resolves out-of-order nodes",()=>{
  const o=evaluateGraph({inputs:{x:3},nodes:{z:s=>s.y+5,y:s=>s.x*2},dependencies:{z:["y"],y:["x"]}});
  assert.equal(o.z,11);
});
test("cycles and missing definitions rejected",()=>{
  assert.throws(()=>evaluateGraph({inputs:{},nodes:{a:s=>s.b,b:s=>s.a},dependencies:{a:["b"],b:["a"]}}),/cycle/);
  assert.throws(()=>evaluateGraph({inputs:{},nodes:{a:s=>s.b},dependencies:{a:["b"]}}),/missing node/);
});
test("finops illustrative nodes computed reproducibly",()=>{
  const a=evaluateFinops();
  assert.ok(Number.isFinite(a.nodes.ebitda));
  assert.equal(a.nodes.volumen_colocaciones,0.15*150000000);
  assert.deepEqual(a,evaluateFinops());
});
test("finops stochastic evaluation deterministic",()=>{
  const args={seed:29,iterations:100,distributions:{tasa_aprobacion:{type:"triangular",min:10,mode:15,max:24}}};
  assert.deepEqual(finopsUncertainty(args),finopsUncertainty(args));
});
test("financial semantics remain explicitly illustrative",()=>{
  const x=evaluateFinops();
  assert.equal(x.kind,"illustrative-model");
  assert.match(x.caveat,/not validated/);
});
