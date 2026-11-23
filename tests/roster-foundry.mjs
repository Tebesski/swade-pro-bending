import assert from "node:assert/strict";
import {chromium} from "../../swade-better-setting/node_modules/playwright/index.mjs";

const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(process.env.FOUNDRY_QA_URL || "http://localhost:30039/join");
  await page.locator('select[name="userId"]').selectOption({label:"Gamemaster"});
  await page.getByRole("button",{name:"Join Game Session",exact:true}).click();
  await page.waitForFunction(()=>globalThis.game?.ready && game.modules.get("swade-pro-bending")?.api);
  assert.match(await page.evaluate(()=>game.world.id),/-qa$/);
  const result = await page.evaluate(async()=>{
    const id = "swade-pro-bending", sbe = "swade-better-effects";
    const api = game.modules.get(id).api, effects = game.modules.get(sbe).api;
    const powers = game.modules.get("swade-better-powers").api;
    const {actorRating} = await import("/modules/swade-better-setting/scripts/npc-data.mjs");
    const {forecastEncounter} = await import("/modules/swade-better-setting/scripts/encounter-forecast.mjs");
    const pack = game.packs.get(id+".pro-benders");
    const docs = await pack.getDocuments();
    const {signatureAction} = await import("/modules/swade-pro-bending/scripts/signatures.mjs");
    const {resolveDamage} = await import("/modules/swade-better-effects/scripts/rules.mjs");
    const {rollTarget} = await import("/modules/swade-better-effects/scripts/flags.mjs");
    const check = (condition,message)=>{if (!condition) throw Error(message);};
    const teams = new Map();
    const names = [], healing = [];
    const ratings = [];
    const tiers = ["Low","Mid","High","Pro","Super Pro"];
    const {DialogV2} = foundry.applications.api, confirm = DialogV2.confirm;
    const foe = await Actor.create({name:"QA opposition",type:"npc"});
    const scene = await Scene.create({name:"QA roster targets"});
    try {
      const [target,other] = await scene.createEmbeddedDocuments("Token",[
        {actorId:foe.id,actorLink:true,x:0,y:0},{actorId:foe.id,actorLink:true,x:300,y:0}
      ]);
      await foe.toggleActiveEffect("distracted",{active:true});
      await foe.toggleActiveEffect("vulnerable",{active:true});
      DialogV2.confirm = async()=>true;
      for (const template of docs) {
        template.validate({strict:true});
        if (template.type==="vehicle") {
          const pilotUuid = template.system.description.match(/@UUID\[([^\]]+)\]/)?.[1];
          const pilot = pilotUuid && await fromUuid(pilotUuid);
          check(pilot?.items.getName("Vehicles")?.system.die.sides===10 && template.itemTypes.weapon[0].system.actions.trait==="Vehicles",template.name+" crew");
          continue;
        }
        const rating = actorRating(template), flags = template.flags[id];
        check(rating.rated && rating.coverage==="Partial" && !rating.manual,template.name+" rating");
        ratings.push({name:template.name,advances:template.system.advances.value,cr:rating.cr,strength:rating.strength});
        check(template.itemTypes.power.every(p=>powers.usesNoPowerPoints(p)),template.name+" casting");
        for (const power of template.itemTypes.power) {
          const master = await fromUuid(power._stats.compendiumSource);
          check(master?.type==="power" && master.getFlag(id,"key")===power.getFlag(id,"key"),power.name+" compendium source");
          const refs = JSON.stringify(power.flags["swade-better-powers"]?.applyEffects || {}).match(/"((?:Compendium\.|Item\.)[^"]+)"/g) || [];
          for (const quoted of refs) {
            const uuid = JSON.parse(quoted);
            check(uuid.startsWith("Compendium.") && await fromUuid(uuid),power.name+" effect "+uuid);
          }
        }
        if (template.itemTypes.power.some(p=>p.getFlag(id,"key")==="healing")) {
          check(template.itemTypes.skill.some(s=>s.system.swid==="healing"),template.name+" missing Healing skill");
          healing.push(template.name);
        }
        if (flags.team) {
          const members = teams.get(flags.team) || [];
          const tier = tiers.indexOf(flags.tier);
          const wounds = (flags.captain?[1,2,2,3,3]:[0,0,1,2,3])[tier];
          check(template.system.wounds.max===wounds && template.isWildcard===(wounds===3),template.name+" tier");
          members.push({...flags,profile:rating.profile,strength:rating.strength});
          teams.set(flags.team,members);
        }
        if (!template.itemTypes.action?.some(i=>i.getFlag(id,"signatureAction"))) continue;
        const actor = await game.actors.importFromCompendium(pack,template.id);
        try {
          const action = actor.itemTypes.action.find(i=>i.getFlag(id,"signatureAction"));
          const move = action.getFlag(id,"signatureAction");
          if (template.name==="Nanuq") {
            const feet = actor.items.getName("Fleet-Footed").effects.contents[0];
            check(actor.system.pace.ground===8 && actor.system.pace.running.die===8,"Fleet-Footed active");
            await feet.update({disabled:true});
            check(actor.system.pace.ground===6 && actor.system.pace.running.die===6,"Fleet-Footed disabled");
            await feet.update({disabled:false});
          }
          if (flags.champion) {
            check(actor.system.attributes.spirit.unShakeBonus===2 && actor.system.attributes.vigor.unStunBonus===2,"Combat Reflexes recovery");
          }
          if (move.stance) await api.changeStance(actor,move.stance);
          if (move.recovery) await actor.toggleActiveEffect("shaken",{active:true});
          const row = action.effects.contents[0].system.changes[0];
          const get = key=>foundry.utils.getProperty(actor,key);
          const native = row.key.startsWith("system.") && !row.key.includes("globalMods");
          const original = native && get(row.key);
          const selection = {actor:foe,document:target};
          if (move.targetStatus) Set.prototype.add.call(game.user.targets,selection);
          try {
            if (move.skill) {
              const rollSkill = actor.rollSkill.bind(actor);
              actor.rollSkill = async(skillId,options)=>{
                const plain = await rollSkill(skillId,{suppressChat:true});
                const boosted = await rollSkill(skillId,{...options,suppressChat:true});
                check(!plain.formula.includes(action.name) && boosted.formula.includes(action.name),action.name+" skill scope");
                return boosted;
              };
            }
            const run = async key=>(await fromUuid(action.system.actions.additional[key].uuid)).execute({actor,item:action});
            await run("signatureUse");
            check(action.getFlag(id,"signatureUsed"),action.name+" was not spent");
            const active = actor.effects.find(e=>e.getFlag(id,"signatureItem")===action.id);
            if (move.skill) check(!active,action.name+" roll did not clean up");
            else if (native) check(get(row.key)===original+Number(row.value),action.name+" native bonus");
            else {
              const testItem = actor.items.find(i=>i.getFlag(id,"weapon")===(JSON.stringify(action.effects.contents[0].flags).includes("elemental-assault")?"assault":"hurl"));
              const offensive = actor.itemTypes.power.find(i=>i.flags[sbe]?.tags?.includes("offensive-technique"));
              const item = row.key.endsWith(".trait")?offensive:testItem;
              const context = effects.makeRollContext(actor,item,[],{kind:"trait"});
              const applied = token=>{
                if (row.key.includes("targetRoll")) {
                  const incoming = effects.makeRollContext(foe,testItem,[],{kind:"trait"});
                  return effects.traitAdjustment(incoming,{actor}).applied;
                }
                if (row.key.endsWith(".damage")) return resolveDamage({damage:8,toughness:6,attackerRules:context.attackerRules,
                  context:{...context,target:rollTarget(context,token).flags}}).applied;
                return effects.traitAdjustment(context,token).applied;
              };
              check(applied(target).some(r=>r.label===action.name),action.name+" failed its trigger");
              if (move.targetStatus) check(!applied(other).some(r=>r.label===action.name),action.name+" applied to another token");
            }
            let blocked = false;
            try { await signatureAction(action); } catch { blocked = true; }
            check(blocked,action.name+" repeat use");
            await run("signatureFinish");
            check(!actor.effects.some(e=>e.getFlag(id,"signatureItem")===action.id),action.name+" did not finish");
            if (native) check(get(row.key)===original,action.name+" did not restore stat");
            await run("signatureReset");
            check(!action.getFlag(id,"signatureUsed"),action.name+" did not reset");
            names.push(action.name);
          } finally { if (move.targetStatus) Set.prototype.delete.call(game.user.targets,selection); }
        } finally { await actor.delete(); }
      }
      for (const [team,members] of teams) {
        check(members.length===3 && members.filter(x=>x.captain).length===1 && new Set(members.map(x=>x.element)).size===3,team);
      }
      const champion = ratings.find(r=>r.name==="Jian Zhen");
      check(champion.advances===11 && champion.cr===11 && ratings.every(r=>r===champion || r.advances<11 && r.strength<champion.strength),"champion ceiling");
      let previousMax = 0;
      const cap = game.settings.get("swade","woundCap")?4:0;
      for (const tier of tiers) {
        const division = [...teams.entries()].filter(([,members])=>members[0].tier===tier).sort(([a],[b])=>a.localeCompare(b));
        const totals = division.map(([,members])=>members.reduce((sum,r)=>sum+r.strength,0));
        check(division.length===4 && Math.min(...totals)>previousMax,tier+" strength progression");
        previousMax = Math.max(...totals);
        for (let i=0;i<division.length;i++) for (const opponent of division.slice(i+1)) {
          const match = forecastEncounter([division[i][1],opponent[1]],cap);
          check(!match.unresolved && match.wins>match.trials*.25 && match.wins<match.trials*.75,division[i][0]+" vs "+opponent[0]);
        }
      }
      return {docs:docs.length,folders:pack.folders.size,teams:teams.size,moves:names.length,healers:healing.length};
    } finally {
      DialogV2.confirm = confirm;
      await scene.delete();
      await foe.delete();
    }
  });
  assert.deepEqual(result,{docs:108,folders:39,teams:20,moves:38,healers:8});
  console.log(result);
} finally { await browser.close(); }
