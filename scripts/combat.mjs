import {ID, POWERS, EFFECTS, background, dialog, enabled, escape, flag, queue, report, requireOwner, selectedActor, skill, slug} from "./shared.mjs";
import {martialOutcome, nextFatigue} from "./rules.mjs";
import {criticalFailure} from "../../swade-better-effects/scripts/roll-outcomes.mjs";

const serial = queue();
const MARK = "avatarBending";
const note = (name,value) => ({label:name,value});
const getRoll = message => message.rolls?.filter(r=>!r.isCritFailConfirmationRoll).at(-1);
export const isCritical = (roll, message) => {
  if (!criticalFailure(roll)) return false;
  if (needsConfirmation(roll,message)) return false;
  return !(message?.rolls?.some(r=>r.isCritFailConfirmationRoll && r.total!==1));
};
export function needsConfirmation(roll,message) {
  return Boolean(message?.speakerActor?.isWildcard === false && criticalFailure(roll) && !roll.groupRoll
    && roll.terms[0]?.dice?.length === 1 && !message.rolls.some(r=>r.isCritFailConfirmationRoll));
}
function combatFor(token) {
  return game.combats.find(c=>c.started && c.scene?.id===token?.parent?.id && c.combatants.some(p=>p.token?.uuid===token.uuid));
}
function distance(a,b) {
  const scene = a?.parent;
  if (!scene?.grid || scene.id!==b?.parent?.id) return Infinity;
  if ((a.elevation ?? 0)!==(b.elevation ?? 0)) return Infinity;
  try {
    const grid = scene.grid;
    const centerA = a.getCenterPoint(), centerB = b.getCenterPoint();
    const centers = grid.measurePath([centerA,centerB]).distance / (grid.distance || 1);
    return centers - Math.max(0,(Math.min(a.width,a.height)+Math.min(b.width,b.height))/2-1);
  } catch { return Infinity; }
}
const hostile = (caster,other) => {
  const a = caster.disposition, b = other.disposition;
  return a !== b && (a<0 || b<0) && b!==CONST.TOKEN_DISPOSITIONS.SECRET;
};
function engaged(caster,other) {
  if (!other.actor || !hostile(caster,other) || ["incapacitated","dead","stunned"].some(s=>other.actor.statuses.has(s))) return false;
  const dist = distance(caster,other);
  const reach = other.actor.statuses.has("reach") || (enabled(other.actor,"elementalReach") && other.actor.itemTypes.weapon?.some(w=>flag(w,"weapon")==="assault" && w.system.isReadied));
  const deadlyReach = Math.max(0,...[...other.actor.allApplicableEffects()].filter(e=>e.active).map(e=>{
    const data=flag(e,"deadlyElements");
    return data?.attack==="assault" && other.actor.itemTypes.weapon?.some(w=>flag(w,"weapon")==="assault" && w.system.isReadied) ? data.reach??0 : 0;
  }));
  return dist<=Math.max(reach?2:1,1+deadlyReach)+0.001;
}
function snapshot(actor,item,{kind,cast,options,context,message}={}) {
  const caster = actor.token ?? actor.getActiveTokens(false,true).find(t=>t.object?.controlled)
    ?? actor.getActiveTokens(false,true).find(t=>t.parent?.id===canvas.scene?.id);
  const combat = combatFor(caster);
  const targets = (context?.targetUuids ?? [...game.user.targets].map(t=>t.document.uuid)).map(uuid=>{
    try {return foundry.utils.fromUuidSync(uuid);} catch {return null;}
  }).filter(t=>t?.documentName==="Token" && t.actor && (game.user.isGM||!t.hidden));
  const foes = combat?.combatants.map(c=>c.token).filter(t=>t?.uuid!==caster?.uuid && t && (game.user.isGM||!t.hidden)) ?? [];
  const modifiers = (cast?.modifiers ?? []).map(slug);
  const mode = flag(item,"mode") ?? "targets";
  const effectAPI = game.modules.get(EFFECTS).api;
  const itemFlags = effectAPI.getFlags(item);
  const area = mode==="area" || (flag(item,"areaOptions") && modifiers.some(m=>m.startsWith("area-")||m==="cone"));
  return {actorUuid:actor.uuid,itemUuid:item?.uuid,kind,key:flag(item,"key"),combat:combat?.id,
    threatened:!!combat&&foes.some(t=>engaged(caster,t)), mode, area, specialist:enabled(actor,"closeCombatSpecialist"),
    targets:targets.map(t=>({uuid:t.uuid,name:t.name,self:t.actor.uuid===actor.uuid,engaged:!!combat&&engaged(caster,t),parry:(t.actor.system.stats?.parry?.value ?? 0) + (effectAPI.getFlags(t.actor).some(tag=>tag.startsWith("avatar-") && tag.endsWith("bender")
        && itemFlags.includes(tag.slice(7,-6))) && enabled(t.actor,"shadowTraining") ? 1 : 0),
      ...(context?.opposition?.actorUuid===t.actor.uuid?{opposed:context.opposition.targetNumber}:{})})),
    skipMartial:!!options?.avatarNoMartial
  };
}
function markRoll(roll,data) {
  if (!roll.terms[0]) return;
  roll.terms[0].options[MARK] = data;
  for (const die of roll.terms[0].dice ?? []) die.options[MARK] = data;
}
function detect(actor,skill,item,options) {
  if (!actor || options?.avatarNoBacklash || options?.sbsResistance || (item?.actor && item.actor.uuid!==actor.uuid)) return;
  if (flag(item,"weapon")) return "weapon";
  if (flag(item,"technique") && flag(item,"key")!=="knacks") return "technique";
  if (background(actor) && (slug(skill?.system?.swid)==="bending" || slug(skill?.name)==="bending")) return item?.type==="power"?"technique":"skill";
}
function getInfo(message) {return flag(message,"roll");}
function sourceActor(info) {
  try { return foundry.utils.fromUuidSync(info.actorUuid); } catch { return null; }
}
function result(message, info, extras={}) {
  const roll = getRoll(message);
  return martialOutcome({...info,...extras,total:roll?.total+(Number(message.flags["swade-tools"]?.gmmod)||0),critical:isCritical(roll,message)});
}

