import {ID,EFFECTS,POWERS,TEMPLATES,dialog,escape,flag,contentQueue,queue,report} from "./shared.mjs";
import {changeSignature} from "../../swade-better-effects/scripts/rules.mjs";
export const AREA_MACRO_ID="2db1636d548a4fa1";
const resolverUuid=`Compendium.${ID}.macros.Macro.${AREA_MACRO_ID}`;
const serial=queue();
const KEY_B="elemental-barrage",KEY_V="elemental-vortex";
const ENTANGLES=["earth-entangle","water-entangle"];
const KEYS=[KEY_B,KEY_V,...ENTANGLES];
const nativeRuntime=()=>import("../../swade-better-templates/scripts/runtime.mjs");
export const areaResolverMacro=()=>({_id:AREA_MACRO_ID,name:"Resolve Bending Area",type:"script",scope:"global",img:"icons/svg/explosion.svg",flags:{[ID]:{key:"bending-area-resolver"}},
 command:`try { await game.modules.get("${ID}").api.resolveBendingArea(typeof region === "undefined" ? null : region, typeof token === "undefined" ? null : token); } catch(error) { ui.notifications.error(error.message); }`});
const behavior=(id,type,system,triggers=[],extra={})=>({id,type,system,triggers,enabled:true,...extra});
const edit=(target,field,value)=>({target,field,operation:"set",value});
export function vortexDefence() {
 const change={key:"system.stats.globalMods.targetDamage",type:"add",value:"-2",phase:"initial",priority:null};
 return {name:"Elemental Vortex",type:"base",img:"icons/magic/air/wind-vortex-swirl-blue.webp",transfer:false,disabled:false,showIcon:2,
  duration:{value:null,units:"rounds",expiry:null},system:{changes:[change]},flags:{[ID]:{areaDefence:true},[EFFECTS]:{conditions:[{
   signature:changeSignature(change),customName:"Elemental Vortex",predicate:{op:"flag",source:"roll",flag:"ranged"}}]}}};
}
export function bendingAreaConfig(key) {
 if(ENTANGLES.includes(key))return entangleConfig(key);
 const vortex=key===KEY_V;
 const config={version:1,enabled:true,label:vortex?"Elemental Vortex":"Elemental Barrage",shapes:[vortex?"small":"cone"],attachable:vortex,
  selectTokensOnPlacement:false,expiration:vortex?{enabled:true,amount:3,unit:"rounds"}:{enabled:false},modifiers:[],raises:[],behaviors:[
   behavior("area-check","rollTrait",{trait:"agility",modifier:0,tn:4,flags:"",prompt:true,recipient:"owner",rollMode:"publicroll"}),
   behavior("area-damage","rollDamage",{formula:vortex?"2d4":"2d6",ap:0,isHeavyWeapon:false,flags:"ranged, area, bending-technique, damaging-technique",flavor:vortex?"Elemental Vortex":"Elemental Barrage",rollMode:"publicroll"}),
   behavior("area-resolver","executeMacro",{macroUuid:resolverUuid},vortex?["tokenTurnEnd"]:["onPlace","tokenEnter"],vortex?{turnEndSource:"placer",excludedFlags:"placer"}:{})
  ]};
 if(vortex)config.behaviors.push(
  behavior("vortex-cover","addCover",{level:"light"},["whileWithin"]),
  behavior("vortex-defence","addEffect",{effectUuid:"",effects:[vortexDefence()],removeOnExit:true,duration:{enabled:false}},["whileWithin"],{target:"placer"}));
 else config.raises=[{id:"raise-1",level:1,mode:"extend",changes:[edit("area-check","system.modifier",-2),
  {id:"barrage-raised-damage",type:"addDamageDice",enabled:true,system:{formula:"1d6"}}]}];
 return config;
}
export function entangleEffect(key,{bound=false,damage="",hardness=6}={}) {
 const outcome={progress:0,damage:"",message:"",effects:[]};
 const lingering=damage?{enabled:true,timing:"end",followingTurns:false,trait:damage,tn:4,modifier:0,tnMode:"value",opposedTraits:"",required:1,
   outcomes:{fail:outcome,success:outcome},raises:[]}:undefined;
 return {name:bound?"Bound":"Entangled",type:"base",img:"icons/svg/net.svg",transfer:false,disabled:false,showIcon:2,
  description:`<p>Hardness ${hardness}.</p>`,statuses:[bound?"bound":"entangled"],duration:{value:null,units:"rounds",expiry:null},system:{changes:[]},
  flags:{[ID]:{entangle:key,hardness},[EFFECTS]:{conditions:[],...(lingering?{lingering}:{})}}};
}
function entangleConfig(key){
 const change=(target,field,value,operation="set")=>({...edit(target,field,value),operation});
 const option=(id,cost,label,changes)=>({id,cost,label,changes});
 const config={version:1,enabled:true,label:key==="earth-entangle"?"Entangle (Earth)":"Entangle (Water)",shapes:["small"],attachable:false,
  placementRange:{enabled:true,max:"@spirit"},selectTokensOnPlacement:false,expiration:{enabled:true,removeOnPlacement:true,amount:0,unit:"rounds"},
  behaviors:[behavior("area-check","rollTrait",{trait:"agility",modifier:-2,tn:4,flags:"",prompt:true,recipient:"owner",rollMode:"publicroll"}),
    behavior("area-damage","rollDamage",{formula:"",ap:0,flags:"",rollMode:"publicroll"}),
    behavior("area-resolver","executeMacro",{macroUuid:resolverUuid},["onPlace"])],
  raises:[{id:"raise-1",level:1,mode:"extend",changes:[change("area-check","system.flags","entangle-bound","add")]}],
  modifiers:[{id:"area-effect",name:"Area Effect",options:[
    option("pm1",2,"Small",[]),...[["pm2",4,"Medium","medium"],["pm3",6,"Large","large"],["stream",6,"Stream","stream"]].map(([id,cost,label,shape])=>option(id,cost,label,[{id:`entangle-shape-${shape}`,type:"changeTemplate",enabled:true,system:{replacements:{small:shape},range:""}}]))]},
   {id:"damage",name:"Damage",options:[option("pm1",2,"",[change("area-damage","system.formula","2d4")])]},
   {id:"tough",name:"Tough",options:[option("pm1",2,"+2 Hardness",[change("area-check","system.flags","hardness-8","add")]),option("pm2",4,"+4 Hardness",[change("area-check","system.flags","hardness-10","add")])]}]};
 if(key==="earth-entangle")config.modifiers.push({id:"deadly",name:"Deadly",options:[option("pp4",4,"",[change("area-damage","system.formula","2d6")])]});
 return config;
}
export const bendingAreaUpdate=key=>({[`flags.${TEMPLATES}.automation`]:bendingAreaConfig(key),[`flags.${ID}.bendingAreaRevision`]:1,
 ...(ENTANGLES.includes(key)?{[`flags.${ID}.areaOptions`]:false,[`flags.${POWERS}.powerModifiers`]:entangleConfig(key).modifiers.map(m=>({...m,options:m.options.map(({changes,...option})=>option)})),"system.templates.small":true}:{}),
 ...(key===KEY_B?{[`flags.${POWERS}.powerModifiers`]:[],[`flags.${POWERS}.powerRaises`]:[],"system.templates.scone":false,"system.templates.cone":true}:{}),
 ...(key===KEY_V?{[`flags.${POWERS}.applyEffects`]:new foundry.data.operators.ForcedDeletion(),"system.templates.medium":false,"system.templates.small":true}:{})});
