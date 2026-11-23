import {ID, EFFECTS, dialog, escape, flag, queue, report, requireOwner, skill} from "./shared.mjs";

const run = queue();
const activeEffect = (actor,item) => actor.effects.find(e=>flag(e,"signatureItem")===item.id);

export async function signatureAction(item, command = "use") {
  const actor = requireOwner(item?.actor);
  const move = flag(item,"signatureAction");
  if (!move || item.type!=="action") throw new Error("Open the signature Action on its actor sheet.");
  return run(item.uuid, async () => {
    const current = activeEffect(actor,item);
    if (command==="finish") {
      if (current) await current.delete();
      return;
    }
    if (command==="reset") {
      const reset = await dialog().confirm({window:{title:`Reset ${item.name}`},
        content:`<p>Restore this use for the next ${escape(move.period)}? Any active bonus from this Action will end.</p>`});
      if (!reset) return;
      if (current) await current.delete();
      await item.unsetFlag(ID,"signatureUsed");
      return;
    }
    if (flag(item,"signatureUsed") || current) throw new Error(`${item.name} is spent. Use Reset use at the start of the next ${move.period}.`);
    const states = game.modules.get(EFFECTS).api.getFlags(actor);
    if (move.stance && !states.includes(`avatar-${move.stance}`)) {
      throw new Error(`${item.name} requires ${move.stance[0].toUpperCase()+move.stance.slice(1)} Stance.`);
    }
    if (move.recovery && !["shaken","stunned"].some(status=>actor.statuses.has(status))) {
      throw new Error(`${actor.name} must be Shaken or Stunned to use ${item.name}.`);
    }
    let target;
    if (move.targetStatus) {
      [target] = game.user.targets;
      if (game.user.targets.size!==1 || target.actor?.uuid===actor.uuid || !target.actor?.statuses.has(move.targetStatus)) {
        throw new Error(`Target one opponent who is ${move.targetStatus} before using ${item.name}.`);
      }
    }
    const trait = move.skill ? skill(actor,move.skill) : null;
    if (move.skill && !trait) throw new Error(`${actor.name} needs the ${move.skill} skill to use ${item.name}.`);
    const template = item.effects.contents[0];
    if (!template) throw new Error(`${item.name} is missing its effect template.`);
    const ready = await dialog().confirm({window:{title:item.name},content:item.system.description,
      yes:{label:trait?`Roll ${trait.name}`:"Apply effect"},no:{label:"Cancel"}});
    if (!ready) return;

    const combat = game.combat;
    const combatant = combat?.started && (actor.token
      ? combat.combatants.find(c=>c.token?.uuid===actor.token.uuid)
      : combat.combatants.find(c=>c.actor?.uuid===actor.uuid));
    const source = template.toObject();
    for (const key of ["_id","_stats","start"]) delete source[key];
    source.origin = item.uuid;
    source.disabled = false;
    source.showIcon = trait ? 0 : 2;
    source.flags[ID] = {signatureItem:item.id};
    if (target) {
      const tag = `signature-target-${item.id.toLowerCase()}`;
      source.flags[ID].signatureTarget = {uuid:target.document.uuid,tag};
      for (const entry of source.flags[EFFECTS].conditions.filter(Boolean)) {
        entry.predicate.children.push({op:"flag",source:"target",flag:tag});
      }
    }
    if (!trait && combatant) {
      source.start = {combat:combat.id,round:combat.round,turn:combat.turn,time:game.time.worldTime};
      source.duration = {units:"rounds",value:1,expiry:"turnStart"};
    }
    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect",[source]);
    try {
      if (trait && !await actor.rollSkill(trait.id,{flavour:item.name,item,
        effectFlags:move.support?["signature-move","support"]:["signature-move"]})) return;
      await item.setFlag(ID,"signatureUsed",true);
      if (!trait) ui.notifications.info(`${item.name} is active on ${actor.name}. End the effect after the listed use.`);
    } catch (error) {
      if (actor.effects.has(effect.id)) await effect.delete();
      throw error;
    } finally {
      if (trait && actor.effects.has(effect.id)) await effect.delete();
    }
  });
}

