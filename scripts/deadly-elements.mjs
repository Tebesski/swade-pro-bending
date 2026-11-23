import {
   ID,
   EFFECTS,
   POWERS,
   dialog,
   flag,
   queue,
   requireOwner,
   selectedActor,
   report,
   contentQueue,
} from "./shared.mjs"
import { isElementalWeapon } from "./bending-data.mjs"
import {changeSignature} from "../../swade-better-effects/scripts/rules.mjs"
import {createPowerTimer} from "../../swade-better-powers/scripts/maintenance.mjs"

export const DEADLY_MACRO_ID = "4c40a367fa583fec"
export const deadlyAction = {
   name: "Deadly Elements",
   type: "macro",
   macroActor: "self",
   uuid: `Compendium.${ID}.macros.Macro.${DEADLY_MACRO_ID}`,
}
export const DEADLY_ICON =
   "icons/magic/symbols/elements-air-earth-fire-water.webp"
const serial = queue()
const kindOf = (item) =>
   flag(item, "weapon") ?? (/Assault/i.test(item.name) ? "assault" : "hurl")
const isDeadly = (effect) =>
   flag(effect, "deadlyElements") ||
   flag(effect, "deadly") ||
   flag(effect, "deadly-raise") ||
   ["deadly", "deadly-raise"].includes(flag(effect, "key"))

const heavyQueue=queue()
const worldActors=()=>{
   const actors=new Map(game.actors.map(actor=>[actor.uuid,actor]))
   for (const scene of game.scenes) for (const token of scene.tokens)
      if (!token.actorLink && token.actor) actors.set(token.actor.uuid,token.actor)
   return [...actors.values()]
}
const hasHeavy = (actor,weapon)=>[...actor.allApplicableEffects()].some(effect=>{
   const data=flag(effect,"deadlyElements")
   return effect.active && !effect.duration.expired && data?.quality==="heavy" && data.attack===kindOf(weapon)
})

// Remember the actual checkbox value so ending a buff never removes an innate Heavy Weapon quality.
export async function syncDeadlyHeavy(actor) {
   if (!actor?.isOwner) return
   const owner=game.users.activeGM ?? game.users.getDesignatedUser(user=>user.active && actor.testUserPermission(user,"OWNER"))
   if (owner?.id!==game.user.id) return
   return heavyQueue(actor.uuid,async()=>{
      const updates=[]
      for (const weapon of actor.itemTypes.weapon??[]) {
         const stored=flag(weapon,"deadlyHeavy")
         const active=isElementalWeapon(weapon) && hasHeavy(actor,weapon)
         if (active && !stored) updates.push({_id:weapon.id,"system.isHeavyWeapon":true,
            [`flags.${ID}.deadlyHeavy`]:{original:!!weapon._source.system.isHeavyWeapon}})
         else if (active && !weapon._source.system.isHeavyWeapon) updates.push({_id:weapon.id,"system.isHeavyWeapon":true})
         else if (!active && stored) updates.push({_id:weapon.id,"system.isHeavyWeapon":stored.original,
            [`flags.${ID}.deadlyHeavy`]:new foundry.data.operators.ForcedDeletion()})
      }
      if (updates.length) await actor.updateEmbeddedDocuments("Item",updates)
   })
}

export function deadlyEffect(
   weapons,
   { raised = false, quality = "", attack = "assault", extended = false } = {},
) {
   if (
      !["", "reach", "ap", "heavy"].includes(quality) ||
      !["hurl", "assault"].includes(attack)
   )
      throw new Error("Choose a valid quality and attack.")
   const damage = raised ? 4 : 2,
      amount = raised ? 2 : 1
   const changes = [], conditions = []
   const attackFlag = kind=>({op:"flag",source:"roll",flag:`elemental-${kind}`})
   const change = (key,value,predicate,type="add")=>{
      const row={key,type,value:String(value),phase:"initial",priority:null}
      changes.push(row)
      conditions.push({signature:changeSignature(row),customName:"Deadly Elements",predicate})
   }
   change("system.stats.globalMods.damage",damage,{op:"any",children:[attackFlag("hurl"),attackFlag("assault")]})
   if (quality === "ap") change("system.stats.globalMods.ap",amount,attackFlag(attack))
   if (quality === "reach") change(`sbe.rollNote.${encodeURIComponent("system.stats.globalMods.damage")}`,
      `<p>Reach +${amount}</p>`,attackFlag(attack),"override")
   const extra = quality
      ? ` ${attack === "hurl" ? "Hurl" : "Assault"}: ${quality === "reach" ? `Reach +${amount}` : quality === "ap" ? `AP +${amount}` : "Heavy Weapon"}.`
      : ""
   return {
      name: `Deadly Elements${raised ? " (Raise)" : ""}`,
      type: "base",
      img: DEADLY_ICON,
      transfer: false,
      disabled: false,
      showIcon: 2,
      description: `<p>Hurl and Assault: +${damage} damage.${extra} Disable or remove this effect to end it.</p>`,
      duration: extended
         ? { value: 1, units: "minutes", expiry: "turnEnd" }
         : { value: 5, units: "rounds", expiry: "turnEnd" },
      system: { changes },
      flags: {
         [ID]: {
            deadlyElements: {
               version: 2,
               raised,
               quality,
               attack,
               reach: quality === "reach" ? amount : 0,
            },
         },
         [EFFECTS]: { conditions, nameFlag:"deadly-elements" },
      },
   }
}

