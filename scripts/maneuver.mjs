import {ID,EFFECTS,dialog,escape,flag,requireOwner,selectedActor,queue,post,report,contentQueue} from "./shared.mjs";

export const MANEUVER_MACRO_ID="6c53a29fb7c64a12";
export const MANEUVER_ICON="icons/svg/falling.svg";
export const maneuverAction={name:"Elemental Maneuver",type:"macro",macroActor:"self",
  uuid:`Compendium.${ID}.macros.Macro.${MANEUVER_MACRO_ID}`};
export const MANEUVER_DESCRIPTION="<p>The target rolls opposed Agility against the casting total. On failure, apply Disarm, Prone, Distracted or Vulnerable. Distracted and Vulnerable last 1 round.</p><p>Each raise can add Prone, extend the conditions by 1 round, or apply both conditions.</p><p>Disarm prevents Elemental Hurl and Assault until removed with an action. You can also use this power as a reaction to move out of harm’s way.</p>";
const itemUpdate=item=>({"system.actions.additional.maneuver":maneuverAction,
  ...(flag(item,"maneuverRevision")>=2?{}:{"system.description":MANEUVER_DESCRIPTION,[`flags.${ID}.maneuverRevision`]:2})});
export function maneuverTN(castTotal) {
  const tn=Number(castTotal);
  if (!Number.isFinite(tn)||tn<4) throw new Error("Enter the casting total (4 or higher).");
  return tn;
}
const serial=queue();
const query=`${ID}.elementalManeuver`;
const title={disarm:"Disarm",distracted:"Distracted",vulnerable:"Vulnerable",prone:"Prone"};

export function maneuverEffects({mode="disarm",raises=0,prone=false,both=false,rounds=1}={}) {
  if (!Object.hasOwn(title,mode)) throw new Error("Choose a maneuver.");
  if (!Number.isInteger(raises)||raises<0||raises>100||!Number.isInteger(rounds)||rounds<1||rounds>101) throw new Error("Enter valid raises and duration.");
  const timed=["distracted","vulnerable"].includes(mode);
  if ((!timed && (both||rounds!==1)) || (mode==="prone" && prone)) throw new Error("Choose valid effects.");
  if (Number(prone)+Number(both)+rounds-1>raises) throw new Error("Not enough raises.");
  const kinds=[mode,...(both?[mode==="distracted"?"vulnerable":"distracted"]:[]),...(prone?["prone"]:[])];
  return kinds.map(kind=>({name:title[kind],type:"base",img:kind==="disarm"?"icons/svg/cancel.svg":MANEUVER_ICON,
    transfer:false,disabled:false,showIcon:2,description:kind==="disarm"?"<p>Spend an action to remove Disarm.</p>":"",
    duration:["distracted","vulnerable"].includes(kind)?{value:rounds,units:"rounds",expiry:"turnEnd"}:{value:null,units:"rounds",expiry:null},
    statuses:kind==="disarm"?[]:[kind],system:{changes:kind==="disarm"?[{key:"sbe.restrict",type:"add",
      value:{traits:[],linkedAttributes:[],rollFlags:["elemental-hurl","elemental-assault"]},phase:"initial",priority:null}]:[]},
    flags:{[ID]:{maneuver:kind},[EFFECTS]:{conditions:[],nameFlag:kind}}}));
}

export async function resolveManeuver(caster,target,options) {
  requireOwner(target);
  return serial(target.uuid,async()=>{
    const sources=maneuverEffects(options);
    if (options.resistance!=="failed") {
      const tn=maneuverTN(options.castTotal);
      const roll=await target.rollAttribute("agility",{flavour:`Elemental Maneuver · TN ${tn}`,
        sbeRequest:{name:"Agility",kind:"attribute",trait:"agility",targetNumber:tn,flags:[],whisper:[],actorUuid:target.uuid}});
      if (!roll) return;
      if (roll.total>=tn) { await post(target,"<p>Elemental Maneuver: resisted.</p>"); return; }
    }
    // Keep existing conditions and their timers; another casting cannot shorten them.
    const replace=[];
    const fresh=sources.filter(source=>{
      const matches=target.effects.filter(effect=>effect.active &&
        (source.statuses.length?source.statuses.some(status=>effect.statuses.has(status)):flag(effect,"maneuver")==="disarm"));
      if (!source.duration.value) return !matches.length;
      const seconds=source.duration.value*(CONFIG.time.roundTime??6);
      if(matches.some(effect=>!effect.isTemporary || effect.updateDuration().secondsRemaining>=seconds))return false;
      replace.push(...matches.filter(effect=>flag(effect,"maneuver")).map(effect=>effect.id));
      return true;
    });
    if (fresh.length) await game.modules.get(EFFECTS).api.applyEffectTemplate({type:`${EFFECTS}.effect`,effects:fresh,uuid:caster.uuid},target);
    if(replace.length)await target.deleteEmbeddedDocuments("ActiveEffect",replace);
    await post(target,`<p>${sources.map(source=>source.name).join(", ")}</p>`);
  });
}

