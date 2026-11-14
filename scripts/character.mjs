import {ID, POWERS, EFFECTS, background, dialog, enabled, escape, effects, flag, hasEdge, packDoc, queue, report, requireOwner, selectedActor, skill, slug} from "./shared.mjs";
import {queueActor as queueCasting} from "../../swade-better-powers/scripts/spellcasting.mjs";
import {elementalPowerName, legacyWeaponName, legacyWeaponUpdate, weaponKit} from "./bending-data.mjs";

const serial = queue();
const settingStance = new Set();
const rankNames = ["novice","seasoned","veteran","heroic","legendary"];
const starter = ["knacks","basic-elemental-manipulation"];
const ownedSource = doc => {
  const source = doc.toObject();
  for (const field of ["_id","folder","sort","ownership"]) delete source[field];
  source._stats = {compendiumSource:doc.uuid};
  return source;
};
const ranks = actor => Math.max(0, rankNames.indexOf(slug(game.i18n.localize(actor.system.advances?.rank ?? ""))));
export const benderEntry = actor => {
  const bg = background(actor);
  if (!bg) return null;
  const entries = Object.values(actor.flags?.[POWERS]?.spellcastingEntries ?? {});
  return entries.find(entry => entry.sources?.includes(bg.id) && entry.arcane !== "general")
    ?? entries.find(entry => entry.arcane === bg.name);
};
export const castingArcane = actor => benderEntry(actor)?.arcane ?? background(actor)?.name ?? "Bending";

async function ensureEntry(actor, bg, restore) {
  return queueCasting(actor, async () => {
    const values = actor.flags?.[POWERS] ?? {};
    const entry = benderEntry(actor);
    if (entry && (!restore || entry.trait === "Bending")) return entry;
    const removed = values.removedSpellcastingSources ?? [];
    if (!restore && removed.includes(bg.id)) return;
    const id = entry?.id ?? foundry.utils.randomID();
    const arcane = entry?.arcane ?? bg.name;
    const update = {
      [`flags.${POWERS}.spellcastingEntries.${id}`]: {id,name:entry?.name ?? arcane,arcane,trait:"Bending",attribute:"spirit",
        noPowerPoints:entry?.noPowerPoints ?? true,sources:[...new Set([...(entry?.sources ?? []),bg.id])]}
    };
    if (!actor._source.system.powerPoints?.[arcane]) update[`system.powerPoints.${arcane}`] = {value:10,max:10};
    if (restore && removed.includes(bg.id)) update[`flags.${POWERS}.removedSpellcastingSources`] = removed.filter(id => id !== bg.id);
    await actor.update(update);
    return update[`flags.${POWERS}.spellcastingEntries.${id}`];
  });
}

const adjustOwned = (source, doc, actor) => {
  const element = flag(background(actor),"background");
  if (flag(doc,"technique") && element) source.system.arcane = castingArcane(actor);
  return source;
};
export async function applyEffect(actor, key, pack = "effects") {
  return game.modules.get(EFFECTS).api.applyEffectTemplate(await packDoc(pack,key),requireOwner(actor));
}

