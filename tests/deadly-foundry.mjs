import assert from "node:assert/strict";
import {chromium} from "../../swade-better-setting/node_modules/playwright/index.mjs";

const browser=await chromium.launch({executablePath:process.env.LOCALAPPDATA+"/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-win64/chrome-headless-shell.exe"});
const page=await browser.newPage();
try {
  await page.goto(process.env.FOUNDRY_QA_URL??"http://localhost:30039/join");
  await page.locator('select[name="userId"]').selectOption({label:"Gamemaster"});
  await page.getByRole("button",{name:"Join Game Session",exact:true}).click();
  await page.waitForFunction(()=>globalThis.game?.ready&&game.modules.get("swade-pro-bending")?.api?.deadlyElements);
  const result=await page.evaluate(async()=>{
    const {applyDeadlyElements,syncDeadlyHeavy}=await import("/modules/swade-pro-bending/scripts/deadly-elements.mjs");
    const {collectRules,collectRollNotes}=await import("/modules/swade-better-effects/scripts/effects.mjs");
    const {resolveDamage}=await import("/modules/swade-better-effects/scripts/rules.mjs");
    const ID="swade-pro-bending", BP="swade-better-powers";
    const kit=await game.packs.get(`${ID}.bending-kit`).getDocuments();
    const weapons=kit.filter(item=>item.type==="weapon" && item.flags[ID]?.element==="earth").map(item=>item.toObject());
    weapons.find(item=>item.name==="Earth Assault").system.isHeavyWeapon=true;
    const power=(await game.packs.get(`${ID}.techniques`).getDocuments()).find(i=>i.flags[ID]?.key==="deadly-elements").toObject();
    const actor=await Actor.create({name:"Deadly Elements QA",type:"character",items:[...weapons,power,
      {name:"Sword",type:"weapon",system:{damage:"@str+d6",ap:0}}]});
    try {
      const read=()=>actor.itemTypes.weapon.map(item=>({name:item.name,damage:item.system.damage,ap:item.system.ap,
        heavy:item.system.isHeavyWeapon,checkbox:!!item._source.system.isHeavyWeapon}));
      const damage=flag=>{
        const result=resolveDamage({damage:10,ap:0,toughness:5,armor:0,context:{hasRoll:true,roll:[flag]},attackerRules:collectRules(actor)});
        return {damage:result.damage,ap:result.ap};
      };
      const original=read();
      const effect=await applyDeadlyElements(actor,{quality:"ap",attack:"hurl"});
      const basic={hurl:damage("elemental-hurl"),assault:damage("elemental-assault"),sword:damage("melee")};
      const changes=effect.toObject().system.changes;
      await effect.update({disabled:true}); const disabled=damage("elemental-hurl");
      await effect.update({disabled:false}); const restored=damage("elemental-hurl");
      const raised=await applyDeadlyElements(actor,{raised:true,quality:"heavy",attack:"assault",extended:true});
      const heavy=read(),duration=raised.toObject().duration;
      const raisedDamage=damage("elemental-assault");
      const count=actor.effects.filter(e=>e.flags[ID]?.deadlyElements).length;
      await raised.update({disabled:true}); await syncDeadlyHeavy(actor); const heavyDisabled=read();
      await raised.update({disabled:false}); await syncDeadlyHeavy(actor); const heavyRestored=read();
      const timer=await fromUuid(raised.flags[BP].powerTimer);
      // Exercise Better Powers' actual Maintain / Let Expire path.
      const confirm=foundry.applications.api.DialogV2.confirm;
      const wait=async predicate=>{
        for(let i=0;i<100;i++) { if(predicate())return; await new Promise(resolve=>setTimeout(resolve,50)); }
        throw new Error("Maintenance did not finish.");
      };
      try {
        foundry.applications.api.DialogV2.confirm=async()=>true;
        await timer.update({"start.time":game.time.worldTime-120});
        await wait(()=>timer.flags[BP].maintenance===1 && !timer.duration.expired);
        await wait(()=>raised.start.time===timer.start.time);
        await syncDeadlyHeavy(actor);
        const maintained=read();
        foundry.applications.api.DialogV2.confirm=async()=>false;
        await timer.update({"start.time":game.time.worldTime-120});
        await wait(()=>!actor.effects.has(raised.id));
        await syncDeadlyHeavy(actor);
        const expired=read();
        const reach=await applyDeadlyElements(actor,{raised:true,quality:"reach",attack:"assault"});
        const notes=collectRollNotes(actor).map(note=>({html:note.html,predicate:note.predicate}));
        return {original,basic,changes,disabled,restored,heavy,heavyDisabled,heavyRestored,duration,count,raisedDamage,maintained,expired,
          notes,reachChanges:reach.toObject().system.changes};
      } finally { foundry.applications.api.DialogV2.confirm=confirm; }
    } finally { await actor.delete(); }
  });
  assert.deepEqual(result.basic,{hurl:{damage:12,ap:1},assault:{damage:12,ap:0},sword:{damage:10,ap:0}});
  assert.deepEqual(result.disabled,{damage:10,ap:0});
  assert.deepEqual(result.restored,{damage:12,ap:1});
  assert.deepEqual(result.raisedDamage,{damage:14,ap:0});
  assert.equal(result.changes.length,2);
  assert.deepEqual(result.changes.map(c=>c.key),["system.stats.globalMods.damage","system.stats.globalMods.ap"]);
  assert.equal(result.count,1);
  assert.deepEqual(result.heavyDisabled,result.original);
  assert.deepEqual(result.heavyRestored,result.heavy);
  assert.deepEqual(result.maintained,result.heavy);
  assert.deepEqual(result.expired,result.original);
  for (const weapon of result.heavy) {
    const base=result.original.find(item=>item.name===weapon.name);
    assert.equal(weapon.damage,base.damage);
    assert.equal(weapon.ap,base.ap);
    assert.equal(weapon.checkbox,weapon.name.includes("Assault"));
    assert.equal(weapon.heavy,weapon.checkbox);
  }
  assert.equal(result.duration.units,"minutes");
  assert.equal(result.duration.value,1);
  assert.equal(result.notes.length,1);
  assert.match(result.notes[0].html,/Reach \+2/);
  assert.deepEqual(result.notes[0].predicate,{op:"flag",source:"roll",flag:"elemental-assault"});
  assert.ok(result.reachChanges.every(change=>!change.key.startsWith("@Weapon")));
  console.log("Verified conditional damage/AP, Reach note, actual Heavy Weapon checkbox, original quality restoration, native maintenance and expiry.");
} finally { await browser.close(); }