export async function migrateSignatureActions(actors) {
  const pending = [...actors].filter(actor=>flag(actor,"roster") && !flag(actor,"signatureActionsMigrated"));
  if (!pending.length) return;
  const sources = await game.packs.get(`${ID}.pro-benders`).getDocuments();
  const byName = new Map(sources.map(actor=>[actor.name,actor]));
  const byId = new Map(sources.map(actor=>[actor.id,actor]));
  for (const actor of pending) {
    const sourceId = actor._stats?.compendiumSource?.split(".").at(-1);
    const source = byId.get(sourceId) ?? byName.get(actor.name);
    const action = source?.itemTypes.action?.find(item=>flag(item,"signatureAction"));
    if (!action) continue;
    const legacy = actor.effects.find(effect=>effect.id===action.effects.contents[0]?.id ||
      effect.name===action.name && /<p>Once per (?:bout|scene)\. (?:Enable|After|At) /.test(effect.description));
    if (!actor.itemTypes.action?.some(item=>item.name===action.name || flag(item,"signatureAction"))) {
      const requiredSkill = flag(action,"signatureAction").skill;
      const sourceSkill = requiredSkill && skill(source,requiredSkill);
      const items = [action];
      if (sourceSkill && !skill(actor,requiredSkill)) items.push(sourceSkill);
      await actor.createEmbeddedDocuments("Item",items.map(item=>{
        const data = item.toObject();
        delete data._id;
        return data;
      }));
    }
    if (legacy) {
      const note = actor._source.system.details.notes;
      const notes = document.createElement("div");
      notes.innerHTML = note;
      const old = [...notes.children].find(p=>p.textContent.startsWith(`${action.name}. Once per ${flag(action,"signatureAction").period}.`));
      if (old) {
        old.remove();
        await actor.update({"system.details.notes":notes.innerHTML});
      }
      await legacy.delete();
    }
    await actor.setFlag(ID,"signatureActionsMigrated",true);
  }
}

export function installSignatureActions() {
  Hooks.on("swadeBetterEffectsTargetFlags", (ctx,token,_actor,_item,tags) => {
    if (!token?.uuid || !ctx.actorUuid) return;
    const actor = foundry.utils.fromUuidSync(ctx.actorUuid);
    for (const effect of actor?.effects ?? []) {
      const target = flag(effect,"signatureTarget");
      if (effect.active && target?.uuid===token.uuid) tags.push(target.tag);
    }
  });
  Hooks.on("renderCharacterSheet", (app,root) => {
    if (!app.actor?.isOwner || app.actor.pack && !app.isEditable) return;
    for (const row of root.querySelectorAll('section[data-tab="actions"] li.action')) {
      const item = app.actor.items.get(row.dataset.itemId);
      if (!flag(item,"signatureAction")) continue;
      const controls = row.querySelector("summary .item-controls");
      if (!controls || controls.querySelector(".avatar-signature-action")) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "avatar-signature-action";
      const spent = flag(item,"signatureUsed");
      button.textContent = spent ? "Spent" : "Use";
      button.setAttribute("aria-label",spent?`Open ${item.name} controls in chat`:`Use ${item.name}`);
      button.addEventListener("click", async event=>{
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        try {
          if (spent) return await item.show();
          const action = item.system.actions.additional.signatureUse;
          const macro = await fromUuid(action.uuid);
          if (!macro) throw new Error("The signature Action macro is missing from Avatar Macros.");
          await macro.execute({actor:app.actor,item});
        } catch (error) { report(error); }
        finally { button.disabled = false; }
      });
      controls.prepend(button);
    }
  });
  Hooks.on("deleteCombat", (combat,_options,userId) => {
    if (userId!==game.user.id) return;
    const actors = new Map(combat.combatants.map(c=>[c.actor?.uuid,c.actor]));
    for (const actor of actors.values()) {
      if (!actor?.isOwner) continue;
      const ids = actor.effects.filter(e=>flag(e,"signatureItem") && e._source.start?.combat===combat.id).map(e=>e.id);
      if (ids.length) void actor.deleteEmbeddedDocuments("ActiveEffect",ids).catch(report);
    }
  });
}
