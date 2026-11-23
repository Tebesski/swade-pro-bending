import {ID, EFFECTS, background, flag} from "./shared.mjs";
import {legacyWeaponUpdate, naturalWeaponUpdate, weaponEffectUpdate} from "./bending-data.mjs";
import {migrateSignatureActions} from "./signatures.mjs";
import {migrateRosterText} from "./roster.mjs";

const revision = 2;
const oldIcons = {
  edge:"systems/swade/assets/icons/edge.svg", power:"systems/swade/assets/icons/power.svg",
  ancestry:"systems/swade/assets/icons/ability.svg", skill:"systems/swade/assets/icons/skill.svg",
  weapon:"systems/swade/assets/icons/weapon.svg", macro:"icons/svg/d20-grey.svg"
};
const oldAvatarIcons = new Set(["icons/svg/aura.svg","icons/svg/mountain.svg","icons/svg/fire.svg",
  "icons/svg/waterfall.svg","icons/svg/shield.svg","icons/svg/sword.svg","icons/svg/upgrade.svg"]);

function cleanTechniqueDescription(description) {
  const content = document.createElement("div");
  content.innerHTML = description ?? "";
  let changed = false;
  for (const summary of content.querySelectorAll(".sbs-power-modifier-summary")) {
    summary.remove();
    changed = true;
  }
  for (const paragraph of [...content.children]) {
    if (paragraph.matches("p") && /^(?:Epic )?Modifiers?:$/i.test(paragraph.textContent.trim())
      && paragraph.nextElementSibling?.matches("ul,ol")) {
      paragraph.nextElementSibling.remove();
      paragraph.remove();
      changed = true;
    } else if (paragraph.matches("p") && /\{Use a Knack\} posts your knack to chat/.test(paragraph.textContent)) {
      paragraph.remove();
      changed = true;
    }
  }
  return changed ? content.innerHTML : description;
}

function hideKnackRollControls(app, root) {
  const actor = app.actor ?? app.document;
  if (actor?.documentName !== "Actor") return;
  for (const row of root.querySelectorAll("[data-item-id]")) {
    const item = actor.items.get(row.dataset.itemId);
    if (flag(item,"technique") && flag(item,"key") === "knacks") {
      row.querySelectorAll(".sbs-power-card, [data-action='formula'], [data-action='tableAction']").forEach(node => node.remove());
    }
  }
}

function cleanChatCard(message,root) {
  const card = root.querySelector(".swade.item-card[data-item-uuid]");
  if (!card) return;
  let item;
  try { item = foundry.utils.fromUuidSync(card.dataset.itemUuid); } catch { return; }
  if (flag(item,"technique") && flag(item,"key")==="knacks") card.querySelectorAll(".trait-rolls, .macro-actions, [data-action='tableAction']").forEach(node=>node.remove());
}

export function installPresentation() {
  // Keep imported technique rules text separate from the modifier definitions rendered by Better Powers.
  Hooks.on("preCreateItem", item => {
    if (!flag(item,"technique")) return;
    const description = item._source.system.description;
    const clean = cleanTechniqueDescription(description);
    if (clean !== description) item.updateSource({"system.description":clean});
  });
  Hooks.on("preUpdateItem", (item, changed) => {
    if (!flag(item,"technique")) return;
    const description = changed["system.description"] ?? changed.system?.description;
    if (description !== undefined) {
      changed["system.description"] = cleanTechniqueDescription(description);
      if (changed.system) delete changed.system.description;
    }
    if (flag(item,"key")==="knacks" && (changed["system.actions.trait"] || changed.system?.actions?.trait)) {
      changed["system.actions.trait"] = "";
      if (changed.system?.actions) delete changed.system.actions.trait;
    }
  });
  Hooks.on("renderApplicationV2", hideKnackRollControls);
  Hooks.on("renderChatMessageHTML",cleanChatCard);
}