export function changeStance(actor, stance) {
  return serial(`stance:${requireOwner(actor).uuid}`, async () => {
    if (!background(actor)) throw new Error("This actor needs a Bending Background.");
    if (!["balanced","defensive","offensive","none"].includes(stance)) throw new Error("Choose a Bending Stance.");
    if (stance === "none") {
      const previous = effects(actor,"stance");
      return previous.length ? actor.deleteEmbeddedDocuments("ActiveEffect",previous.map(e=>e.id)) : [];
    }
    const previous = effects(actor,"stance");
    settingStance.add(actor.uuid);
    try {
      const kept = previous.find(e=>flag(e,"stance") === stance && e.active) ?? (await applyEffect(actor,stance,"stances"))[0];
      const surplus = effects(actor,"stance").filter(e=>e.id !== kept.id);
      if (surplus.length) await actor.deleteEmbeddedDocuments("ActiveEffect",surplus.map(e=>e.id));
      return [kept];
    } finally { settingStance.delete(actor.uuid); }
  });
}
export async function chooseStance(actor = selectedActor()) {
  requireOwner(actor);
  const state = effects(actor,"stance").find(e=>e.active)?.name ?? "None";
  const stance = await dialog().wait({classes:["avatar-stance-dialog"],position:{width:340},window:{title:"Bending Stance"},content:`<p>Current: <strong>${escape(state)}</strong>. Changing stance normally costs one action. Apply Fluid Stance or any reaction limits as appropriate.</p>`,
    buttons:[{action:"defensive",label:"Defensive"},{action:"balanced",label:"Balanced"},{action:"offensive",label:"Offensive"},{action:"none",label:"Remove"}],rejectClose:false});
  if (stance) await changeStance(actor,stance);
}

