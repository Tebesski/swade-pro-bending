import {ID, dialog, escape, flag, post, queue, requireOwner, selectedActor, skill, slug} from "./shared.mjs";
import {isCritical, needsConfirmation} from "./combat.mjs";
import {treatmentOutcome} from "./rules.mjs";

const serial = queue();
const HOUR = 3600;
const names = {mundane:"Mundane Healing",water:"Waterbending Healing",recovery:"Accelerated Recovery"};
const wounds = actor => actor.system.wounds.value;
const remaining = (actor,mode) => Math.max(0,(Number(flag(actor,"treatments")?.[mode])||0)-game.time.worldTime);
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
  if (needsConfirmation(roll,message)) await CONFIG.Dice.TraitRoll.confirmCritfail(message);
  const final = message?.rolls?.filter(r=>!r.isCritFailConfirmationRoll).at(-1) ?? roll;
  return treatmentOutcome(final.total,isCritical(final,message),mode);
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
  const updates = {[`flags.${ID}.treatments.${mode}`]:game.time.worldTime+hours*HOUR};
  if (before!==after) updates["system.wounds.value"] = after;
  await patient.update(updates);
  if (result.delta>0 && before>=cap && !patient.statuses.has("incapacitated")) await patient.toggleActiveEffect("incapacitated",{active:true});
  const resultText = result.critical?"Critical failure.":result.success?"Success.":"Failure.";
  const woundText = after!==before ? ` Wounds: ${before} → ${after}.` : "";
  await post(actor,`<p><strong>${names[mode]} · ${escape(patient.name)}</strong>: ${resultText}${woundText} Next attempt in ${hours} hours of world time.</p>`);
}
export async function heal(mode, actor=selectedActor(), targets=[...game.user.targets].map(t=>t.actor)) {
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
  const blocked = patients.filter(p=>remaining(p,mode)>0);
  if (blocked.length) throw new Error(blocked.map(p=>`${p.name} can retry in ${Math.ceil(remaining(p,mode)/60)} min`).join("; ")+".");
  const config = await configure(mode,patients);
  if (!config) return;
  for (const patient of patients) await serial(patient.uuid,async()=>{
    if (remaining(patient,mode)>0 || !wounds(patient)) return;
    const speed = Number(config.get("speed")??0), intensive = Number(config.get("intensive")??0);
    if (mode==="mundane") {
      if (!await confirmTime(mode,wounds(patient)*10)) return;
      const roll = await healingRoll(actor,patient,mode,Number(config.get("modifier")??0));
      if (roll) await review(roll,await outcome(roll,mode),24);
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
    if (!noPP && Number(item.powerPointObject?.value ?? 0) < pp) throw new Error("The caster does not have enough Power Points for this treatment.");
    const options = {item,sbsPowerCost:pp,avatarHealingHandled:true,avatarNoMartial:true,additionalMods,flavour:`${item.name} · ${patient.name}`};
    if (!bending) throw new Error("The caster needs the Bending skill.");
    const minutes = mode==="water"?[20,15,10][speed]*wounds(patient):[120,60,30][speed];
    if (mode==="recovery" && !await confirmTime(mode,minutes)) return;
    const roll = await actor.rollSkill(bending.id,options);
    if (!roll) return;
    if (!noPP) {
      const pool = item.system.arcane || "general";
      const points = actor.system.powerPoints[pool];
      if (points) await actor.update({[`system.powerPoints.${pool}.value`]:Math.max(0,points.value-pp)});
    }
    const cast = await outcome(roll,mode);
    if (!cast.success) {
      if (mode==="recovery") await review(roll,cast,cast.critical?24:[6,3,1][intensive]);
      else await review(roll,cast,(cast.critical?12:6)-Number(intensive>0));
      return;
    }
    if (mode==="water") {
      if (!await confirmTime(mode,minutes)) return;
      const check = await healingRoll(actor,patient,mode,0);
      if (check) {
        const result = await outcome(check,mode);
        await review(check,result,(result.critical?12:6)-Number(intensive>0));
      }
      return;
    }
    const check = await patient.rollAttribute("vigor",{flavour:`Natural Healing · ${patient.name}`,additionalMods:[mod("Accelerated Recovery",cast.bonus)]});
    if (check) {
      const natural = await outcome(check,"natural");
      if (natural.critical) natural.delta=1;
      await review(check,natural,[6,3,1][intensive]);
    } else await review(roll,{...cast,delta:0},[6,3,1][intensive]);

    async function review(roll,result,hours) {
      const apply = await dialog().confirm({window:{title:`${names[mode]} · ${patient.name}`},
        content:`<p>Roll total: <strong>${roll.total}</strong>. ${result.critical?"Critical failure.":result.success?"Success.":"Failure."} ${result.delta ? `Wounds change by ${result.delta}.`:"Wounds stay as they are."} Next attempt in ${hours} hours.</p>`,
        yes:{label:"Apply result and record attempt"},no:{label:"Keep sheet unchanged"},rejectClose:false});
      if (apply) await applyResult({actor,patient,mode,result,hours});
    }
  });
}
