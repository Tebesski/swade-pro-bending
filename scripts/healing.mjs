import {ID, POWERS, dialog, escape, flag, post, queue, report, requireOwner, selectedActor, skill, slug} from "./shared.mjs";
import {isCritical, needsConfirmation} from "./combat.mjs";
import {treatmentOutcome} from "./rules.mjs";

const serial = queue();
const HOUR = 3600;
const recoveryImmunityName = "Accelerated Recovery Immunity";
const names = {mundane:"Mundane Healing",water:"Waterbending Healing",recovery:"Accelerated Recovery"};
const wounds = actor => actor.system.wounds.value;
const remaining = (actor,mode) => Math.max(0,(Number(flag(actor,"treatments")?.[mode])||0)-game.time.worldTime);
const recoveryEffects = actor => [...actor.allApplicableEffects()].filter(effect=>
  flag(effect,"treatmentImmunity")==="recovery" || effect.name===recoveryImmunityName);
const immune = actor => recoveryEffects(actor).some(effect=>effect.active &&
  (!effect.isTemporary || effect.duration.secondsRemaining>0));
function immunitySource(hours) {
  const change = {key:"sbe.immunity",type:"override",value:"0",phase:"initial",priority:null};
  return {_id:foundry.utils.randomID(),name:recoveryImmunityName,type:"base",img:"icons/svg/regen.svg",
    transfer:false,disabled:false,showIcon:2,start:{time:game.time.worldTime,combat:null},
    duration:{value:hours,units:"hours",expiry:"turnStart",expired:false},
    description:"<p>Cannot receive Accelerated Recovery while this effect is active. Disable or remove it to allow another treatment.</p>",
    system:{changes:[change]},flags:{[ID]:{treatmentImmunity:"recovery"},
      "swade-better-effects":{conditions:[{signature:JSON.stringify([change.key,change.type,change.value,change.phase,change.priority]),
        predicate:{op:"flag",source:"roll",flag:"accelerated-recovery*"}}]}}};
}
const blocked = (patient,mode) => mode==="recovery" ? immune(patient) : remaining(patient,mode)>0;
function checkImmunity(patient,mode) {
  if (!blocked(patient,mode)) return;
  if (mode==="recovery") throw new Error(`${patient.name} has Accelerated Recovery Immunity. Wait for it to expire or disable/remove the effect.`);
  throw new Error(`${patient.name} can retry in ${Math.ceil(remaining(patient,mode)/60)} min.`);
}
const mod = (label,value) => ({label,value});
const choices = (name,label,values) => `<div class="form-group"><label>${label}</label><select name="${name}">${values.map(([value,text])=>`<option value="${value}">${text}</option>`).join("")}</select></div>`;
async function configure(mode, patients) {
  const patientNames = patients.map(p=>`${escape(p.name)} (${wounds(p)} Wound${wounds(p)===1?"":"s"})`).join(", ");
  const gate = mode==="water"?"<p>Confirm Touch range, clean water, and Golden Hour eligibility, or use Extended Window.</p>" :
    mode==="recovery"?"<p>Confirm Touch range and that the patient is past the Golden Hour.</p>" :
    "<p>Confirm the medic has suitable equipment and time. Apply any equipment or facility penalty below.</p>";
  const speed = mode==="water"?["Normal (20 min/Wound)","Rapid Triage (15 min/Wound, −1)","Rapid Triage (10 min/Wound, −2)"]:
    ["Normal (2 hours)","Expedite (1 hour, −1)","Expedite (30 minutes, −2)"];
  const intensive = mode==="water"?["Normal (6 / 12 hours)","Intensive Care (−1; reduce immunity by 1 hour)","Intensive Care (−2; reduce immunity by 1 hour)"]:
    ["Normal (6 hours)","Intensive Care (3 hours, −1)","Intensive Care (1 hour, −2)"];
  return dialog().prompt({window:{title:names[mode]},content:`<p>Patients: <strong>${patientNames}</strong>.</p>${gate}`+
    (mode==="mundane" ? `<div class="form-group"><label>Equipment/facility modifier</label><input name="modifier" type="number" value="0"></div>
      <p>Minimum treatment time: ${Math.max(...patients.map(p=>wounds(p)*10))} minutes for concurrent care.</p>` :
      choices("speed","Treatment duration",speed.map((label,i)=>[i,label]))+choices("intensive","Immunity",intensive.map((label,i)=>[i,label])))+
    (mode==="water"?'<label><input type="checkbox" name="extended"> Extended Window (−1)</label>':"")+
    '<p>The macro records immunity against Foundry world time. Advance the clock when the table is ready.</p>',
    ok:{label:mode==="mundane"?"Start treatment":"Roll activation",callback:(_e,button)=>new FormData(button.form)},rejectClose:false});
}
const rollMessage = roll => game.messages.get(roll?.messageId ?? roll?.options?.messageId);
async function outcome(roll,mode) {
  const message = rollMessage(roll);
  if (message) return outcomeFromMessage(message,mode);
  if (needsConfirmation(roll,message)) await CONFIG.Dice.TraitRoll.confirmCritfail(message);
  const final = message?.rolls?.filter(r=>!r.isCritFailConfirmationRoll).at(-1) ?? roll;
  return treatmentOutcome(final.total,isCritical(final,message),mode);
}
const rollTotal = (roll,message) => roll.total+(Number(message?.flags?.["swade-tools"]?.gmmod)||0);