export async function elementalManeuver(caster=selectedActor(),message=null) {
  requireOwner(caster);
  const targets=[...game.user.targets].filter(token=>token.actor?.system.attributes);
  const roll=message?.rolls?.filter(roll=>!roll.isCritFailConfirmationRoll).at(-1);
  const total=roll && roll.total+(Number(message.flags?.["swade-tools"]?.gmmod)||0);
  if (roll && total<4) { ui.notifications.info("Elemental Maneuver failed."); return; }
  const raises=roll?Math.max(0,Math.floor((total-4)/4)):0;
  const answer=await dialog().prompt({window:{title:"Elemental Maneuver"},content:
    `<div class="form-group"><label>Maneuver</label><select name="mode">${Object.entries({...title,reaction:"Reaction",release:"Remove Disarm"}).map(([key,name])=>`<option value="${key}">${name}</option>`).join("")}</select></div>
    <div data-target><div class="form-group"><label>Target</label><select name="target">${targets.map((token,i)=>`<option value="${i}">${escape(token.name)}</option>`).join("")}</select></div>
    <div class="form-group"><label>Casting total</label><input type="number" name="castTotal" min="4" value="${roll?total:""}" ${roll?"readonly":""}></div>
    <div class="form-group"><label>Resistance</label><select name="resistance"><option value="roll">Roll Agility</option><option value="failed">Failed</option></select></div></div>
    <div data-raises><div class="form-group"><label>Raises</label><input type="number" name="raises" min="0" max="100" value="${raises}"></div>
    <label><input type="checkbox" name="prone"> Prone</label>
    <div data-timed hidden><label><input type="checkbox" name="both"> Both conditions</label>
    <div class="form-group"><label>Rounds</label><input type="number" name="rounds" value="1" min="1" max="101"></div></div></div>`,
    render:(_event,app)=>{
      const form=app.element.querySelector("form");
      form.elements.mode.addEventListener("change",()=>{
        const mode=form.elements.mode.value, special=["reaction","release"].includes(mode);
        form.querySelector("[data-target]").hidden=special;
        form.querySelector("[data-raises]").hidden=special;
        form.querySelector("[data-timed]").hidden=!["distracted","vulnerable"].includes(mode);
        form.elements.prone.closest("label").hidden=mode==="prone";
        form.elements.prone.checked=false;form.elements.both.checked=false;form.elements.rounds.value=1;
      });
    },ok:{label:"Apply",callback:(_event,button)=>new FormData(button.form)},rejectClose:false});
  if (!answer) return;
  const mode=answer.get("mode");
  if (mode==="reaction") { await post(caster,"<p>Elemental Maneuver: Reaction.</p>"); ui.notifications.info("Move your token."); return; }
  if (mode==="release") {
    const effects=caster.effects.filter(effect=>flag(effect,"maneuver")==="disarm");
    if (effects.length) await caster.deleteEmbeddedDocuments("ActiveEffect",effects.map(effect=>effect.id));
    await post(caster,"<p>Remove Disarm · Action</p>"); return;
  }
  const token=targets[Number(answer.get("target"))];
  if (!token) throw new Error("Target a character or NPC.");
  const options={mode,raises:Number(answer.get("raises")),prone:answer.has("prone"),both:answer.has("both"),rounds:Number(answer.get("rounds")),resistance:answer.get("resistance"),castTotal:roll?total:Number(answer.get("castTotal"))};
  maneuverEffects(options);
  if (token.actor.isOwner) return resolveManeuver(caster,token.actor,options);
  if (!game.users.activeGM) throw new Error("A connected GM is needed.");
  return game.users.activeGM.query(query,{casterUuid:caster.uuid,tokenUuid:token.document.uuid,options});
}

