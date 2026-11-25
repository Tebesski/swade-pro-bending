import assert from "node:assert/strict";
import {test} from "node:test";
import {heal} from "../scripts/healing.mjs";

const ID = "swade-pro-bending";
let nextId = 0;
class ForcedDeletion {}
const set = (target,path,value) => {
  const keys = path.split(".");
  const key = keys.pop();
  for (const part of keys) target = target[part] ??= {};
  if (value instanceof ForcedDeletion) delete target[key];
  else if (key.startsWith("-=")) delete target[key.slice(2)];
  else target[key] = value;
};
class Effect {
  constructor(source) {
    this.source=source;
    const {duration,...fields}=source;
    Object.assign(this,fields);
    this.id=source._id;
  }
  get active() { return !this.disabled && !this.source.duration.expired; }
  get isTemporary() { return Number.isFinite(this.source.duration.value); }
  get duration() {
    const duration = this.source.duration;
    return {...duration,secondsRemaining:this.source.start.time+duration.value*3600-game.time.worldTime};
  }
  toObject() { return {...this.source,disabled:this.disabled}; }
}
function patient() {
  return {uuid:`Actor.${++nextId}`,name:"Patient",isOwner:true,flags:{},
    system:{wounds:{value:3,max:3},stats:{size:0}},effects:[],statuses:new Set(),
    allApplicableEffects() { return this.effects; },
    async update(updates) {
      for (const [key,value] of Object.entries(updates)) {
        if (key==="effects") this.effects=value.map(source=>new Effect(source));
        else set(this,key,value);
      }
    },
    async rollAttribute() { return state.natural; }
  };
}
let state;
function setup() {
  state={intensive:0,cast:{total:6},natural:{total:4},accept:true,rolls:0};
  globalThis.game={time:{worldTime:1000},messages:new Map(),modules:new Map([
    ["swade-better-powers",{api:{usesNoPowerPoints:()=>true}}]
  ])};
  globalThis.foundry={data:{operators:{ForcedDeletion}},utils:{randomID:()=>String(++nextId)},applications:{api:{DialogV2:{
    prompt:async()=>new Map([["intensive",state.intensive]]),
    confirm:async options=>options.yes.label==="Treatment time has passed" || state.accept,
    wait:async options=>{
      state.dialogs ??= [];
      state.dialogs.push(options);
      return state.decisions?.shift() ?? (state.accept?"apply":null);
    }
  }}}};
  globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>{}};
  const medic=patient();
  medic.system.attributes={smarts:{die:{sides:6}}};
  medic.itemTypes={power:[{name:"Accelerated Recovery",flags:{[ID]:{key:"accelerated-recovery"}},system:{pp:2}}],skill:[
    {id:"bending",name:"Bending",system:{swid:"bending"}}
  ]};
  medic.rollSkill=async()=>{state.rolls++; return state.cast;};
  return medic;
}

test("Standalone water treatments use the compendium and respect the caster's casting entry",async()=>{
  for (const [mode,key,pp] of [["recovery","accelerated-recovery",2],["water","healing",4]]) {
    const medic=setup(), target=patient();
    const template={_id:key,flags:{[ID]:{key},"swade-better-effects":{tags:["water"]}},system:{pp},name:key};
    game.packs=new Map([[ID+".techniques",{index:[template],getIndex:async()=>{},getDocument:async()=>template}]]);
    medic.itemTypes.power=[];
    medic.itemTypes.skill=[];
    const rolls=[];
    medic.makeUnskilledAttempt=async options=>{rolls.push(options);return state.cast;};
    await heal(mode,medic,[target]);
    assert.equal(rolls[0].item,undefined);
    assert.deepEqual(rolls[0].effectFlags,["water"]);
    assert.deepEqual(rolls[0].additionalMods,[{label:"No Power Points",value:-pp/2}]);
    assert.equal(target.system.wounds.value,2);
    assert.equal(medic.itemTypes.power.length,0);
    medic.flags["swade-better-powers"]={spellcastingEntries:{water:{arcane:"Waterbending",trait:"Bending",noPowerPoints:false}}};
    medic.system.powerPoints={Waterbending:{value:pp}};
    const paidPatient=patient();
    await heal(mode,medic,[paidPatient]);
    assert.equal(medic.system.powerPoints.Waterbending.value,0);
    await assert.rejects(heal(mode,medic,[patient()]),/enough Power Points/);
  }
});

test("Accelerated Recovery uses only its target effect, including expiry and manual controls",async()=>{
  const medic=setup(), target=patient();
  state.natural={total:2};
  target.flags[ID]={treatments:{recovery:999999}};
  await heal("recovery",medic,[target]);
  assert.equal(target.effects.length,1);
  assert.equal(target.effects[0].name,"Accelerated Recovery Immunity");
  assert.deepEqual([target.effects[0].duration.value,target.effects[0].duration.units],[6,"hours"]);
  assert.equal(target.flags[ID].treatments.recovery,undefined);
  const rolls=state.rolls;
  await assert.rejects(heal("recovery",medic,[target]),/Accelerated Recovery Immunity/);
  assert.equal(state.rolls,rolls);
  target.effects[0].disabled=true;
  await heal("recovery",medic,[target]);
  assert.equal(target.effects.length,1);
  assert.equal(target.effects[0].disabled,false);
  target.effects=[];
  await heal("recovery",medic,[target]);
  assert.equal(target.effects.length,1);
  game.time.worldTime+=21600;
  await heal("recovery",medic,[target]);
  assert.equal(target.effects.length,1);
});

