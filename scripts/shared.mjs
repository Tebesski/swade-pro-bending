export const ID = "swade-pro-bending";
export const POWERS = "swade-better-powers";
export const EFFECTS = "swade-better-effects";
export const TEMPLATES = "swade-better-templates";
export const flag = (doc, key) => doc?.flags?.[ID]?.[key];
export const slug = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
export const background = actor => (actor?.itemTypes?.edge ?? []).find(item => flag(item, "background"));
export const hasEdge = (actor, key) => (actor?.itemTypes?.edge ?? []).some(item => flag(item, "key") === key);
export const effects = (actor, key) => [...(actor?.effects ?? [])].filter(e => flag(e, key));
export const enabled = (actor, key) => [...(actor?.allApplicableEffects?.() ?? actor?.effects ?? [])].some(e => e.active && flag(e,key));
export const skill = (actor, name) => (actor?.itemTypes?.skill ?? []).find(item => item.system.swid === slug(name) || slug(item.name) === slug(name));
export const packDoc = async (pack, key) => {
  const collection = game.packs.get(`${ID}.${pack}`);
  await collection.getIndex({fields: [`flags.${ID}.key`]});
  const row = collection.index.find(d => flag(d, "key") === key);
  if (!row) throw new Error(`Missing Avatar compendium document: ${pack}/${key}.`);
  return collection.getDocument(row._id);
};
export const selectedActor = () => canvas.tokens?.controlled[0]?.actor ?? game.user.character;
export const report = error => ui.notifications.error(error.message ?? String(error), {console: true});
export const dialog = () => foundry.applications.api.DialogV2;
export const requireOwner = actor => {
  if (!actor?.isOwner || !actor.system.attributes) throw new Error("Select a character or NPC you can edit.");
  return actor;
};
export const post = (actor, content) => ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), content});
export function queue() {
  const pending = new Map();
  return (key, task) => {
    const next = (pending.get(key) ?? Promise.resolve()).catch(() => {}).then(task);
    pending.set(key, next);
    void next.finally(() => { if (pending.get(key) === next) pending.delete(key); }).catch(() => {});
    return next;
  };
}
