import {ID,EFFECTS,dialog,escape,flag,requireOwner,selectedActor,contentQueue,report,queue} from "./shared.mjs";
import {changeSignature} from "../../swade-better-effects/scripts/rules.mjs";
export const ANALYSE_ID="b3a890c4e7324d19";
const ICON="icons/svg/eye.svg",KEY="analyse-foe";
const removals=queue();
const removePair=(effect,includeSelf=false)=>removals(flag(effect,"analyse").pair,async()=>{
  const peer=flag(effect,"analyse")?.peer;
  const other=peer&&await fromUuid(peer);
  if(other?.parent.effects.has(other.id))await other.delete();
  if(includeSelf&&effect.parent.effects.has(effect.id))await effect.delete();
});
export const analyseAction={name:"Analyse Foe",type:"macro",macroActor:"self",uuid:`Compendium.${ID}.macros.Macro.${ANALYSE_ID}`};
export const analyseMacro=()=>({_id:ANALYSE_ID,name:"Analyse Foe",type:"script",scope:"global",img:ICON,flags:{[ID]:{key:KEY}},
  command:`try { await game.modules.get("${ID}").api.analyseFoe(typeof actor === "undefined" ? undefined : actor); } catch(error) { ui.notifications.error(error.message); }`});
export function analyseEffects(pair,targetTokenUuid,extended=false) {
  const marker=`analysed-${pair.toLowerCase()}`;
  const change={key:"system.stats.globalMods.trait",type:"add",value:"1",phase:"initial",priority:null};
  const base={type:"base",img:ICON,transfer:false,disabled:false,showIcon:2,duration:{value:extended?6:3,units:"rounds",expiry:"turnEnd"}};
  return [
    {...base,name:"Analyse Foe",system:{changes:[change]},flags:{[ID]:{analyse:{pair,targetTokenUuid,role:"caster"}},[EFFECTS]:{conditions:[{
      signature:changeSignature(change),customName:"Analyse Foe",predicate:{op:"flag",source:"target",flag:marker}}]}}},
    {...base,name:"Analysed",system:{changes:[{key:"sbe.modifyFlag",type:"add",value:marker,phase:"initial",priority:null}]},
      flags:{[ID]:{analyse:{pair,targetTokenUuid,role:"target"}},[EFFECTS]:{conditions:[]}}}
  ];
}
export async function applyAnalysis(caster,token,extended=false) {
  requireOwner(caster);requireOwner(token.actor);
  if(caster.uuid===token.actor.uuid)throw new Error("Target a foe.");
  const pair=foundry.utils.randomID(),sources=analyseEffects(pair,token.uuid,extended);
  const previous=caster.effects.filter(e=>flag(e,"analyse")?.role==="caster"&&flag(e,"analyse").targetTokenUuid===token.uuid);
  const created=[];
  try {
    for(const [i,actor] of [caster,token.actor].entries()) {
      const [effect]=await game.modules.get(EFFECTS).api.applyEffectTemplate({type:`${EFFECTS}.effect`,effects:[sources[i]],uuid:caster.uuid},actor);
      created.push(effect);
    }
    await Promise.all(created.map((effect,i)=>effect.setFlag(ID,"analyse.peer",created[1-i].uuid)));
    for(const effect of previous)await removePair(effect,true);
  }catch(error){for(const effect of created)if(effect.parent.effects.has(effect.id))await effect.delete();throw error;}
}
export async function analyseFoe(caster=selectedActor()) {
  requireOwner(caster);
  const targets=[...game.user.targets].filter(token=>token.actor?.system.attributes);
  if(!targets.length)throw new Error("Target a foe.");
  const answer=await dialog().prompt({window:{title:"Analyse Foe"},content:
    `${targets.length>1?`<div class="form-group"><label>Target</label><select name="target">${targets.map((token,i)=>`<option value="${i}">${escape(token.name)}</option>`).join("")}</select></div>`:""}<label><input type="checkbox" name="duration"> Duration</label>`,
    ok:{label:"Apply",callback:(_event,button)=>new FormData(button.form)},rejectClose:false});
  if(!answer)return;
  const token=targets[Number(answer.get("target")??0)].document;
  if(token.actor.isOwner)return applyAnalysis(caster,token,answer.has("duration"));
  if(!game.users.activeGM)throw new Error("A connected GM is needed.");
  return game.users.activeGM.query(`${ID}.analyseFoe`,{casterUuid:caster.uuid,tokenUuid:token.uuid,extended:answer.has("duration")});
}
export function installAnalyseFoe() {
  CONFIG.queries[`${ID}.analyseFoe`]=async({casterUuid,tokenUuid,extended},{user})=>{
    const caster=await fromUuid(casterUuid),token=await fromUuid(tokenUuid);
    if(!game.user.isActiveGM||!caster?.testUserPermission(user,"OWNER")||token?.documentName!=="Token"||token.hidden||
      !caster.itemTypes.power.some(item=>flag(item,"key")===KEY))throw new Error("Choose a caster and visible target.");
    await applyAnalysis(caster,token,!!extended);return true;
  };
  Hooks.on("swadeBetterEffectsTargetFlags",(_context,token,actor,_item,flags)=>{
    for(const effect of actor?.effects??[]) {
      const data=flag(effect,"analyse");
      if(data?.role!=="target"||data.targetTokenUuid===token?.uuid)continue;
      const marker=`analysed-${data.pair.toLowerCase()}`;
      for(let i=flags.length-1;i>=0;i--)if(flags[i]===marker)flags.splice(i,1);
    }
  });
  Hooks.on("deleteActiveEffect",effect=>{
    const peer=flag(effect,"analyse")?.peer;
    if(peer&&game.user.isActiveGM)void removePair(effect).catch(report);
  });
  Hooks.on("preCreateItem",item=>{if(flag(item,"key")===KEY)item.updateSource({"system.actions.additional.analyse":analyseAction});});
  Hooks.on("preCreateActor",actor=>{
    const items=actor.toObject().items;let changed=false;
    for(const item of items)if(flag(item,"key")===KEY){item.system.actions??={};item.system.actions.additional??={};item.system.actions.additional.analyse=analyseAction;changed=true;}
    if(changed)actor.updateSource({items});
  });
  Hooks.once("ready",()=>{void updateAnalyseContent().catch(report);});
}
export async function updateAnalyseContent() {
 if(!game.user.isActiveGM)return;
 return contentQueue("compendiums",async()=>{
  const macros=game.packs.get(`${ID}.macros`);
  if(!await macros.getDocument(ANALYSE_ID)){const locked=macros.locked;try{if(locked)await macros.configure({locked:false});await Macro.create(analyseMacro(),{pack:macros.collection,keepId:true});}finally{if(locked)await macros.configure({locked:true});}}
  const pack=game.packs.get(`${ID}.techniques`);await pack.getIndex({fields:[`flags.${ID}.key`]});
  const row=pack.index.find(item=>flag(item,"key")===KEY),power=row&&await pack.getDocument(row._id);
  if(power&&power.system.actions.additional.analyse?.uuid!==analyseAction.uuid){const locked=pack.locked;try{if(locked)await pack.configure({locked:false});await power.update({"system.actions.additional.analyse":analyseAction});}finally{if(locked)await pack.configure({locked:true});}}
  const actors=new Map(game.actors.map(actor=>[actor.uuid,actor]));
  for(const scene of game.scenes)for(const token of scene.tokens)if(!token.actorLink&&token.actor)actors.set(token.actor.uuid,token.actor);
  for(const item of [...game.items,...[...actors.values()].flatMap(actor=>[...actor.items])])if(flag(item,"key")===KEY&&item.system.actions.additional.analyse?.uuid!==analyseAction.uuid)await item.update({"system.actions.additional.analyse":analyseAction});
 });
}