async function reviewHealingRoll({roller,patient,mode,resultMode,roll,message=rollMessage(roll),hours}) {
  let result = message ? await outcomeFromMessage(message,resultMode) : await outcome(roll,resultMode);
  while (true) {
    const duration = hours(result);
    const delta = resultMode==="natural" && result.critical ? 1 : result.delta;
    const action = await dialog().wait({
      classes:["avatar-healing-review"],window:{title:`${names[mode]} · ${patient.name}`},position:{width:620},
      content:`<p>${escape(roller.name)} rolled <strong>${rollTotal(roll,message)}</strong>. ${result.critical?"Critical failure.":result.success?"Success.":"Failure."} ${delta?`Wounds change by ${delta}.`:"Wounds stay as they are."} Immunity lasts ${duration} hours.</p>`,
      buttons:[
        {action:"apply",label:"Apply result",default:true},
        {action:"free",label:"Free reroll"},
        {action:"benny",label:"Benny reroll",disabled:!(roller.bennies>0)},
        ...(!result.success ? [
          {action:"force",label:"Apply anyway",class:"avatar-healing-override"},
          {action:"raise",label:"Apply anyway (Raise)",class:"avatar-healing-override"}
        ] : [])
      ],rejectClose:false,
      render:(_event,app)=>{
        const hook = Hooks.on("updateActor",updated=>{
          if (updated.uuid!==roller.uuid) return;
          const button = app.element.querySelector('[data-action="benny"]');
          if (button) button.disabled = !(roller.bennies>0);
        });
        app.addEventListener("close",()=>Hooks.off("updateActor",hook),{once:true});
      }
    });
    if (!action) return null;
    if (action==="apply") return {roll,result:{...result,delta},hours:duration};
    if (action==="force" || action==="raise") {
      const forced = treatmentOutcome(action==="raise"?8:4,false,resultMode);
      return {roll,result:forced,hours:hours(forced)};
    }
    if (!["free","benny"].includes(action)) continue;
    if (typeof roll.reroll!=="function") throw new Error("The original roll cannot be rerolled.");
    if (action==="benny" && (!(roller.bennies>0) || !await roller.spendBenny())) continue;
    roll.rerollMode = action==="benny"?"benny":"free";
    if (action==="benny") roll.applyReroll?.(roller);
    const next = await roll.reroll();
    const nextMessage = await next.toMessage({
      speaker:message?.speaker ?? ChatMessage.getSpeaker({actor:roller}),
      flavor:message?.flavor ?? `${names[mode]} · ${patient.name}`,
      ...(message ? {flags:message.flags,whisper:message.whisper,blind:message.blind} : {})
    });
    roll = next;
    message = nextMessage;
    result = message ? await outcomeFromMessage(message,resultMode) : await outcome(roll,resultMode);
  }
}
async function outcomeFromMessage(message,mode) {
  let roll = message.rolls.find(roll=>!roll.isCritFailConfirmationRoll);
  if (needsConfirmation(roll,message)) await CONFIG.Dice.TraitRoll.confirmCritfail(message);
  roll = message.rolls.find(roll=>!roll.isCritFailConfirmationRoll);
  return treatmentOutcome(roll.total+(Number(message.flags["swade-tools"]?.gmmod)||0),isCritical(roll,message),mode);
}

const activationItemUuid = message => flag(message,"roll")?.itemUuid ??
  message.flags?.[POWERS]?.powerCast?.itemUuid ?? message.flags?.["swade-better-effects"]?.context?.itemUuid ??
  message.speakerActor?.items.get(message.flags?.["swade-tools"]?.itemroll)?.uuid;