export async function applyDeadlyElements(actor, options = {}) {
   requireOwner(actor)
   return serial(actor.uuid, async () => {
      const weapons = [...actor.itemTypes.weapon].filter(isElementalWeapon)
      if (!weapons.length)
         throw new Error("This actor has no elemental Hurl or Assault weapons.")
      const previous = actor.effects.filter(isDeadly)
      const before = new Set(actor.effects.map((effect) => effect.id))
      const data = deadlyEffect(weapons, options)
      const power=actor.itemTypes.power?.find(item=>flag(item,"key")==="deadly-elements")
      let timer, newTimer=false
      if (power) {
         const used=new Set(actor.effects.map(effect=>effect.flags[POWERS]?.powerTimer).filter(Boolean))
         timer=[...actor.effects].reverse().find(effect=>effect.origin===power.uuid && effect.flags[POWERS]?.timedPower && !used.has(effect.uuid) && !effect.disabled)
         if (timer) await timer.update({start:CONFIG.ActiveEffect.documentClass.getEffectStart(),duration:{...data.duration,expired:false}})
         else {
            timer=await createPowerTimer(power,data.duration)
            newTimer=true
            await timer.setFlag(ID,"deadlyTimer",true)
         }
         data.origin=power.uuid
         data.start=timer.toObject().start
         data.flags[POWERS]={powerTimer:timer.uuid}
      }
      try { await game.modules
         .get(EFFECTS)
         .api.applyEffectTemplate(
            { type: `${EFFECTS}.effect`, effects: [data], uuid: power?.uuid??null },
            actor,
         )
      } catch (error) { if (newTimer) await timer.delete(); throw error }
      const created = actor.effects.find(
         (effect) => !before.has(effect.id) && flag(effect, "deadlyElements"),
      )
      if (!created) throw new Error("Deadly Elements could not be applied.")
      try {
         if (previous.length)
            await actor.deleteEmbeddedDocuments(
               "ActiveEffect",
               previous.map((effect) => effect.id),
            )
      } catch (error) {
         await created.delete()
         if (newTimer) await timer.delete()
         throw error
      }
      await syncDeadlyHeavy(actor)
      ui.notifications.info(`${data.name} applied to ${actor.name}.`)
      return created
   })
}

export async function deadlyElements(actor = selectedActor()) {
   requireOwner(actor)
   const answer = await dialog().prompt({
      window: { title: "Deadly Elements" },
      content: `<label><input type="checkbox" name="raised"> Raised</label>
    <div class="form-group"><label>Modifier: Enhance</label><select name="quality"><option value="">None</option><option value="reach">Reach +1 (+2 when Raised)</option><option value="ap">AP +1 (+2 when Raised)</option><option value="heavy">Heavy Weapon</option></select></div>
    <div class="form-group" data-enhance hidden><label>Enhance attack</label><select name="attack"><option value="assault">Assault</option><option value="hurl">Hurl</option></select></div>
    <label><input type="checkbox" name="extended">Modifier: Duration</label>`,
      render: (_event, app) => {
         const form = app.element.querySelector("form")
         form.elements.quality.addEventListener(
            "change",
            () =>
               (form.querySelector("[data-enhance]").hidden =
                  !form.elements.quality.value),
         )
      },
      ok: {
         label: "Apply effect",
         callback: (_event, button) => new FormData(button.form),
      },
      rejectClose: false,
   })
   if (!answer) return
   return applyDeadlyElements(actor, {
      raised: answer.has("raised"),
      quality: answer.get("quality"),
      attack: answer.get("attack"),
      extended: answer.has("extended"),
   })
}

const actionUpdate = (item) => ({
   "system.actions.additional.deadlyElements": deadlyAction,
   [`flags.${POWERS}.applyEffects`]: new foundry.data.operators.ForcedDeletion(),
})