function applyBacklash(message) {
  if (!message.isOwner) return;
  const info = getInfo(message);
  if (!info) throw new Error("Choose a bending roll.");
  const actor = requireOwner(sourceActor(info));
  return serial(`consequences:${actor.uuid}`,async()=>{
    if (!enabled(actor,"backlash") || flag(message,"backlashApplied") || !isCritical(getRoll(message),message)) return false;
    const fatigue = actor.system.fatigue;
    const next = nextFatigue(fatigue.value,fatigue.max);
    if (next.incapacitated) {
      if (!actor.statuses.has("incapacitated")) await actor.toggleActiveEffect("incapacitated",{active:true});
    } else await actor.update({"system.fatigue.value":next.value});
    await message.setFlag(ID,"backlashApplied",true);
    ui.notifications.info(`${actor.name}: Bending Backlash · ${next.incapacitated?"Incapacitated":next.value===1?"Fatigued":"Exhausted"}.`);
    return true;
  });
}

const checked = x => x?"checked":"";
const renderResults = state => {
  const rows = state.results.filter(t=>!t.self);
  return `<p><strong>${state.activated?"Technique activates.":"Technique does not activate."}</strong> ${state.vulnerable?"Caster becomes Vulnerable.":""}</p>` +
    (rows.length?`<ul>${rows.map(t=>`<li>${escape(t.name)}: ${state.activated?(t.hit?"meets the martial threshold":"misses"):"no hit"}${t.engaged?` (Parry ${t.parry})`:""}${t.opposed>4?` (opposed ${t.opposed})`:""}</li>`).join("")}</ul>`:"");
};
export async function reviewMartial(message) {
  const info = getInfo(message);
  if (!message?.isContentVisible || !message.isOwner || info?.kind!=="technique") throw new Error("Choose a Technique casting roll.");
  const actor = requireOwner(sourceActor(info));
  if (!enabled(actor,"martial")) throw new Error("Martial Bending is disabled on this actor.");
  const prior = flag(message,"martialReview");
  const mode = prior?.mode ?? info.mode;
  const opposedReplies = game.messages.contents.filter(reply=>reply.isContentVisible && reply.flags[EFFECTS]?.context?.opposition?.messageUuid===message.uuid);
  const rows = (prior?.targets ?? info.targets).map(target=>{
    const reply = opposedReplies.findLast(m=>m.flags[EFFECTS].context.opposition.defenderUuid===target.uuid);
    const roll = reply && getRoll(reply);
    return roll && !isCritical(roll,reply) ? {...target,opposed:roll.total+(Number(reply.flags["swade-tools"]?.gmmod)||0)} : target;
  });
  const inputs = rows.filter(t=>!t.self).map((t,i)=>`<fieldset><legend>${escape(t.name)}</legend><label><input type="checkbox" name="engaged${i}" ${checked(t.engaged)}> Engaged (including Reach)</label>
    <div class="form-group"><label>Parry</label><input type="number" name="parry${i}" min="0" value="${Number(t.parry)||4}"></div>
    <div class="form-group"><label>Opposed total, if any</label><input type="number" name="opposed${i}" value="${Number.isFinite(t.opposed)?t.opposed:""}"></div></fieldset>`).join("");
  const input = await dialog().prompt({window:{title:"Review Martial Bending"},content:`
    <p>Confirm actual engagement and any opposed roll. A technique can activate at 4 and still miss. Target tokens before rolling to list them here.</p>
    <label><input type="checkbox" name="threatened" ${checked(prior?.threatened??info.threatened)}> Caster is threatened in melee</label>
    <div class="form-group"><label>Casting on</label><select name="mode"><option value="targets" ${["targets","choice"].includes(mode)?"selected":""}>Other recipients</option><option value="self" ${mode==="self"?"selected":""}>Self or own equipment only</option><option value="area" ${mode==="area"||info.area?"selected":""}>Area effect</option></select></div>
    <label><input type="checkbox" name="outside" ${checked(prior?.outside)}> Also targets someone outside the engagement who is not listed below</label>
    ${inputs}`,
    ok:{label:"Review result",callback:(_e,button)=>new FormData(button.form)},rejectClose:false});
  if (!input) return;
  const targets = rows.filter(t=>!t.self).map((t,i)=>({...t,engaged:input.has(`engaged${i}`),parry:Number(input.get(`parry${i}`)),
    opposed:input.get(`opposed${i}`)===""?null:Number(input.get(`opposed${i}`))}));
  const outside = input.has("outside");
  const castingMode = input.get("mode");
  const amended = {targets,mode:castingMode,threatened:input.has("threatened"),outside};
  const state = result(message,info,{...amended,area:castingMode==="area",
    targets:castingMode==="self"?[]:outside?[...targets,{name:"Other recipient",engaged:false}]:targets});
  const apply = await dialog().confirm({window:{title:"Martial Bending Result"},content:renderResults(state)+
    "<p>Use the listed hits when choosing recipients for damage or effects.</p>",
    yes:{label:state.vulnerable?"Save and apply Vulnerable":"Save result"},no:{label:"Cancel"},rejectClose:false});
  if (!apply) return;
  await serial(`consequences:${actor.uuid}`,async()=>{
    if (!enabled(actor,"martial")) return;
    if (state.vulnerable && !actor.statuses.has("vulnerable")) await actor.toggleActiveEffect("vulnerable",{active:true});
    await message.setFlag(ID,"martialReview",{...amended,html:renderResults(state)});
  });
}