const regionActor=async region=>{
 const {automationBehavior}=await nativeRuntime();
 const model=automationBehavior(region)?.system;
 const item=model?.itemUuid?await fromUuid(model.itemUuid):null;
 return {model,item};
};
async function chooseConsequence(region,token) {
 return dialog().wait({window:{title:`Elemental Barrage · ${token.name}`},buttons:[{action:"duck",label:"Prone + Distracted"},{action:"damage",label:"Damage"}],rejectClose:false});
}
export async function resolveBendingArea(region,token) {
 token=token?.document??token;
 if(!region||!token?.actor||!game.user.isActiveGM)return;
 const {model,item}=await regionActor(region),key=flag(item,"key");
 if(!KEYS.includes(key))return;
 const {runtimeAutomation,executeBehavior}=await nativeRuntime();
 return serial(`${region.uuid}:${token.uuid}`,async()=>{
  const vortex=key===KEY_V,entangle=ENTANGLES.includes(key);
  if(!vortex&&(region.getFlag(ID,"barrageDone")??[]).includes(token.id))return;
  const config=runtimeAutomation(region);
  const check=config.behaviors.find(b=>b.id==="area-check"),damage=config.behaviors.find(b=>b.id==="area-damage");
  const context={region,token,event:{name:"bendingArea"}};
  const result=await executeBehavior(check,context);
  if(!result)return;
  if(!result.success) {
   if(entangle){
    const flags=String(check.system.flags).split(/[, ]+/);
    const bound=flags.includes("entangle-bound");
    if(!token.actor.statuses.has("bound")&&!(token.actor.statuses.has("entangled")&&!bound)){
     const effect=entangleEffect(key,{bound,damage:damage.system.formula,hardness:flags.includes("hardness-10")?10:flags.includes("hardness-8")?8:6});
     await game.modules.get(EFFECTS).api.applyEffectTemplate({type:`${EFFECTS}.effect`,effects:[effect],uuid:item.uuid},token.actor);
     if(bound){const old=token.actor.effects.filter(e=>flag(e,"entangle")&&e.statuses.has("entangled"));if(old.length)await token.actor.deleteEmbeddedDocuments("ActiveEffect",old.map(e=>e.id));}
    }
   }else{
   let consequence="damage";
   if(!vortex){
    const owner=game.users.find(user=>user.active&&!user.isGM&&token.actor.testUserPermission(user,"OWNER"));
    consequence=owner?await owner.query(`${ID}.barrageChoice`,{regionUuid:region.uuid,tokenUuid:token.uuid}):await chooseConsequence(region,token);
    if(!consequence)return;
   }
   if(consequence==="duck") {
    const sources=[{name:"Prone",statuses:["prone"],duration:{value:null,units:"rounds",expiry:null}},
      {name:"Distracted",statuses:["distracted"],duration:{value:1,units:"rounds",expiry:"turnEnd"}}]
     .filter(source=>!token.actor.statuses.has(source.statuses[0])).map(source=>({...source,type:"base",img:"icons/svg/falling.svg",transfer:false,showIcon:2,system:{changes:[]}}));
    if(sources.length)await game.modules.get(EFFECTS).api.applyEffectTemplate({type:`${EFFECTS}.effect`,effects:sources,uuid:item.uuid},token.actor);
   } else await executeBehavior(damage,{...context,targets:[token]});
   }
  }
  if(!vortex)await serial(`${region.uuid}:done`,async()=>{
   if(region.parent.regions.has(region.id))await region.setFlag(ID,"barrageDone",[...new Set([...(region.getFlag(ID,"barrageDone")??[]),token.id])]);
  });
 });
}
export function installBendingAreas() {
 CONFIG.queries[`${ID}.barrageChoice`]=async({regionUuid,tokenUuid},{user})=>{
  if(!user.isGM)throw new Error("A GM must request this choice.");
  const region=await fromUuid(regionUuid),token=await fromUuid(tokenUuid);
  if(!token?.actor?.isOwner||token.parent.id!==region?.parent.id)return null;
  return chooseConsequence(region,token);
 };
 Hooks.on(`${TEMPLATES}.regionReady`,region=>{void (async()=>{
  if(!game.user.isActiveGM)return;
  const {item}=await regionActor(region);
  if(flag(item,"key")!==KEY_B)return;
  await region.setFlag(ID,"barrageOrigin",region.shapes[0].toObject?.()??{...region.shapes[0]});
  const combat=game.combats.find(c=>c.started&&c.scene?.id===region.parent.id);
  if(combat)await region.setFlag(ID,"barrageTurn",{combat:combat.id,round:combat.round,turn:combat.turn});
 })().catch(report);});
 Hooks.on("preUpdateRegion",(region,changes)=>{
  const initial=region.getFlag(ID,"barrageOrigin");
  if(!initial||!Array.isArray(changes.shapes))return;
  const next=changes.shapes[0];
  const theta=Number(initial.rotation??0)*Math.PI/180,dx=Number(next.x??initial.x)-initial.x,dy=Number(next.y??initial.y)-initial.y;
  const scale=region.parent.grid.size/region.parent.grid.distance;
  if(changes.shapes.length!==1||Math.abs(dx*Math.cos(theta)+dy*Math.sin(theta))>1||Math.hypot(dx,dy)>2*scale+1||
   ["radius","angle","rotation","type"].some(key=>next[key]!==undefined&&next[key]!==initial[key])) {
   ui.notifications.warn("Barrage can sweep 2″ sideways.");return false;
  }
 });
 Hooks.on("updateCombat",combat=>{if(!game.user.isActiveGM)return;for(const scene of game.scenes)for(const region of scene.regions){
  const start=region.getFlag(ID,"barrageTurn");
  if(start?.combat===combat.id&&(start.round!==combat.round||start.turn!==combat.turn))void game.modules.get(TEMPLATES).api.deleteManagedRegion(region.uuid).catch(report);
 }});
 Hooks.on("preCreateItem",item=>{if(KEYS.includes(flag(item,"key"))&&!flag(item,"bendingAreaRevision"))item.updateSource(bendingAreaUpdate(flag(item,"key")));});
 Hooks.on("preCreateActor",actor=>{
  const items=actor.toObject().items;let changed=false;
  for(const item of items)if(KEYS.includes(flag(item,"key"))&&!flag(item,"bendingAreaRevision")){
   foundry.utils.mergeObject(item,foundry.utils.expandObject(bendingAreaUpdate(flag(item,"key"))),{inplace:true});changed=true;
   if(flag(item,"key")===KEY_V&&item.flags[POWERS]){delete item.flags[POWERS].applyEffects;delete item.flags[POWERS]["-=applyEffects"];}
  }
  if(changed)actor.updateSource({items});
 });
 Hooks.once("ready",()=>{void updateBendingAreas().catch(report);});
}
export async function updateBendingAreas(){
 if(!game.user.isActiveGM)return;
 return contentQueue("compendiums",async()=>{
  const macros=game.packs.get(`${ID}.macros`);
  if(!await macros.getDocument(AREA_MACRO_ID)){const locked=macros.locked;try{if(locked)await macros.configure({locked:false});await Macro.create(areaResolverMacro(),{pack:macros.collection,keepId:true});}finally{if(locked)await macros.configure({locked:true});}}
  const actors=new Map(game.actors.map(actor=>[actor.uuid,actor]));
  for(const scene of game.scenes)for(const token of scene.tokens)if(!token.actorLink&&token.actor)actors.set(token.actor.uuid,token.actor);
  for(const actor of actors.values()){
   const old=actor.effects.filter(e=>flag(e,"vortex")&&!e.disabled);
   if(old.length)await actor.updateEmbeddedDocuments("ActiveEffect",old.map(e=>({_id:e.id,disabled:true})));
  }
  const pack=game.packs.get(`${ID}.techniques`);await pack.getIndex({fields:[`flags.${ID}.key`]});
  const powers=await Promise.all(pack.index.filter(row=>KEYS.includes(flag(row,"key"))).map(row=>pack.getDocument(row._id)));
  const locked=pack.locked;
  try{if(locked)await pack.configure({locked:false});for(const item of powers)if(!flag(item,"bendingAreaRevision"))await item.update(bendingAreaUpdate(flag(item,"key")));}
  finally{if(locked)await pack.configure({locked:true});}
  for(const item of [...game.items,...[...actors.values()].flatMap(actor=>[...actor.items])])if(KEYS.includes(flag(item,"key"))&&!flag(item,"bendingAreaRevision"))await item.update(bendingAreaUpdate(flag(item,"key")));
  for(const key of KEYS)await game.modules.get(TEMPLATES).api.trustAutomation(bendingAreaConfig(key));
 });
}
