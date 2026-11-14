import {ID, flag} from "./shared.mjs";

export const rosterTextVersion = 1;

export async function migrateRosterText(actors) {
  const pending = [...actors].filter(actor=>flag(actor,"roster") && flag(actor,"rosterTextVersion")!==rosterTextVersion);
  if (!pending.length) return;
  const sources = await game.packs.get(`${ID}.pro-benders`).getDocuments();
  const byId = new Map(sources.map(actor=>[actor.id,actor]));
  const byName = new Map(sources.map(actor=>[actor.name,actor]));
  for (const actor of pending) {
    const sourceId = actor._stats?.compendiumSource?.split(".").at(-1);
    const source = byId.get(sourceId) ?? byName.get(actor.name);
    if (!flag(source,"rosterTextVersion")) continue;
    const {appearance,notes} = source.system.details;
    const update = {"system.details.appearance":appearance,"system.details.goals":"","system.details.notes":notes,
      [`flags.${ID}.rosterTextVersion`]:rosterTextVersion};
    const from = document.createElement("template"), to = document.createElement("template");
    from.innerHTML = source.system.details.biography.value;
    to.innerHTML = actor.system.details.biography.value;
    const existing = new Set([...to.content.children].map(paragraph=>paragraph.textContent.trim()));
    const added = [...from.content.children].filter(paragraph=>!existing.has(paragraph.textContent.trim()));
    // Campaign biographies may have changed. Migrate only material that lived in the old Notes.
    const oldNotes = document.createElement("template");
    oldNotes.innerHTML = actor.system.details.notes;
    const moved = added.filter(paragraph=>oldNotes.content.textContent.includes(paragraph.textContent.trim()) ||
      paragraph.textContent.startsWith("Reigning pro-bending champion") &&
      oldNotes.content.textContent.includes("Reigning individual pro-bending champion"));
    if (moved.length) update["system.details.biography.value"] = to.innerHTML + moved.map(paragraph=>paragraph.outerHTML).join("");
    await actor.update(update);
  }
}

export function useRosterFolders() {
  const pack = game.packs.get(`${ID}.pro-benders`);
  if (!pack) return;
  // The sidebar opens the apps already registered with the pack.
  pack.apps = pack.apps.filter(app=>!(app instanceof game.swade.apps.CompendiumTOC));
  if (!pack.apps.length) pack.apps.push(new pack.applicationClass({collection:pack}));
}

export function installRosterPresentation() {
  Hooks.on("preUpdateActor", (actor, changed) => {
    if (!flag(actor,"roster") || actor.type!=="npc") return;
    const value = changed["system.advances.value"] ?? changed.system?.advances?.value;
    if (Number(value)<=11 || !Number.isFinite(Number(value))) return;
    if (changed.system?.advances) changed.system.advances.value = 11;
    if ("system.advances.value" in changed) changed["system.advances.value"] = 11;
    if (changed.system?.advances?.rank) changed.system.advances.rank = "Veteran";
    if ("system.advances.rank" in changed) changed["system.advances.rank"] = "Veteran";
  });
  Hooks.on("renderCompendium", (app,root) => {
    if (app.collection?.collection!==`${ID}.pro-benders`) return;
    void app.collection.getIndex({fields:[`flags.${ID}.captain`,`flags.${ID}.champion`]}).then(index=>{
      for (const row of root.querySelectorAll("[data-entry-id]")) {
        const member = index.get(row.dataset.entryId);
        if (!flag(member,"captain") || row.querySelector(".avatar-captain")) continue;
        const badge = document.createElement("span");
        badge.className = "avatar-captain";
        badge.textContent = flag(member,"champion") ? "Champion · Captain" : "Captain";
        row.querySelector(".entry-name")?.after(badge);
      }
    }).catch(console.error);
  });
  Hooks.on("renderCharacterSheet", (app,root) => {
    const actor = app.actor;
    if (!flag(actor,"roster")) return;
    if (!actor.system.details.goals) {
      root.querySelector('[name="system.details.goals"]')?.closest(".editor-container")?.remove();
    }
    const advance = root.querySelector('input[name="system.advances.value"]');
    if (!advance) return;
    advance.max = 11;
    advance.dataset.tooltip = "Setting advancement level. Better Setting calculates combat rating independently.";
  });
}