async function grantKit(actor, {restore = false} = {}) {
  requireOwner(actor);
  const bg = background(actor);
  if (!bg) return;
  return serial(`setup:${actor.uuid}`, async () => {
    const done = !!flag(bg,"initialized");
    if (done && !restore) return;
    const element = flag(bg,"background");
    const entry = await ensureEntry(actor,bg,restore);
    const existing = new Set(actor.items.map(i=>flag(i,"key")));
    const needs = [
      ...(!skill(actor,"Bending")?[["bending-kit","bending"]]:[]),
      ...starter.filter(key=>!existing.has(key)).map(key=>["techniques",key]),
      ...weaponKit(element).filter(key=>!existing.has(key)).map(key=>["bending-kit",key]),
      ...(element==="water"&&!hasEdge(actor,"fluid-stance")?[["edges","fluid-stance"]]:[])
    ];
    const docs = await Promise.all(needs.map(([pack,key])=>packDoc(pack,key)));
    if (docs.length) await actor.createEmbeddedDocuments("Item",docs.map(doc=>adjustOwned(ownedSource(doc),doc,actor)));
    const reassign = (actor.itemTypes.power ?? []).filter(p=>flag(p,"technique") && (p.system.arcane==="Bending"||starter.includes(flag(p,"key"))) && entry && p.system.arcane!==entry.arcane);
    if (reassign.length) await actor.updateEmbeddedDocuments("Item",reassign.map(p=>({_id:p.id,"system.arcane":entry.arcane})));
    for (const key of ["backlash","martial"]) {
      const present = effects(actor,key);
      if (!present.length) await applyEffect(actor,key);
      else if (restore && !enabled(actor,key) && present[0].disabled) await present[0].update({disabled:false});
    }
    if (!effects(actor,"stance").length) await changeStance(actor,"balanced");
    if (!done) {
      await bg.setFlag(ID,"initialized",true);
      ui.notifications.info(`${actor.name}: ${bg.name} is ready. Use Avatar Setup to choose the free Techniques${element==="water"?"":" and stance Edge"}.`);
    }
  });
}
async function nationSkills(nation) {
  const actor = nation.actor;
  const missing = (flag(nation,"skills") ?? []).filter(name => !skill(actor,name));
  const docs = await Promise.all(missing.map(name => packDoc("bending-kit",slug(name))));
  if (docs.length) await actor.createEmbeddedDocuments("Item",docs.map(ownedSource));
}
const matchesRank = (actor, item) => {
  const rank = item.system.requirements?.find(r=>r.type==="rank")?.value ?? 0;
  return ranks(actor) >= Number(rank);
};
const collect = async (pack, fields) => {
  const p = game.packs.get(`${ID}.${pack}`);
  return (await p.getIndex({fields:fields.map(f=>`flags.${ID}.${f}`)})).filter(row=>flag(row,"key"));
};
function select(name, rows, placeholder, count = 1) {
  const option = (v,l) => `<option value="${escape(v)}">${escape(l)}</option>`;
  return Array.from({length:count},(_,i)=>`<div class="form-group"><label>${escape(placeholder)}${count>1?` ${i+1}`:""}</label>
  <select name="${name}">${option("","Choose…")}${rows.map(row=>option(row._id ?? row.uuid,row.name)).join("")}</select></div>`).join("");
}
async function chooseGrants(actor) {
  const bg = background(actor);
  const nation = actor.itemTypes.ancestry?.find(i=>flag(i,"nation"));
  const element = flag(bg,"background");
  const b = structuredClone(flag(bg,"choices") ?? {});
  const n = structuredClone(flag(nation,"choicesMade") ?? {});
  const num = Math.max(0,3-(b.techniques?.length ?? 0));
  let techniques = [], stanceEdges = [], noviceEdges = [], swamp = [];
  if (bg && num) {
    const entries = await collect("techniques",["key","element"]);
    const ids = new Set(actor.itemTypes.power?.map(i=>flag(i,"key")));
    techniques = entries.filter(i=>["universal",element].includes(flag(i,"element")) && !ids.has(flag(i,"key")));
  }
  if (bg && element!=="water" && !b.stance) {
    const entries = await collect("edges",["key","stance"]);
    const candidates = entries.filter(i=>[element==="earth"?"Defensive":"Offensive","Hybrid"].includes(flag(i,"stance")) && !hasEdge(actor,flag(i,"key")));
    stanceEdges = (await Promise.all(candidates.map(i=>game.packs.get(`${ID}.edges`).getDocument(i._id)))).filter(i=>matchesRank(actor,i));
  }
  if (flag(nation,"nation")==="swamp-people"&&!n.swamp) swamp=flag(nation,"choices");
  if (flag(nation,"nation")==="republican"&&!n.novice) {
    const custom = await game.packs.get(ID+".edges").getDocuments();
    const official = game.packs.get("swade-core-rules.swade-edges") ?? game.packs.get("swade.edges");
    const restricted = new Set(["berserk","arcane-resistance","healer","champion"]);
    const all = [...custom,...await official.getDocuments()];
    noviceEdges = all.filter(edge=>{
      const req = edge.system.requirements ?? [];
      const key = flag(edge,"key");
      if (!key && (restricted.has(edge.system.swid)||edge.system.isArcaneBackground||/^(?:power|powers)$/i.test(edge.system.category))) return false;
      if (key && (flag(edge,"element") && flag(edge,"element")!==element || edge.system.category==="SBT")) return false;
      if (actor.itemTypes.edge?.some(i=>i.system.swid===edge.system.swid)) return false;
      if (req.some(r=>r.type==="rank" && Number(r.value)!==0)) return false;
      return req.every(r=>r.type==="rank" || r.type==="wildCard" && !!r.value===actor.isWildcard
        || r.type==="attribute" && (actor.system.attributes[r.selector]?.die?.sides??0)>=Number(r.value)
        || r.type==="skill" && (skill(actor,r.selector)?.system.die.sides??0)>=Number(r.value)
        || ["edge","hindrance","ancestry","power"].includes(r.type) && actor.itemTypes[r.type]?.some(i=>i.system.swid===r.selector));
    }).map(i=>({uuid:i.uuid,name:i.name})).sort((a,b)=>a.name.localeCompare(b.name));
  }
  if (!techniques.length&&!stanceEdges.length&&!swamp.length&&!noviceEdges.length) return;
  const result = await dialog().prompt({window:{title:`Avatar Setup · ${actor.name}`},content:
    (techniques.length ? `<p>Choose up to ${num} remaining background Techniques, subject to Rank and any special training.</p>`+select("technique",techniques,"Technique",num):"") +
    (stanceEdges.length ? select("stance",stanceEdges,"Free stance Edge"):"") +
    (swamp.length ? select("swamp",swamp,"Swamp People Hindrance"):"") +
    (noviceEdges.length ? `<p>For Talented, choose an eligible Novice Edge. For requirements needing table judgment, add the chosen Edge from its pack.</p>`+select("novice",noviceEdges,"Talented Edge"):""),
    ok:{label:"Take selected items",callback:(_e,button)=>new FormData(button.form)},rejectClose:false});
  if (!result) return;
  const create = async (doc, mutation = {}) => {
    const source = adjustOwned(ownedSource(doc),doc,actor);
    await actor.createEmbeddedDocuments("Item",[foundry.utils.mergeObject(source,mutation)]);
  };
  if (bg) {
    const selected = [...new Set(result.getAll("technique"))].filter(id=>techniques.some(i=>i._id===id));
    for (const id of selected) {
      const doc = await game.packs.get(`${ID}.techniques`).getDocument(id);
      if ((rankNames.indexOf(slug(doc.system.rank)) > ranks(actor)) && actor.type==="character") {
        ui.notifications.warn(`${doc.name} requires ${doc.system.rank}.`);
        continue;
      }
      if (["paralysis","puppet","banish"].includes(flag(doc,"key")) && !hasEdge(actor,flag(doc,"key")==="banish"?"spiritbending":"bloodbending")) {
        ui.notifications.warn(`${doc.name} requires its specialised bending Edge.`);
        continue;
      }
      if (!actor.items.some(i=>flag(i,"key")===flag(doc,"key"))) {
        await create(doc);
        b.techniques = [...(b.techniques??[]),id];
      }
    }
    const stance = stanceEdges.find(i=>i.id===result.get("stance"));
    if (stance) { await create(stance); b.stance = stance.id; }
    await bg.setFlag(ID,"choices",b);
  }
  if (nation) {
    const hindrance = swamp.find(i=>i.uuid===result.get("swamp"));
    if (hindrance) {
      const doc = await fromUuid(hindrance.uuid);
      if (!actor.itemTypes.hindrance?.some(i=>slug(i.name)===slug(doc.name))) await create(doc,hindrance.mutation);
      n.swamp = hindrance.uuid;
    }
    const novice = noviceEdges.find(i=>i.uuid===result.get("novice"));
    if (novice) { await create(await fromUuid(novice.uuid)); n.novice=novice.uuid; }
    await nation.setFlag(ID,"choicesMade",n);
  }
}
export async function setup(actor = selectedActor()) {
  requireOwner(actor);
  const choice = await dialog().wait({window:{title:`Avatar Setup · ${actor.name}`},
    content:"<p>Choose the free items from your Nation or Bending Background, or explicitly restore missing starter Techniques, weapons and rule effects.</p>",
    buttons:[{action:"choose",label:"Choose free items"},{action:"restore",label:"Restore bending kit"}],rejectClose:false});
  if (choice==="restore") return grantKit(actor,{restore:true});
  if (choice==="choose") return chooseGrants(actor);
}