export async function updateDeadlyCompendiums() {
   return contentQueue("compendiums",async()=>{
   const macroPack = game.packs.get(`${ID}.macros`),
      techniquePack = game.packs.get(`${ID}.techniques`)
   const edit = async (pack, fn) => {
      const locked = pack.locked
      try {
         if (locked) await pack.configure({ locked: false })
         await fn()
      } finally {
         if (locked) await pack.configure({ locked: true })
      }
   }
   if (!(await macroPack.getDocument(DEADLY_MACRO_ID)))
      await edit(macroPack, () =>
         Macro.create(
            {
               _id: DEADLY_MACRO_ID,
               name: "Deadly Elements",
               type: "script",
               scope: "global",
               img: DEADLY_ICON,
               flags: { [ID]: { key: "deadly-elements", contentRevision: 2 } },
               command: `const api = game.modules.get("${ID}")?.api;
if (!api) return ui.notifications.warn("Enable SWADE Pro-Bending first.");
try { await api.deadlyElements(typeof actor === "undefined" ? undefined : actor); }
catch (error) { ui.notifications.error(error.message, {console:true}); }`,
            },
            { pack: macroPack.collection, keepId: true },
         ),
      )
   await techniquePack.getIndex({ fields: [`flags.${ID}.key`] })
   const row = techniquePack.index.find(
      (item) => flag(item, "key") === "deadly-elements",
   )
   const item = row && (await techniquePack.getDocument(row._id))
   if (
      item &&
      (item.system.actions.additional.deadlyElements?.uuid !==
         deadlyAction.uuid ||
         item.flags[POWERS]?.applyEffects)
   ) {
      await edit(techniquePack, () => item.update(actionUpdate(item)))
   }
   });
}
export function installDeadlyElements() {
   const sync=actor=>{void syncDeadlyHeavy(actor).catch(report)}
   for (const event of ["createActiveEffect","updateActiveEffect","deleteActiveEffect"]) Hooks.on(event,effect=>{
      if (effect.parent?.documentName==="Actor") sync(effect.parent)
      if (event==="deleteActiveEffect" && isDeadly(effect)) {
         const uuid=effect.flags[POWERS]?.powerTimer
         if (uuid && game.user.isActiveGM) void fromUuid(uuid).then(async timer=>{
            if (flag(timer,"deadlyTimer") && !worldActors().some(actor=>actor.effects.some(e=>e.flags[POWERS]?.powerTimer===uuid))) await timer.delete()
         }).catch(report)
      }
   })
   for (const event of ["createItem","updateItem","deleteItem"]) Hooks.on(event,item=>{
      if (item.type==="weapon") sync(item.actor)
   })
   for (const event of ["updateWorldTime","updateCombat","canvasReady"]) Hooks.on(event,()=>worldActors().forEach(sync))
   Hooks.on("preCreateItem", (item) => {
      if (flag(item, "key") !== "deadly-elements") return
      item.updateSource(actionUpdate(item))
   })
   Hooks.on("preCreateActor", (actor) => {
      const items = actor.toObject().items
      let changed = false
      for (const item of items)
         if (flag(item, "key") === "deadly-elements") {
            item.system.actions ??= {}
            item.system.actions.additional ??= {}
            item.system.actions.additional.deadlyElements = deadlyAction
            if (item.flags[POWERS]) delete item.flags[POWERS].applyEffects
            changed = true
         }
      if (changed) actor.updateSource({ items })
   })
   Hooks.once("ready", async () => {
      if (!game.user.isActiveGM) return
      await updateDeadlyCompendiums()
      const actors = worldActors()
      for (const actor of actors) {
         for (const effect of actor.effects) {
            const data=flag(effect,"deadlyElements")
            if (!data || data.version>=2) continue
            const source=deadlyEffect([...actor.itemTypes.weapon],data)
            await effect.update({"system.changes":source.system.changes,
               [`flags.${EFFECTS}.conditions`]:source.flags[EFFECTS].conditions,
               [`flags.${EFFECTS}.nameFlag`]:"deadly-elements",
               [`flags.${ID}.deadlyElements`]:source.flags[ID].deadlyElements,
               description:source.description})
         }
         await syncDeadlyHeavy(actor)
      }
      for (const item of [
         ...game.items,
         ...actors.flatMap((actor) => [...actor.items]),
      ]) {
         if (
            flag(item, "key") === "deadly-elements" &&
            (item.system.actions.additional.deadlyElements?.uuid !==
               deadlyAction.uuid ||
               item.flags[POWERS]?.applyEffects)
         )
            await item.update(actionUpdate(item))
      }
   })
}