export async function migrateAvatarContent() {
  if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
  const actors = new Map(game.actors.map(actor=>[actor.uuid,actor]));
  for (const scene of game.scenes) for (const token of scene.tokens) {
    if (token.actorLink || !token.actor) continue;
    actors.set(token.actor.uuid,token.actor);
  }
  await migrateSignatureActions(actors.values());
  await migrateRosterText(actors.values());
  for (const item of game.items) {
    const update = naturalWeaponUpdate(item);
    if (update) await item.update(update);
  }
  for (const actor of actors.values()) {
    const natural = [...actor.items].flatMap(item=>{
      const update = naturalWeaponUpdate(item);
      return update ? [{_id:item.id,...update}] : [];
    });
    if (natural.length) await actor.updateEmbeddedDocuments("Item",natural);
    const element = flag(background(actor),"background");
    const legacy = (actor.itemTypes.weapon ?? []).flatMap(item=>{
      const update = legacyWeaponUpdate(item,element);
      return update ? [{item,update}] : [];
    });
    if (!legacy.length) continue;
    const catalog = await game.packs.get(`${ID}.bending-kit`).getDocuments();
    const updates = legacy.map(({item,update})=>{
      const source = catalog.find(doc=>flag(doc,"key")===update[`flags.${ID}.key`]);
      if (source && (oldIcons.weapon===item.img || /^icons\/magic\/earth\/(?:projectile-boulder-(?:yellow|dust)|strike-fist-stone(?:-gray)?)\.webp$/.test(item.img))) update.img = source.img;
      return {_id:item.id,...update};
    });
    await actor.updateEmbeddedDocuments("Item",updates);
  }
  const weaponEdges = new Set(["leg-work","deadly-hurl","fatal-hurl","deadly-assault"]);
  for (const item of [...game.items,...[...actors.values()].flatMap(actor=>[...actor.items])]) {
    if (!weaponEdges.has(flag(item,"key"))) continue;
    for (const effect of item.effects) {
      const update = weaponEffectUpdate(effect);
      if (update) await effect.update(update);
    }
  }
  const needsUpdate = doc => flag(doc,"key") && (flag(doc,"contentRevision") ?? 0) < revision;
  const oldItems = [...game.items, ...[...actors.values()].flatMap(actor=>[...actor.items])].filter(needsUpdate);
  const oldEffects = [...actors.values()].flatMap(actor=>actor.effects.filter(effect=>
    flag(effect,"contentRevision")!==revision && (effect.flags[EFFECTS]?.templateUuid?.startsWith(`Compendium.${ID}.`) || flag(effect,"stance"))));
  const oldMacros = game.macros.filter(needsUpdate);
  if (!oldItems.length && !oldEffects.length && !oldMacros.length) return;
  const catalog = new Map();
  const templates = new Map();
  for (const pack of game.packs.filter(pack=>pack.metadata.packageName===ID && ["Item","Macro"].includes(pack.documentName))) {
    for (const doc of await pack.getDocuments()) {
      const key = flag(doc,"key");
      catalog.set(`${doc.type}:${key}`,doc);
      if (doc.type===`${EFFECTS}.effect`) templates.set(doc.uuid,doc);
    }
  }
  for (const item of oldItems) {
    const source = catalog.get(`${item.type}:${flag(item,"key")}`);
    if (!source) continue;
    const update = {[`flags.${ID}.contentRevision`]:revision};
    if (item.img===oldIcons[item.type] || oldAvatarIcons.has(item.img)) update.img=source.img;
    if (flag(item,"technique")) {
      update["system.description"] = cleanTechniqueDescription(item._source.system.description);
      if (flag(item,"key")==="knacks") {
        update["system.actions.trait"] = "";
        if (item.system.actions.additional.tableAction?.name==="Use Knack") update["system.actions.additional.tableAction"] = new foundry.data.operators.ForcedDeletion();
      }
    }
    for (const fresh of source.effects) {
      const current = item.effects.get(fresh.id) ?? item.effects.find(effect=>effect.name===fresh.name);
      if (current) await migrateEffect(current,fresh);
      else if (["earthbending","waterbending","close-combat-specialist","bending-mastery","shadow-training","elemental-onslaught","hampering-stance","turtle-shell"].includes(flag(item,"key"))) {
        await item.createEmbeddedDocuments("ActiveEffect",[fresh.toObject()]);
      }
    }
    await item.update(update);
  }
  for (const effect of oldEffects) {
    const source = templates.get(effect.flags[EFFECTS]?.templateUuid) ?? catalog.get(`${EFFECTS}.effect:${flag(effect,"stance")}`);
    if (source?.effects.size) await migrateEffect(effect,source.effects.contents[0]);
  }
  for (const macro of oldMacros) {
    const retired = {knack:"knack",backlash:"backlashLatest"}[flag(macro,"key")];
    if (retired && macro.command.includes("await api."+retired+"(")) {
      await macro.delete();
      continue;
    }
    const source = catalog.get(`script:${flag(macro,"key")}`);
    if (source && macro.img===oldIcons.macro) await macro.update({img:source.img,[`flags.${ID}.contentRevision`]:revision});
  }
}

async function migrateEffect(effect, source) {
  const update = {[`flags.${ID}.contentRevision`]:revision,
    [`flags.${ID}.backgroundEffect`]:flag(source,"backgroundEffect"), showIcon:source.showIcon};
  if (flag(source,"elementalReach")) update[`flags.${ID}.elementalReach`] = true;
  if (effect.img==="icons/svg/aura.svg") update.img=source.img;
  const next = source.toObject();
  if (flag(source,"unleash")) update.statuses = next.statuses;
  const old = effect.flags[EFFECTS];
  if (!old?.conditions?.some(condition=>condition?.predicate)) {
    // Earlier Avatar releases stored their conditions in the raw rule list.
    update["system.changes"] = next.system.changes;
    update[`flags.${EFFECTS}.conditions`] = next.flags[EFFECTS].conditions;
    update[`flags.${EFFECTS}.tags`] = [...new Set([...(old?.tags ?? []),...next.flags[EFFECTS].tags])];
    if (old?.rules) update[`flags.${EFFECTS}.rules`] = new foundry.data.operators.ForcedDeletion();
  }
  await effect.update(update);
}
