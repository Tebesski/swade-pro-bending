import test from "node:test";
import assert from "node:assert/strict";
import {awarenessEffect} from "../scripts/awareness.mjs";
import {suppressesFlag} from "../../swade-better-effects/scripts/flag-changes.mjs";

const flags=["light-cover-penalty","dim-light-penalty","medium-cover-penalty","dark-light-penalty","heavy-cover-penalty","pitch-dark-light-penalty"];
for(const [strong,count] of [["none",2],["medium",4],["heavy",6]])test(`Awareness ${strong}: correct Suppress flags`,()=>{
  const effect=awarenessEffect({strong});
  assert.equal(effect.system.changes.length,1);
  assert.equal(effect.system.changes[0].key,"sbe.suppress");
  assert.deepEqual(flags.map(flag=>suppressesFlag([effect],flag)),flags.map((_flag,i)=>i<count));
  assert.equal(suppressesFlag([effect],"wounds"),false);
  effect.disabled=true;
  assert.equal(suppressesFlag([effect],flags[0]),false);
  effect.disabled=false;
  effect.duration.expired=true;
  assert.equal(suppressesFlag([effect],flags[0]),false);
});
test("Duration modifier changes 5 rounds to 1 minute",()=>{
  assert.deepEqual(awarenessEffect().duration,{value:5,units:"rounds",expiry:"turnEnd"});
  assert.deepEqual(awarenessEffect({extended:true}).duration,{value:1,units:"minutes",expiry:"turnEnd"});
  assert.throws(()=>awarenessEffect({strong:"invalid"}));
});
