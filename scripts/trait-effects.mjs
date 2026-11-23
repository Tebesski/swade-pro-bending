import {ID, EFFECTS, escape, slug} from "./shared.mjs";

export const TRAIT_ICON = "icons/svg/upgrade.svg";
export const LOWER_ICON = "icons/magic/acid/dissolve-vomit-green-brown.webp";
export const TRAIT_MACRO_ID = "8b75a8e41c824cbd";
export const TRAIT_MACRO_UUID = `Compendium.${ID}.macros.Macro.${TRAIT_MACRO_ID}`;
export const traitAction = {name:"Boost / Lower Trait",type:"macro",macroActor:"self",uuid:TRAIT_MACRO_UUID};

// Above d12, each additional die step adds one to the die modifier.
export function shiftTrait(die,steps) {
  const excess = die.sides>=12 ? Math.max(0,die.modifier??0) : 0;
  const fixed = (die.modifier??0)-excess;
  const level = Math.max(0,(die.sides-4)/2) + excess;
  const next = Math.max(0,level+steps);
  return {sides:4+2*Math.min(4,next),modifier:Math.max(0,next-4)+fixed};
}

export function traitEffect({trait,die,lower=false,strong=false,raised=false,duration=5}) {
  const steps = raised?2:1;
  const available = Math.max(0,(die.sides-4)/2)+(die.sides>=12?Math.max(0,die.modifier??0):0);
  const required = lower ? Math.min(steps,available) : steps;
  if (!required) return null;
  const name = `${lower?(strong?"Strong Lower":"Lower"):"Boost"} ${trait.name}${raised?" (Raise)":""}`;
  const nameFlag = slug(name);
  const progress = {op:"flag",source:"actor",flag:`${nameFlag}-1-2-successes`};
  const prefix = trait.type==="attribute" ? `system.attributes.${trait.key}.die` : `@Skill{${trait.id}}[system.die`;
  const path = field => prefix+"."+field+(trait.type==="skill"?"]":"");
  const changes = [], rules = [];
  const add = (amount,predicate) => {
    const shifted = shiftTrait(die,lower?-amount:amount);
    const values = [["sides",shifted.sides-die.sides],["modifier",shifted.modifier-(die.modifier??0)]];
    for (const [field,value] of values) {
      if (!value) continue;
      // Subtract writes the actual die modifier, including values above d12.
      const subtract = field==="modifier" || value<0;
      const change = {key:path(field),type:subtract?"subtract":"add",value:String(subtract?-value:value),phase:"initial",priority:null};
      if (predicate) {
        changes.push(change);
        rules.push(predicate);
      } else { changes.push(change); rules.push(null); }
    }
  };
  if (lower && required===2) {
    add(1,progress);
    add(2,{op:"not",child:progress});
  } else add(required);
  const conditions = changes.map((change,i)=>rules[i] ? {
    signature:JSON.stringify([change.key,change.type,change.value,change.phase,change.priority]),predicate:rules[i]
  } : null);
  const outcome = progress=>({progress,damage:"",message:"",effectUuid:"",effects:[]});
  const lingering = lower ? {enabled:true,timing:"end",trait:"vigor",tn:4,required,followingTurns:true,
    modifier:strong?-2:0,tnMode:"value",opposedTraits:"",
    outcomes:{fail:outcome(0),success:outcome(1)},raises:[{threshold:1,...outcome(2)}]} : undefined;
  return {name,type:"base",img:lower?LOWER_ICON:TRAIT_ICON,transfer:false,disabled:false,showIcon:2,
    duration:lower?{value:null,units:"rounds",expiry:null}:{value:duration,units:"rounds",expiry:"turnEnd"},
    description:lower ? `<p>${escape(trait.name)} is lowered by ${required} die type${required===1?"":"s"}, to a minimum of d4. At the end of each following turn, roll Vigor${strong?" at −2":""}. Success restores one die type. A raise removes this effect.</p>` :
      `<p>${escape(trait.name)} is boosted by ${steps} die type${steps===1?"":"s"}. Remove or disable this effect to end the boost.</p>`,
    system:{changes},flags:{[ID]:{traitEffect:{key:trait.key,type:trait.type,id:trait.id,lower,strong:lower&&strong,steps:required}},
      [EFFECTS]:{nameFlag,conditions,...(lingering?{lingering}:{})}}};
}
