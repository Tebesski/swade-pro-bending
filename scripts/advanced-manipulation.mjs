import {ID,EFFECTS,TEMPLATES,dialog,escape,flag,selectedActor,requireOwner,report,contentQueue} from "./shared.mjs";
import {changeSignature,normalizeFlags} from "../../swade-better-effects/scripts/rules.mjs";

const KEY="advanced-elemental-manipulation";
export const SURF_ID="b814c2a930cf4982";
const icons={protection:"icons/svg/holy-shield.svg",area:"icons/svg/aura.svg",surf:"icons/svg/wingfoot.svg"};
const macroIds={protection:"a270bc459e3f410d",area:"efb68a432ccf49a0",surf:"2c098e4d14e946ab"};
const names={protection:"Elemental Protection",area:"Area Protection",surf:"Elemental Surf"};
const fns={protection:"elementalProtection",area:"areaProtection",surf:"elementalSurf"};
export const advancedMacros=()=>Object.keys(names).map(key=>({_id:macroIds[key],name:names[key],type:"script",scope:"global",img:icons[key],
  flags:{[ID]:{key:`advanced-${key}`}},command:`try { await game.modules.get("${ID}").api.${fns[key]}(typeof actor === "undefined" ? undefined : actor); } catch(error) { ui.notifications.error(error.message); }`}));
export const advancedActions=Object.fromEntries(Object.keys(names).map(key=>[key,{name:names[key],type:"macro",macroActor:"self",uuid:`Compendium.${ID}.macros.Macro.${macroIds[key]}`} ]));

export function protectionEffect(flags=[],area=false) {
  const tags=normalizeFlags(Array.isArray(flags)?flags:String(flags).split(/[\s,;]+/));
  if(!area&&!tags.length)throw new Error("Enter at least one flag.");
  const change={key:"system.attributes.vigor.die.modifier",type:"add",value:"4",phase:"initial",priority:null};
  return {name:names.protection,type:"base",img:icons.protection,transfer:false,disabled:false,showIcon:2,
    duration:area?{value:null,units:"hours",expiry:null}:{value:1,units:"hours",expiry:null},
    system:{changes:[change]},flags:{[ID]:{elementalProtection:true},[EFFECTS]:{conditions:area?[]:[{
      signature:changeSignature(change),customName:names.protection,predicate:{op:"any",children:tags.map(tag=>({op:"flag",source:"roll",flag:tag}))}}]}}};
}
export function surfEffect() {
  const change=(key,value)=>({key,type:"add",value:String(value),phase:"initial",priority:null});
  return {name:names.surf,type:"base",img:icons.surf,transfer:false,disabled:false,showIcon:2,
    description:"<p>Concentration or damage: roll Bending to sustain. Prone ends Surf.</p>",
    duration:{value:null,units:"rounds",expiry:null},system:{changes:[change("system.pace.ground",6),change("system.pace.running.die",2),change("sbe.modifyFlag","avatar-no-running-penalty")]},
    flags:{[ID]:{elementalSurf:true},[EFFECTS]:{conditions:[]}}};
}
export const surfDocument=()=>({_id:SURF_ID,name:names.surf,type:`${EFFECTS}.effect`,img:icons.surf,system:{description:""},
  flags:{[ID]:{key:"elemental-surf"}},effects:[{_id:"88b0a46dc6ae4ead",...surfEffect()}]});
export function protectionArea() {
  return {version:1,enabled:true,label:names.area,shapes:["medium","large"],attachable:true,selectTokensOnPlacement:false,
    expiration:{enabled:true,amount:1,unit:"hours"},behaviors:[{id:"elemental-protection",type:"addEffect",enabled:true,
      triggers:["whileWithin"],system:{effectUuid:"",effects:[protectionEffect([],true)],removeOnExit:true,duration:{enabled:false,amount:1,unit:"hours"}}}]};
}
export const advancedUpdate=()=>({"system.actions.additional":advancedActions,[`flags.${TEMPLATES}.automation`]:protectionArea(),
  [`flags.${ID}.advancedRevision`]:1});