export function installManeuver() {
  CONFIG.queries[query]=async({casterUuid,tokenUuid,options},{user})=>{
    const caster=await fromUuid(casterUuid),token=await fromUuid(tokenUuid);
    if (!game.user.isActiveGM || !caster?.testUserPermission(user,"OWNER") || token?.documentName!=="Token" || token.hidden ||
      !caster.itemTypes.power.some(item=>flag(item,"key")==="elemental-maneuver")) throw new Error("Choose a caster and visible target.");
    await resolveManeuver(caster,token.actor,options); return true;
  };
  const update=item=>item.updateSource(itemUpdate(item));
  Hooks.on("preCreateItem",item=>{if(flag(item,"key")==="elemental-maneuver")update(item);});
  Hooks.on("preCreateActor",actor=>{
    const items=actor.toObject().items;
    for(const item of items) if(flag(item,"key")==="elemental-maneuver") {
      item.system.actions??={};item.system.actions.additional??={};item.system.actions.additional.maneuver=maneuverAction;
      if(!(flag(item,"maneuverRevision")>=2)){item.system.description=MANEUVER_DESCRIPTION;item.flags[ID].maneuverRevision=2;}
    }
    actor.updateSource({items});
  });
  Hooks.on("renderChatMessageHTML",(message,root)=>{
    const uuid=message.flags?.avatarBending?.itemUuid??message.flags?.["swade-better-powers"]?.powerCast?.itemUuid??
      message.flags?.[EFFECTS]?.context?.itemUuid??message.speakerActor?.items.get(message.flags?.["swade-tools"]?.itemroll)?.uuid;
    const item=uuid && foundry.utils.fromUuidSync(uuid);
    if(flag(item,"key")!=="elemental-maneuver")return;
    root.addEventListener("click",event=>{
      if(event.target.closest("button")?.textContent.trim()!=="Elemental Maneuver")return;
      event.preventDefault();event.stopImmediatePropagation();void elementalManeuver(item.actor,message).catch(report);
    },{capture:true});
  });
  Hooks.once("ready",()=>{void updateManeuverContent().catch(report);});
}

export async function updateManeuverContent() {
  if(!game.user.isActiveGM)return;
  return contentQueue("compendiums",async()=>{
  const macroPack=game.packs.get(`${ID}.macros`),powerPack=game.packs.get(`${ID}.techniques`);
  for(const pack of [macroPack,powerPack]) {
    const locked=pack.locked;
    try {
      if(locked)await pack.configure({locked:false});
      if(pack===macroPack) {
        if(!await pack.getDocument(MANEUVER_MACRO_ID)) await Macro.create(maneuverMacro(),{pack:pack.collection,keepId:true});
      } else {
        await pack.getIndex({fields:[`flags.${ID}.key`]});
        const row=pack.index.find(item=>flag(item,"key")==="elemental-maneuver");
        if(row){const item=await pack.getDocument(row._id);if(item.system.actions.additional.maneuver?.uuid!==maneuverAction.uuid||!(flag(item,"maneuverRevision")>=2))await item.update(itemUpdate(item));}
      }
    } finally {if(locked)await pack.configure({locked:true});}
  }
  const actors=new Map(game.actors.map(actor=>[actor.uuid,actor]));
  for(const scene of game.scenes)for(const token of scene.tokens)if(!token.actorLink&&token.actor)actors.set(token.actor.uuid,token.actor);
  for(const item of [...game.items,...[...actors.values()].flatMap(actor=>[...actor.items])])
    if(flag(item,"key")==="elemental-maneuver" && (item.system.actions.additional.maneuver?.uuid!==maneuverAction.uuid||!(flag(item,"maneuverRevision")>=2)))
      await item.update(itemUpdate(item));
  });
}
export const maneuverMacro=()=>({_id:MANEUVER_MACRO_ID,name:"Elemental Maneuver",type:"script",scope:"global",img:MANEUVER_ICON,
  flags:{[ID]:{key:"elemental-maneuver",contentRevision:2}},command:`try { await game.modules.get("${ID}").api.elementalManeuver(typeof actor === "undefined" ? undefined : actor); } catch(error) { ui.notifications.error(error.message); }`});
