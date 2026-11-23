import {ID,EFFECTS,dialog,flag,requireOwner,selectedActor,contentQueue,queue,report} from "./shared.mjs";
export const AWARENESS_ID="d0b6ea8e294347fa";
const ICON="icons/svg/eye.svg";
const serial=queue();
export const awarenessAction={name:"Awareness",type:"macro",macroActor:"self",uuid:`Compendium.${ID}.macros.Macro.${AWARENESS_ID}`};
export const awarenessMacro=()=>({_id:AWARENESS_ID,name:"Awareness",type:"script",scope:"global",img:ICON,flags:{[ID]:{key:"awareness"}},
  command:`try { await game.modules.get("${ID}").api.awareness(typeof actor === "undefined" ? undefined : actor); } catch(error) { ui.notifications.error(error.message); }`});
export function awarenessEffect({strong="none",extended=false}={}) {
  if(!["none","medium","heavy"].includes(strong))throw new Error("Choose a Strong modifier.");
  const flags=["light-cover-penalty","dim-light-penalty"];
  if(strong!=="none")flags.push("medium-cover-penalty","dark-light-penalty");
  if(strong==="heavy")flags.push("heavy-cover-penalty","pitch-dark-light-penalty");
  return {name:"Awareness",type:"base",img:ICON,transfer:false,disabled:false,showIcon:2,
    duration:extended?{value:1,units:"minutes",expiry:"turnEnd"}:{value:5,units:"rounds",expiry:"turnEnd"},
    system:{changes:[{key:"sbe.suppress",type:"add",value:flags.join(", "),phase:"initial",priority:null}]},
    flags:{[ID]:{awareness:true},[EFFECTS]:{conditions:[]}}};
}
export async function applyAwareness(actor,options={}) {
  requireOwner(actor);
  return serial(actor.uuid,async()=>{
    const previous=actor.effects.filter(effect=>flag(effect,"awareness"));
    const created=await game.modules.get(EFFECTS).api.applyEffectTemplate({type:`${EFFECTS}.effect`,effects:[awarenessEffect(options)],uuid:actor.uuid},actor);
    try{if(previous.length)await actor.deleteEmbeddedDocuments("ActiveEffect",previous.map(effect=>effect.id));}
    catch(error){if(created?.length)await actor.deleteEmbeddedDocuments("ActiveEffect",created.map(effect=>effect.id));throw error;}
    return created?.[0];
  });
}
export async function awareness(actor=selectedActor()) {
  requireOwner(actor);
  const answer=await dialog().prompt({window:{title:"Awareness"},content:
    `<div class="form-group"><label>Strong</label><select name="strong"><option value="none">None</option><option value="medium">Medium</option><option value="heavy">Heavy</option></select></div>
    <label><input type="checkbox" name="duration"> Duration</label>`,
    ok:{label:"Apply",callback:(_event,button)=>new FormData(button.form)},rejectClose:false});
  if(answer)return applyAwareness(actor,{strong:answer.get("strong"),extended:answer.has("duration")});
}
export function installAwareness() {
  Hooks.on("preCreateItem",item=>{if(flag(item,"key")==="awareness")item.updateSource({"system.actions.additional.awareness":awarenessAction});});
  Hooks.on("preCreateActor",actor=>{
    const items=actor.toObject().items;let changed=false;
    for(const item of items)if(flag(item,"key")==="awareness"){
      item.system.actions??={};item.system.actions.additional??={};item.system.actions.additional.awareness=awarenessAction;changed=true;
    }
    if(changed)actor.updateSource({items});
  });
  Hooks.once("ready",()=>{void updateAwarenessContent().catch(report);});
}
export async function updateAwarenessContent() {
  if(!game.user.isActiveGM)return;
  return contentQueue("compendiums",async()=>{
    const macros=game.packs.get(`${ID}.macros`);
    if(!await macros.getDocument(AWARENESS_ID)){
      const locked=macros.locked;
      try{if(locked)await macros.configure({locked:false});await Macro.create(awarenessMacro(),{pack:macros.collection,keepId:true});}
      finally{if(locked)await macros.configure({locked:true});}
    }
    const pack=game.packs.get(`${ID}.techniques`);await pack.getIndex({fields:[`flags.${ID}.key`]});
    const row=pack.index.find(item=>flag(item,"key")==="awareness"),power=row&&await pack.getDocument(row._id);
    if(power&&power.system.actions.additional.awareness?.uuid!==awarenessAction.uuid){
      const locked=pack.locked;
      try{if(locked)await pack.configure({locked:false});await power.update({"system.actions.additional.awareness":awarenessAction});}
      finally{if(locked)await pack.configure({locked:true});}
    }
    const actors=new Map(game.actors.map(actor=>[actor.uuid,actor]));
    for(const scene of game.scenes)for(const token of scene.tokens)if(!token.actorLink&&token.actor)actors.set(token.actor.uuid,token.actor);
    for(const item of [...game.items,...[...actors.values()].flatMap(actor=>[...actor.items])])
      if(flag(item,"key")==="awareness"&&item.system.actions.additional.awareness?.uuid!==awarenessAction.uuid)
        await item.update({"system.actions.additional.awareness":awarenessAction});
  });
}