test("Recovery immunity follows Intensive Care and critical failures",async()=>{
  const medic=setup();
  for (const [intensive,hours] of [[0,6],[1,3],[2,1]]) {
    state.intensive=intensive;
    const target=patient();
    await heal("recovery",medic,[target]);
    assert.equal(target.effects[0].duration.value,hours);
    assert.equal(target.flags[ID]?.treatments,undefined);
  }
  state.cast={total:2};
  const failed=patient();
  await heal("recovery",medic,[failed]);
  assert.equal(failed.effects[0].duration.value,1);
  state.cast={total:1,isCritfail:true};
  const critical=patient();
  await heal("recovery",medic,[critical]);
  assert.equal(critical.effects[0].duration.value,24);
  state.cast={total:6};
  state.natural={total:1,isCritfail:true};
  const naturalCritical=patient();
  naturalCritical.system.wounds.value=1;
  await heal("recovery",medic,[naturalCritical]);
  assert.equal(naturalCritical.effects[0].duration.value,24);
  assert.equal(naturalCritical.system.wounds.value,2);
});

test("Cancelled results leave no immunity, and queued duplicate treatments stop before rolling",async()=>{
  const medic=setup(), target=patient();
  state.accept=false;
  await heal("recovery",medic,[target]);
  assert.equal(target.effects.length,0);
  state.accept=true;
  state.rolls=0;
  const results=await Promise.allSettled([heal("recovery",medic,[target]),heal("recovery",medic,[target])]);
  assert.equal(results.filter(result=>result.status==="rejected").length,1);
  assert.equal(state.rolls,1);
  assert.equal(target.effects.length,1);
});

test("Treat Patient reuses the chat activation total and modifiers without rolling or charging again",async()=>{
  const medic=setup(), target=patient(), power=medic.itemTypes.power[0];
  power.uuid="Actor.medic.Item.recovery";
  const message={isContentVisible:true,speakerActor:medic,rolls:[{total:7}],
    flags:{[ID]:{roll:{itemUuid:power.uuid}},"swade-tools":{gmmod:1},
      "swade-better-powers":{powerCast:{modifierOptions:{"intensive-care":"pm2",expedite:"pm1"}}}}};
  let bonus;
  target.rollAttribute=async(_attribute,options)=>{
    bonus=options.additionalMods[0].value;
    return {total:4};
  };
  game.modules.get("swade-better-powers").api.usesNoPowerPoints=()=>false;
  await heal("recovery",medic,[target],message);
  assert.equal(state.rolls,0);
  assert.equal(bonus,4);
  assert.equal(target.effects[0].duration.value,1);
  assert.equal(target.effects[0].duration.units,"hours");
});

function rerollable(totals) {
  const [total,...rest]=totals;
  return {total,
    async reroll() { state.rerolls=(state.rerolls??0)+1; return rerollable(rest); },
    async toMessage() { return {rolls:[this],flags:{},speaker:{}}; }
  };
}

test("Free and Benny rerolls can repeat before applying, and use the patient's Bennies for Vigor",async()=>{
  const medic=setup(), target=patient();
  target.bennies=1;
  target.spendBenny=async()=>{target.bennies--;return true;};
  state.natural=rerollable([2,3,5,8]);
  state.decisions=["free","benny","free","apply"];
  await heal("recovery",medic,[target]);
  assert.equal(state.rerolls,3);
  assert.equal(target.bennies,0);
  assert.equal(target.system.wounds.value,1);
  assert.equal(target.effects.length,1);
  assert.equal(state.dialogs[2].buttons.find(button=>button.action==="benny").disabled,true);
  assert.ok(state.dialogs[0].buttons.some(button=>button.action==="force"));
  assert.ok(!state.dialogs[2].buttons.some(button=>button.action==="force"));
});

test("Failed activation overrides proceed to Vigor with the chosen success or raise bonus",async()=>{
  for (const [choice,bonus] of [["force",2],["raise",4]]) {
    const medic=setup(),target=patient();
    state.cast={total:2};
    state.decisions=[choice,"apply"];
    target.rollAttribute=async(_attribute,options)=>{
      assert.equal(options.additionalMods[0].value,bonus);
      return {total:4};
    };
    await heal("recovery",medic,[target]);
    assert.equal(target.system.wounds.value,2);
  }
});

test("Apply anyway on a failed natural healing roll heals the chosen amount",async()=>{
  for (const [choice,wounds] of [["force",2],["raise",1]]) {
    const medic=setup(),target=patient();
    state.natural={total:2};
    state.decisions=[choice];
    await heal("recovery",medic,[target]);
    assert.equal(target.system.wounds.value,wounds);
  }
});

test("Benny rerolls are blocked at zero even if a stale button is invoked",async()=>{
  const medic=setup(),target=patient();
  target.bennies=0;
  target.spendBenny=async()=>{throw Error("Cannot spend a Benny at zero");};
  state.natural=rerollable([2,8]);
  state.decisions=["benny","apply"];
  await heal("recovery",medic,[target]);
  assert.equal(state.rerolls,undefined);
  assert.equal(target.system.wounds.value,3);
  assert.equal(state.dialogs[0].buttons.find(button=>button.action==="benny").disabled,true);
});

test("Rerolling a failed activation continues treatment without a second activation or extra immunity",async()=>{
  const medic=setup(),target=patient();
  state.cast=rerollable([2,8]);
  state.decisions=["free","apply","apply"];
  target.rollAttribute=async(_attribute,options)=>{
    assert.equal(options.additionalMods[0].value,4);
    return {total:4};
  };
  await heal("recovery",medic,[target]);
  assert.equal(state.rolls,1);
  assert.equal(state.rerolls,1);
  assert.equal(target.effects.length,1);
  assert.equal(target.system.wounds.value,2);
});