export function installHealing() {
  Hooks.on("renderChatMessageHTML",(message,root)=>{
    const uuid = activationItemUuid(message);
    if (!uuid || !message.rolls?.length) return;
    const item = foundry.utils.fromUuidSync(uuid);
    const key = flag(item,"key");
    if (!["accelerated-recovery","healing"].includes(key)) return;
    root.addEventListener("click",event=>{
      const button = event.target.closest("button");
      if (!button || button.textContent.trim()!=="Treat Patient") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void heal(key==="healing"?"water":"recovery",item.actor,undefined,message).catch(report);
    },{capture:true});
  });
  Hooks.once("ready",async()=>{
    if (!game.user.isGM || game.users.activeGM?.id!==game.user.id) return;
    const actors = new Map(game.actors.map(actor=>[actor.uuid,actor]));
    for (const scene of game.scenes) for (const token of scene.tokens) {
      if (!token.actorLink && token.actor) actors.set(token.actor.uuid,token.actor);
    }
    for (const actor of actors.values()) {
      const updates = actor.effects.filter(effect=>flag(effect,"treatmentImmunity")==="recovery" &&
        effect.duration.units==="seconds" && effect.duration.value%HOUR===0).map(effect=>({
          _id:effect.id,"duration.units":"hours","duration.value":effect.duration.value/HOUR
        }));
      if (updates.length) await actor.updateEmbeddedDocuments("ActiveEffect",updates).catch(report);
    }
  });
}
async function confirmTime(mode, minutes) {
  return dialog().confirm({window:{title:names[mode]},
    content:`<p>Confirm that ${minutes} minutes of treatment have passed. Advance the world clock separately if needed.</p>`,
    yes:{label:"Treatment time has passed"},no:{label:"Cancel"},rejectClose:false});
}
async function healingRoll(medic, patient, mode, modifier) {
  const trained = skill(medic,"Healing");
  const experienced = [...medic.allApplicableEffects()].some(e=>e.active && flag(e,"experiencedHealer"));
  const additionalMods = [];
  if (experienced && !trained) additionalMods.push(mod("Experienced Healer",2));
  if (!experienced && wounds(patient)) additionalMods.push(mod("Patient Wounds",-wounds(patient)));
  if (modifier) additionalMods.push(mod("Equipment / Facility",modifier));
  const options = {flavour:`${names[mode]} · ${patient.name}`,additionalMods};
  return trained ? medic.rollSkill(trained.id,options) : medic.makeUnskilledAttempt(options);
}
async function applyResult({actor,patient,mode,result,hours}) {
  const before = wounds(patient);
  const cap = patient.system.wounds.max;
  const after = Math.max(0,Math.min(cap,before+result.delta));
  const updates = {};
  checkImmunity(patient,mode);
  if (mode==="recovery") {
    const old = new Set(recoveryEffects(patient).map(effect=>effect.id));
    updates.effects = [...patient.effects.filter(effect=>!old.has(effect.id)).map(effect=>effect.toObject()),immunitySource(hours)];
    if (Object.hasOwn(flag(patient,"treatments") ?? {},"recovery")) updates[`flags.${ID}.treatments.recovery`] = new foundry.data.operators.ForcedDeletion();
  } else updates[`flags.${ID}.treatments.${mode}`] = game.time.worldTime+hours*HOUR;
  if (before!==after) updates["system.wounds.value"] = after;
  await patient.update(updates);
  if (result.delta>0 && before>=cap && !patient.statuses.has("incapacitated")) await patient.toggleActiveEffect("incapacitated",{active:true});
  const resultText = result.critical?"Critical failure.":result.success?"Success.":"Failure.";
  const woundText = after!==before ? ` Wounds: ${before} → ${after}.` : "";
  await post(actor,`<p><strong>${names[mode]} · ${escape(patient.name)}</strong>: ${resultText}${woundText} Next attempt in ${hours} hours of world time.</p>`);
}
export async function heal(mode, actor=selectedActor(), targets=[...game.user.targets].map(t=>t.actor), activationMessage=null) {
  requireOwner(actor);
  if (!Object.hasOwn(names,mode)) throw new Error("Choose a healing method.");
  const patients = [...new Map(targets.filter(Boolean).map(p=>[p.uuid,p])).values()];
  if (!patients.length) throw new Error("Target the patient. Target your own token to treat yourself.");
  if (patients.some(p=>!p.isOwner||!p.system.wounds)) throw new Error("A GM must run treatment for any patient you cannot edit.");
  if (mode!=="mundane" && patients.length!==1) throw new Error("Waterbending treats one patient at a time.");
  const max = Math.floor(actor.system.attributes.smarts.die.sides/2);
  if (mode==="mundane" && patients.length>max && !actor.itemTypes.edge?.some(e=>slug(e.name)==="triage")) throw new Error(`This medic can treat up to ${max} patients concurrently.`);
  const item = mode==="mundane"?null:actor.itemTypes.power?.find(p=>flag(p,"key")===(mode==="water"?"healing":"accelerated-recovery"));
  if (mode!=="mundane" && !item) throw new Error(`The caster needs the ${mode==="water"?"Healing":"Accelerated Recovery"} Technique.`);
  if (patients.some(p=>wounds(p)===0)) throw new Error("Each patient must have at least one Wound.");
  for (const patient of patients) checkImmunity(patient,mode);
  if (activationMessage && (!activationMessage.isContentVisible || activationMessage.speakerActor?.uuid!==actor.uuid ||
    activationItemUuid(activationMessage)!==item?.uuid)) throw new Error("Choose this actor's Technique activation roll.");
  const activation = activationMessage?.rolls?.find(roll=>!roll.isCritFailConfirmationRoll);
  if (activationMessage && !Number.isFinite(activation?.total)) throw new Error("This message has no activation roll.");
  const castData = activationMessage?.flags[POWERS]?.powerCast;
  const chosen = castData?.modifierOptions ?? {};
  const option = key => /m2$/.test(chosen[key]??"") ? 2 : /m1$/.test(chosen[key]??"") ? 1 : 0;
  const config = activation ? new Map([["speed",option(mode==="water"?"rapid-triage":"expedite")],
    ["intensive",option("intensive-care")],...(chosen["extended-window"]?[["extended",true]]:[])]) : await configure(mode,patients);
  if (!config) return;
  for (const patient of patients) await serial(patient.uuid,async()=>{
    checkImmunity(patient,mode);
    if (!wounds(patient)) return;
    const speed = Number(config.get("speed")??0), intensive = Number(config.get("intensive")??0);
    if (mode==="mundane") {
      if (!await confirmTime(mode,wounds(patient)*10)) return;
      const roll = await healingRoll(actor,patient,mode,Number(config.get("modifier")??0));
      if (roll) await review({roller:actor,roll,resultMode:mode,hours:()=>24});
      return;
    }
    const bending = skill(actor,"Bending");
    const additionalMods = [];
    const self = actor.uuid===patient.uuid;
    if (self) additionalMods.push(mod("Self-treatment",-2));
    const size = mode==="water" ? Math.max(0,patient.system.stats.size-2):0;
    if (size) additionalMods.push(mod("Healing patient Size",-size));
    const extended = config.has("extended");
    const pp = item.system.pp+2*(speed+intensive+Number(extended));
    const noPP = game.modules.get("swade-better-powers").api.usesNoPowerPoints(item);
    if (!activation && !noPP && Number(item.powerPointObject?.value ?? 0) < pp) throw new Error("The caster does not have enough Power Points for this treatment.");
    const options = {item,sbsPowerCost:pp,avatarHealingHandled:true,avatarNoMartial:true,additionalMods,flavour:`${item.name} · ${patient.name}`};
    if (!bending) throw new Error("The caster needs the Bending skill.");
    const minutes = mode==="water"?[20,15,10][speed]*wounds(patient):[120,60,30][speed];
    if (mode==="recovery" && !await confirmTime(mode,minutes)) return;
    const roll = activation ?? await actor.rollSkill(bending.id,options);
    if (!roll) return;
    if (!activation && !noPP) {
      const pool = item.system.arcane || "general";
      const points = actor.system.powerPoints[pool];
      if (points) await actor.update({[`system.powerPoints.${pool}.value`]:Math.max(0,points.value-pp)});
    }
    let cast = activation ? await outcomeFromMessage(activationMessage,mode) : await outcome(roll,mode);
    const immunityHours = result => result.critical ? (mode==="recovery"?24:12) :
      mode==="recovery"?[6,3,1][intensive]:6-Number(intensive>0);
    if (!cast.success) {
      const reviewed = await reviewHealingRoll({roller:actor,patient,mode,resultMode:mode,roll,
        message:activationMessage ?? rollMessage(roll),hours:immunityHours});
      if (!reviewed) return;
      cast = reviewed.result;
      if (!cast.success) {
        await applyResult({actor,patient,mode,result:cast,hours:reviewed.hours});
        return;
      }
    }
    if (mode==="water") {
      if (!await confirmTime(mode,minutes)) return;
      const check = await healingRoll(actor,patient,mode,0);
      if (check) {
        await review({roller:actor,roll:check,resultMode:mode,
          hours:result=>(result.critical?12:6)-Number(intensive>0)});
      }
      return;
    }
    const check = await patient.rollAttribute("vigor",{flavour:`Natural Healing · ${patient.name}`,additionalMods:[mod("Accelerated Recovery",cast.bonus)]});
    if (check) {
      await review({roller:patient,roll:check,resultMode:"natural",hours:immunityHours});
    }

    async function review(options) {
      const reviewed = await reviewHealingRoll({patient,mode,...options});
      if (reviewed) await applyResult({actor,patient,mode,result:reviewed.result,hours:reviewed.hours});
    }
  });
}