const apply=(actor,effect,origin)=>game.modules.get(EFFECTS).api.applyEffectTemplate({type:`${EFFECTS}.effect`,effects:[effect],uuid:origin??null},actor);
async function applyProtection(actor,effect,origin) {
  const previous=actor.effects.filter(e=>flag(e,"elementalProtection")&&!e.flags[TEMPLATES]?.regionUuid);
  const created=await apply(actor,effect,origin);
  try{if(previous.length)await actor.deleteEmbeddedDocuments("ActiveEffect",previous.map(e=>e.id));}
  catch(error){if(created?.length)await actor.deleteEmbeddedDocuments("ActiveEffect",created.map(e=>e.id));throw error;}
}
export async function elementalProtection(caster=selectedActor()) {
  requireOwner(caster);
  const targets=[...new Map([...game.user.targets].filter(token=>token.actor).map(token=>[token.actor.uuid,token])).values()];
  const answer=await dialog().prompt({window:{title:names.protection},content:
    `<div class="form-group"><label>Flags</label><input name="flags" type="text"></div>${targets.length?`<div class="form-group"><label>Include</label><select name="include"><option value="">None</option>${targets.map((token,i)=>`<option value="${i}">${escape(token.actor.name)}</option>`).join("")}</select></div>`:""}`,
    ok:{label:"Apply",callback:(_event,button)=>new FormData(button.form)},rejectClose:false});
  if(!answer)return;
  const effect=protectionEffect(answer.get("flags"));
  const token=answer.get("include")===""||answer.get("include")===null?null:targets[Number(answer.get("include"))];
  if(token&&!token.actor.isOwner) {
    if(!game.users.activeGM)throw new Error("A connected GM is needed.");
    await game.users.activeGM.query(`${ID}.elementalProtection`,{casterUuid:caster.uuid,tokenUuid:token.document.uuid,flags:answer.get("flags")});
  } else if(token&&token.actor.uuid!==caster.uuid)await applyProtection(token.actor,effect,caster.uuid);
  await applyProtection(caster,effect,caster.uuid);
}
export async function areaProtection(caster=selectedActor()) {
  requireOwner(caster);
  const item=caster.itemTypes.power.find(item=>flag(item,"key")===KEY);
  if(!item)throw new Error("This actor needs Advanced Elemental Manipulation.");
  if(!flag(item,"advancedRevision"))await item.update(advancedUpdate());
  return game.modules.get(TEMPLATES).api.placeTemplate(item);
}
export async function elementalSurf(caster=selectedActor()) {
  requireOwner(caster);
  if(caster.statuses.has("prone"))throw new Error("Stand up first.");
  const previous=caster.effects.find(effect=>flag(effect,"elementalSurf"));
  if(previous){await previous.update({disabled:false});return;}
  return apply(caster,surfEffect(),caster.uuid);
}
export function installAdvancedManipulation() {
  CONFIG.queries[`${ID}.elementalProtection`]=async({casterUuid,tokenUuid,flags},{user})=>{
    const caster=await fromUuid(casterUuid),token=await fromUuid(tokenUuid);
    if(!game.user.isActiveGM||!caster?.testUserPermission(user,"OWNER")||token?.documentName!=="Token"||token.hidden||
      !caster.itemTypes.power.some(item=>flag(item,"key")===KEY))throw new Error("Choose a caster and visible target.");
    await applyProtection(token.actor,protectionEffect(flags),caster.uuid);return true;
  };
  Hooks.on("preCreateItem",item=>{if(flag(item,"key")===KEY&&!flag(item,"advancedRevision"))item.updateSource(advancedUpdate());});
  Hooks.on("preCreateActor",actor=>{
    const items=actor.toObject().items;let changed=false;
    for(const item of items)if(flag(item,"key")===KEY&&!flag(item,"advancedRevision")){
      item.system.actions??={};item.system.actions.additional={...item.system.actions.additional,...advancedActions};
      item.flags[TEMPLATES]={...item.flags[TEMPLATES],automation:protectionArea()};item.flags[ID].advancedRevision=1;changed=true;
    }
    if(changed)actor.updateSource({items});
  });
  const stopSurf=async actor=>{
    if(!actor?.isOwner||!actor.statuses.has("prone")||game.users.activeGM?.id!==game.user.id)return;
    const effects=actor.effects.filter(effect=>flag(effect,"elementalSurf")&&!effect.disabled);
    if(effects.length)await actor.updateEmbeddedDocuments("ActiveEffect",effects.map(effect=>({_id:effect.id,disabled:true})));
  };
  for(const event of ["createActiveEffect","updateActiveEffect"])Hooks.on(event,effect=>{void stopSurf(effect.actor).catch(report);});
  Hooks.once("ready",()=>{void updateAdvancedContent().catch(report);});
}
export async function updateAdvancedContent() {
  if(!game.user.isActiveGM)return;
  return contentQueue("compendiums",async()=>{
  for(const [packName,docs] of [["macros",advancedMacros()],["effects",[surfDocument()]]]) {
    const pack=game.packs.get(`${ID}.${packName}`),missing=[];
    for(const doc of docs)if(!await pack.getDocument(doc._id))missing.push(doc);
    if(!missing.length)continue;
    const locked=pack.locked;
    try{if(locked)await pack.configure({locked:false});for(const doc of missing)await (packName==="macros"?Macro:Item).create(doc,{pack:pack.collection,keepId:true});}
    finally{if(locked)await pack.configure({locked:true});}
  }
  const pack=game.packs.get(`${ID}.techniques`);await pack.getIndex({fields:[`flags.${ID}.key`]});
  const row=pack.index.find(item=>flag(item,"key")===KEY),power=row&&await pack.getDocument(row._id);
  if(power&&!flag(power,"advancedRevision")){const locked=pack.locked;try{if(locked)await pack.configure({locked:false});await power.update(advancedUpdate());}finally{if(locked)await pack.configure({locked:true});}}
  const actors=new Map(game.actors.map(actor=>[actor.uuid,actor]));
  for(const scene of game.scenes)for(const token of scene.tokens)if(!token.actorLink&&token.actor)actors.set(token.actor.uuid,token.actor);
  for(const item of [...game.items,...[...actors.values()].flatMap(actor=>[...actor.items])])if(flag(item,"key")===KEY&&!flag(item,"advancedRevision"))await item.update(advancedUpdate());
  });
}
