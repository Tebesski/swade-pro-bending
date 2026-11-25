import assert from "node:assert/strict";
import {test} from "node:test";
import {shiftTrait,traitEffect} from "../scripts/trait-effects.mjs";

test("Trait steps support d4, d12+, and separate fixed roll modifiers",()=>{
  assert.deepEqual(shiftTrait({sides:12,modifier:0},1),{sides:12,modifier:1});
  assert.deepEqual(shiftTrait({sides:12,modifier:1},1),{sides:12,modifier:2});
  assert.deepEqual(shiftTrait({sides:12,modifier:1},2),{sides:12,modifier:3});
  assert.deepEqual(shiftTrait({sides:12,modifier:0},2),{sides:12,modifier:2});
  assert.deepEqual(shiftTrait({sides:12,modifier:2},-1),{sides:12,modifier:1});
  assert.deepEqual(shiftTrait({sides:12,modifier:1},-2),{sides:10,modifier:0});
  assert.deepEqual(shiftTrait({sides:6,modifier:2},1),{sides:8,modifier:2});
  assert.deepEqual(shiftTrait({sides:4,modifier:0},-2),{sides:4,modifier:0});
});

test("Boost effects increase attribute and skill modifiers above d12",()=>{
  for (const trait of [{type:"attribute",key:"agility",name:"Agility"},{type:"skill",id:"BendingId",key:"bending",name:"Bending"}]) {
    for (const modifier of [0,1,2]) for (const raised of [false,true]) {
      const effect=traitEffect({trait,die:{sides:12,modifier},raised});
      assert.equal(effect.system.changes.length,1);
      const change=effect.system.changes[0];
      assert.ok(change.key.endsWith("die.modifier") || change.key.endsWith("die.modifier]"));
      assert.equal(change.type,"subtract");
      assert.equal(modifier-Number(change.value),modifier+(raised?2:1));
    }
  }
});

test("Raised Strong Lower uses Better Effects recovery and two exclusive penalty stages",()=>{
  const effect=traitEffect({trait:{type:"attribute",key:"agility",name:"Agility"},die:{sides:8,modifier:0},lower:true,strong:true,raised:true});
  const flags=effect.flags["swade-better-effects"];
  const config=flags.lingering;
  assert.equal(config.required,2);
  assert.equal(config.modifier,-2);
  assert.equal(config.followingTurns,true);
  assert.equal(config.timing,"end");
  assert.equal(config.outcomes.success.progress,1);
  assert.equal(config.raises[0].threshold,1);
  assert.equal(config.raises[0].progress,2);
  assert.equal(effect.system.changes.length,2);
  assert.equal(flags.conditions[0].predicate.flag,"strong-lower-agility-raise-1-2-successes");
  assert.equal(flags.conditions[0].predicate.op,"flag");
  assert.equal(flags.conditions[1].predicate.op,"not");
});

test("Lowering d6 stops at d4 and requires only one recovery success",()=>{
  const trait={type:"skill",id:"FightingId",key:"fighting",name:"Fighting"};
  const effect=traitEffect({trait,die:{sides:6,modifier:0},lower:true,raised:true});
  assert.equal(effect.flags["swade-better-effects"].lingering.required,1);
  assert.equal(effect.system.changes[0].key,"@Skill{FightingId}[system.die.sides]");
  assert.equal(effect.system.changes[0].value,"2");
  assert.equal(traitEffect({trait,die:{sides:4,modifier:0},lower:true}),null);
});