export function installCharacter() {
  // SWADE generates ordinary item macros when a stance template is dropped on
  // the hotbar. Route those shortcuts to the stance effect on the chosen actor.
  const stanceNames = new Map([
    ["Defensive Stance", "defensive"],
    ["Balanced Stance", "balanced"],
    ["Offensive Stance", "offensive"]
  ]);
  const rollItemMacro = game.swade.rollItemMacro;
  const legacyAttacks = new Map(["hurl","assault"].flatMap(kind=>[false,true].map(off=>[legacyWeaponName(kind,off),{kind,off}])));
  game.swade.rollItemMacro = function(identifier, ...args) {
    const stance = stanceNames.get(identifier);
    if (stance) return changeStance(selectedActor(), stance).catch(report);
    const speaker = ChatMessage.getSpeaker();
    const actor = (speaker.token && game.actors.tokens[speaker.token]) || game.actors.get(speaker.actor);
    const attack = legacyAttacks.get(identifier);
    if (attack) {
      const weapon = actor?.itemTypes.weapon?.find(item=>flag(item,"weapon")===attack.kind && !!flag(item,"off")===attack.off);
      if (weapon) return rollItemMacro.call(this,weapon.name,...args);
    }
    const element = flag(background(actor),"background");
    if (element && !actor.items.getName(identifier)) {
      const name = elementalPowerName(identifier,element);
      if (actor.itemTypes.power?.some(item=>item.name===name)) return rollItemMacro.call(this,name,...args);
    }
    return rollItemMacro.call(this,identifier,...args);
  };

  Hooks.on("createItem", (item,_options,userId) => {
    if (userId!==game.user.id || !item.actor?.isOwner) return;
    if (flag(item,"background")) void grantKit(item.actor).catch(report);
    if (flag(item,"nation")) void nationSkills(item).catch(report);
  });
  Hooks.on("createActor", (actor,_options,userId) => {
    if (userId!==game.user.id || !actor.isOwner) return;
    if (background(actor)) void grantKit(actor).catch(report);
    const nation = actor.itemTypes.ancestry?.find(i=>flag(i,"nation"));
    if (nation) void nationSkills(nation).catch(report);
  });
  Hooks.on("preCreateItem", (item,_data,_options,userId) => {
    if (userId!==game.user.id || !item.actor) return;
    if (flag(item,"background") && background(item.actor)) {
      ui.notifications.warn("A character can have only one Avatar Bending Background.");
      return false;
    }
    const element = flag(background(item.actor),"background");
    const weapon = legacyWeaponUpdate(item,element);
    if (weapon) item.updateSource(weapon);
    if (item.type!=="power" || !element) return;
    const name = elementalPowerName(item.name,element);
    if (name!==item.name) item.updateSource({name});
    if (flag(item,"technique")) item.updateSource({
      "system.arcane":castingArcane(item.actor),"system.actions.trait":flag(item,"key")==="knacks" ? "" : "Bending"
    });
  });
  Hooks.on("swadeBetterEffectsAutomaticFlags", (doc,tags) => {
    if (flag(doc,"weapon") || flag(doc,"technique")) {
      const element = (flag(doc,"weapon") && flag(doc,"element")) || flag(background(doc.actor),"background");
      if (element) tags.push(element);
    }
  });
  Hooks.on("createActiveEffect", (e,_o,userId) => {
    if (userId!==game.user.id || e.parent?.documentName!=="Actor" || !flag(e,"stance") || !e.active) return;
    if (settingStance.has(e.parent.uuid)) return;
    void serial(`stance:${e.parent.uuid}`,async()=>{
      if (!e.parent.effects.has(e.id)) return;
      const old = effects(e.parent,"stance").filter(x=>x.id!==e.id);
      if (old.length) await e.parent.deleteEmbeddedDocuments("ActiveEffect",old.map(x=>x.id));
    }).catch(report);
  });
  Hooks.on("combatStart", (combat,_data) => {
    if (!game.user.isGM || (game.users.activeGM && game.user.id!==game.users.activeGM.id) || !game.settings.get(ID,"resetStance")) return;
    const actors = new Map(combat.combatants.map(c=>[c.actor?.uuid,c.actor]));
    for (const actor of actors.values()) if (actor?.isOwner && background(actor) && effects(actor,"stance").some(e=>e.active)) void changeStance(actor,"balanced").catch(report);
  });
  const armourCheck = Object.getOwnPropertyDescriptor(CONFIG.Actor.documentClass.prototype,"isUnarmored");
  if (armourCheck?.get) Object.defineProperty(CONFIG.Actor.documentClass.prototype,"isUnarmored",{
    ...armourCheck,get() {return !enabled(this,"wornArmour") && armourCheck.get.call(this);}
  });
}
export function initializeCharacters() {
  for (const actor of game.actors) {
    if (!actor.isOwner || (game.users.activeGM ? game.user.id!==game.users.activeGM.id : !game.user.isGM)) continue;
    if (background(actor) && !flag(background(actor),"initialized")) void grantKit(actor).catch(report);
  }
}
