import test from "node:test";
import assert from "node:assert/strict";
import {maneuverEffects,maneuverTN,resolveManeuver} from "../scripts/maneuver.mjs";
import {restrictionMatches} from "../../swade-better-effects/scripts/restriction-data.mjs";

test("Disarm restricts elemental attacks, with no timer",()=>{
  const [effect]=maneuverEffects();
  assert.equal(effect.name,"Disarm");
  assert.equal(effect.duration.value,null);
  const change=effect.system.changes[0];
  assert.equal(change.key,"sbe.restrict");
  for(const flag of ["elemental-hurl","elemental-assault"])assert.equal(restrictionMatches(change.value,{roll:[flag]}),true);
  assert.equal(restrictionMatches(change.value,{roll:["bending-technique"]}),false);
});
test("Raises pay separately for Prone, both conditions, and extra rounds",()=>{
  const effects=maneuverEffects({mode:"distracted",raises:3,prone:true,both:true,rounds:2});
  assert.deepEqual(effects.map(effect=>effect.name),["Distracted","Vulnerable","Prone"]);
  assert.deepEqual(effects.slice(0,2).map(effect=>effect.duration.value),[2,2]);
  assert.equal(effects[2].duration.value,null);
  assert.throws(()=>maneuverEffects({mode:"distracted",raises:2,prone:true,both:true,rounds:2}),/raises/);
});
test("Invalid choices cannot create effects",()=>{
  for(const options of [{mode:"invalid"},{raises:-1},{mode:"disarm",both:true},{mode:"prone",prone:true},{rounds:1.5}])
    assert.throws(()=>maneuverEffects(options));
});
test("Opposed Agility uses the casting total; a tie resists",async()=>{
  const saved={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
  let applied=0,total=5,requested;
  globalThis.game={modules:{get:()=>({api:{applyEffectTemplate:async()=>{applied++;}}})}};
  globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>{}};
  const actor={uuid:"Actor.opposedQA",isOwner:true,system:{attributes:{}},effects:[],
    rollAttribute:async(_trait,options)=>{requested=options.sbeRequest.targetNumber;return {total};}};
  try {
    await resolveManeuver(actor,actor,{mode:"disarm",castTotal:6});
    assert.equal(requested,6);assert.equal(applied,1);
    total=6;
    await resolveManeuver(actor,actor,{mode:"disarm",castTotal:6});
    assert.equal(applied,1);
    total=8;
    await resolveManeuver(actor,actor,{mode:"disarm",castTotal:10});
    assert.equal(requested,10);assert.equal(applied,2);
    assert.throws(()=>maneuverTN(undefined));assert.throws(()=>maneuverTN(3));
  }finally{globalThis.game=saved.game;globalThis.ChatMessage=saved.ChatMessage;}
});
