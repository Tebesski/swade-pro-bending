import {ID, EFFECTS, dialog, escape, flag, macroTarget, queue, requireOwner, selectedActor} from "./shared.mjs";
import {TRAIT_MACRO_UUID, traitAction, traitEffect} from "./trait-effects.mjs";

const serial = queue();
const query = `${ID}.traitEffect`;
const attributes = ["agility","smarts","spirit","strength","vigor"];
const title = key=>game.i18n.localize(CONFIG.SWADE.attributes[key].long);
const traits = actor=>[
  ...attributes.map(key=>({type:"attribute",key,name:title(key)})),
  ...(actor.itemTypes.skill??[]).map(item=>({type:"skill",key:item.system.swid||item.id,id:item.id,name:item.name}))
];
const reference = trait=>`${trait.type}:${trait.id??trait.key}`;
const sameTrait = (effect,trait)=> {
  const data = flag(effect,"traitEffect");
  return data?.type===trait.type && (trait.type==="skill"?data.id===trait.id:data.key===trait.key);
};
const strength = effect=>Math.max(0,flag(effect,"traitEffect").steps-(effect.flags[EFFECTS]?.lingeringState?.progress??0));

export async function applyTraitEffect(actor,options) {
  requireOwner(actor);
  return serial(actor.uuid,async()=>{
    const trait = traits(actor).find(trait=>reference(trait)===options.trait);
    if (!trait) throw new Error("Choose an attribute or a skill on the target.");
    const duration = Number(options.duration??5);
    if (!Number.isInteger(duration) || duration<1 || duration>100000) throw new Error("Enter a positive whole number of rounds.");
    const existing = actor.effects.filter(effect=>sameTrait(effect,trait));
    const source = actor.toObject();
    source.effects = source.effects.filter(effect=>!sameTrait(effect,trait));
    const baseline = new CONFIG.Actor.documentClass(source);
    const die = trait.type==="attribute" ? baseline.system.attributes[trait.key].die : baseline.items.get(trait.id).system.die;
    const data = traitEffect({trait,die,lower:!!options.lower,strong:!!options.strong,raised:!!options.raised,duration});
    if (!data) { ui.notifications.info(`${trait.name} is already d4.`); return; }
    const next = flag(data,"traitEffect");
    const previous = existing.filter(effect=>flag(effect,"traitEffect").lower===next.lower);
    if (previous.some(effect=>effect.active && (strength(effect)>next.steps ||
      strength(effect)===next.steps && (flag(effect,"traitEffect").strong || !next.strong)))) {
      ui.notifications.info(`${actor.name} already has an equal or stronger ${next.lower?"Lower":"Boost"} ${trait.name} effect.`);
      return;
    }
    const before = new Set(actor.effects.map(effect=>effect.id));
    // Apply through Better Effects so its timing, source, conditions, and recovery hooks run.
    const template = {type:`${EFFECTS}.effect`,effects:[data],uuid:null};
    await game.modules.get(EFFECTS).api.applyEffectTemplate(template,actor);
    const created = actor.effects.find(effect=>!before.has(effect.id) && sameTrait(effect,trait));
    if (!created) throw new Error("The trait effect could not be applied.");
    try {
      if (previous.length) await actor.deleteEmbeddedDocuments("ActiveEffect",previous.map(effect=>effect.id));
    } catch (error) { await created.delete(); throw error; }
    ui.notifications.info(`${data.name} applied to ${actor.name}.`);
    return created;
  });
}