export async function reviewLatest(actor=selectedActor()) {
  requireOwner(actor);
  const message = game.messages.contents.findLast(m=>m.isContentVisible && (m.isAuthor||game.user.isGM)
    && getInfo(m)?.actorUuid===actor.uuid && getInfo(m).kind==="technique");
  if (!message) throw new Error("No eligible Technique roll in chat for this actor.");
  return reviewMartial(message);
}

export async function sustainBubble(actor=selectedActor()) {
  requireOwner(actor);
  const bending = skill(actor,"Bending");
  const options = {avatarNoBacklash:true,flavour:"Sustain Water Bubble"};
  return bending ? actor.rollSkill(bending.id,options) : actor.makeUnskilledAttempt(options);
}

function button(group,label,action) {
  const b=document.createElement("button"); b.type="button"; b.textContent=label;
  b.addEventListener("click",async()=>{if(b.disabled)return;b.disabled=true;try{await action();}catch(e){report(e);}finally{b.disabled=false;}});
  group.append(b);
}
export function installCombat() {
  const actorClass = CONFIG.Actor.documentClass;
  const rollDialog = game.swade.RollDialog;
  const openRoll = rollDialog.asPromise;
  rollDialog.asPromise = function(context) {
    if (context.roll?.rollType==="running" && context.actor && game.modules.get(EFFECTS).api.getFlags(context.actor).includes("avatar-quicken")) {
      // Quicken doubles the running distance, preserving the original die type and swing.
      const doubled = new context.roll.constructor(`(${context.roll.formula}) * 2`,context.roll.data,context.roll.options);
      const runningMod = game.i18n.localize("SWADE.Modifier");
      context = {...context,roll:doubled,mods:context.mods.map(m=>m.label===runningMod?{...m,value:Number(m.value)*2}:m)};
    }
    return openRoll.call(this,context);
  };
  const orig = actorClass.prototype.rollSkill;
  actorClass.prototype.rollSkill = async function(id,options,tempSkill) {
    if (flag(options?.item,"key")==="knacks") return null;
    return orig.call(this,id,options,tempSkill);
  };
  Hooks.on("renderApplicationV2",(app,html)=>{
    if (!(app instanceof game.swade.RollDialog)) return;
    const actor=app.ctx?.actor;
    if (!actor || !game.modules.get(EFFECTS).api.getFlags(actor).includes("avatar-no-running-penalty")) return;
    const label = game.i18n.localize("SWADE.Running");
    for (const preset of html.querySelectorAll('[data-action="addPreset"]')) {
      if (preset.textContent.trim()===label) preset.hidden=true;
    }
  });
  Hooks.on("swadePreRollSkill",(actor,skill,roll,mods,options)=>{
    if (options.avatarNoBacklash) { if (roll.terms[0]) roll.terms[0].options.avatarNoBacklash = true; return; }
    const item = options.item;
    const kind = detect(actor,skill,item,options);
    if (!kind) return;
    markRoll(roll,snapshot(actor,item,{kind,options,context:roll.options[EFFECTS]}));
    if (flag(item,"key")==="healing" && !options.avatarHealingHandled) {
      const target = game.user.targets.first()?.actor;
      const size = Math.max(0,(target?.system.stats?.size ?? 0)-2);
      if (size) mods.push(note("Healing patient Size",-size));
    }
    if (["healing","accelerated-recovery"].includes(flag(item,"key")) && !options.avatarHealingHandled && game.user.targets.first()?.actor?.uuid===actor.uuid)
      mods.push(note("Self-treatment",-2));
  });
  Hooks.on("preCreateChatMessage",(message,_data,_options,userId)=>{
    if (userId!==game.user.id) return;
    const roll = getRoll(message);
    if (!roll) return;
    const term = roll.terms[0];
    const marker = term?.options[MARK] ?? term?.dice?.find(d=>d.options[MARK])?.options[MARK];
    if (term?.options.avatarNoBacklash) return;
    const context = message.flags[EFFECTS]?.context;
    if (context?.rollType==="damage" || roll.options?.rollType==="damage") return;
    const cast = message.flags[POWERS]?.powerCast ?? term?.options.sbpPowerCast ?? term?.dice?.find(d=>d.options.sbpPowerCast)?.options.sbpPowerCast;
    const actor = marker ? sourceActor(marker) : message.speakerActor;
    if (!actor) return;
    const item = cast?.itemUuid ? foundry.utils.fromUuidSync(cast.itemUuid) : context?.itemUuid ? foundry.utils.fromUuidSync(context.itemUuid) : actor.items.get(message.flags["swade-tools"]?.itemroll);
    const kind = marker?.kind ?? detect(actor,context?.skill,item,{});
    if (!kind) return;
    const info = marker && !cast ? marker : {...snapshot(actor,item,{kind,cast,context,message}),skipMartial:!!marker?.skipMartial};
    message.updateSource({[`flags.${ID}.roll`]:info});
  });
  const auto = (message,userId)=>{
    if (!getInfo(message) || !isCritical(getRoll(message),message)) return;
    // Use the roller for visible rolls and the active GM for blind rolls.
    const author = game.users.get(userId);
    const designated = message.blind && !author?.isGM ? game.users.activeGM?.id : userId;
    if (game.user.id===designated && message.isContentVisible) void applyBacklash(message).catch(report);
  };
  Hooks.on("createChatMessage",(m,_o,userId)=>auto(m,userId));
  Hooks.on("updateChatMessage",(m,d,_o,userId)=>{if(d.rolls)auto(m,userId);});
  Hooks.on("renderChatMessageHTML",(message,html)=>{
    const info = getInfo(message);
    if (!info || (!message.isAuthor&&!game.user.isGM) || !message.isContentVisible) return;
    const actor = sourceActor(info);
    const root = html.querySelector(".message-content");
    if (!actor?.isOwner || !root || root.querySelector(".avatar-roll-controls")) return;
    const group = document.createElement("div"); group.className="avatar-roll-controls card-buttons";
    if (enabled(actor,"martial") && info.kind==="technique" && !info.skipMartial && info.combat) {
      const review = document.createElement("div");
      review.innerHTML = flag(message,"martialReview")?.html ? foundry.utils.cleanHTML(flag(message,"martialReview").html) :
        (info.threatened || info.targets.some(t=>t.engaged) ? renderResults(result(message,info)):"");
      if (review.innerHTML) group.append(review);
      button(group,"Review Martial Bending",()=>reviewMartial(message));
    }
    if (group.childElementCount) root.append(group);
  });
}