export async function boostLowerTrait(caster=selectedActor()) {
  requireOwner(caster);
  const tokens = [...game.user.targets];
  const candidates = tokens.length ? tokens.map(token=>({actor:token.actor,token:token.document})).filter(entry=>entry.actor?.system.attributes)
    : [{actor:caster,token:caster.token}];
  if (!candidates.length) throw new Error("Target a character or NPC.");
  const options = actor=>traits(actor).map(trait=>`<option value="${escape(reference(trait))}">${escape(trait.name)}</option>`).join("");
  const answer = await dialog().prompt({window:{title:"Boost / Lower Trait"},content:
    `<div class="form-group"><label>Target</label><select name="target">${candidates.map((entry,i)=>`<option value="${i}">${escape(entry.token?.name??entry.actor.name)}</option>`).join("")}</select></div>
    <div class="form-group"><label>Trait</label><select name="trait">${options(candidates[0].actor)}</select></div>
    <div class="form-group"><label>Effect</label><select name="mode"><option value="boost">Boost</option><option value="lower">Lower</option></select></div>
    <label><input type="checkbox" name="raised"> Raised</label>
    <label hidden><input type="checkbox" name="strong" disabled> Strong Lower</label>
    <div class="form-group" data-trait-duration hidden><label>Duration</label><input type="number" name="duration" value="5" min="1" step="1"></div>`,
    render:(_event,app)=>{
      const form = app.element.querySelector("form");
      form.elements.target.addEventListener("change",()=>{
        form.elements.trait.innerHTML=options(candidates[Number(form.elements.target.value)].actor);
      });
      form.elements.mode.addEventListener("change",()=>{
        const lower = form.elements.mode.value==="lower";
        form.elements.strong.disabled=!lower;
        form.elements.strong.closest("label").hidden=!lower;
        form.querySelector("[data-trait-duration]").hidden=!lower;
        if (!lower) form.elements.strong.checked=false;
      });
    },
    ok:{label:"Apply effect",callback:(_event,button)=>new FormData(button.form)},rejectClose:false});
  if (!answer) return;
  const entry = candidates[Number(answer.get("target"))];
  if (!entry) throw new Error("Choose a target.");
  const optionsData = {trait:answer.get("trait"),lower:answer.get("mode")==="lower",raised:answer.has("raised"),
    strong:answer.has("strong"),duration:Number(answer.get("duration")??5)};
  if (entry.actor.isOwner) return applyTraitEffect(entry.actor,optionsData);
  const gm = game.users.activeGM;
  if (!gm) throw new Error("A connected GM is needed to apply this effect to that target.");
  return gm.query(query,{casterUuid:caster.uuid,tokenUuid:entry.token?.uuid,options:optionsData});
}

export function installTraitEffects() {
  const prototype = CONFIG.ActiveEffect.documentClass.prototype;
  const shouldApply = prototype.shouldApplyChange;
  prototype.shouldApplyChange = function(change,options){
    const data = flag(this,"traitEffect");
    if (data && this.actor) {
      const matches = [...this.actor.allApplicableEffects()].filter(effect=>{
        const other = flag(effect,"traitEffect");
        return effect.active && other?.type===data.type && other.key===data.key && other.lower===data.lower;
      }).sort((a,b)=>strength(b)-strength(a) ||
        Number(flag(b,"traitEffect").strong)-Number(flag(a,"traitEffect").strong) || a.id.localeCompare(b.id));
      if (matches[0]?.id!==this.id) return false;
    }
    return shouldApply.call(this,change,options);
  };
  CONFIG.queries[query] = async ({casterUuid,tokenUuid,options},{user})=>{
    const {token} = await macroTarget(casterUuid,tokenUuid,user);
    await applyTraitEffect(token.actor,options);
    return true;
  };
  Hooks.on("preCreateItem",item=>{
    if (flag(item,"key")==="boost-lower-trait") item.updateSource({"system.actions.additional.traitEffect":traitAction});
  });
  Hooks.once("ready",async()=>{
    if (!game.user.isActiveGM) return;
    const actors = new Map(game.actors.map(actor=>[actor.uuid,actor]));
    for (const scene of game.scenes) for (const token of scene.tokens) if (!token.actorLink && token.actor) actors.set(token.actor.uuid,token.actor);
    for (const item of [...game.items,...[...actors.values()].flatMap(actor=>[...actor.items])]) {
      if (flag(item,"key")==="boost-lower-trait" && item.system.actions.additional.traitEffect?.uuid!==TRAIT_MACRO_UUID) {
        await item.update({"system.actions.additional.traitEffect":traitAction});
      }
    }
  });
}
