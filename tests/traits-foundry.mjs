import assert from "node:assert/strict";
import {chromium} from "../../swade-better-setting/node_modules/playwright/index.mjs";

const browser=await chromium.launch({executablePath:process.env.LOCALAPPDATA+"/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-win64/chrome-headless-shell.exe"});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
try {
  await page.goto("http://localhost:30029/join");
  await page.locator('select[name="userId"]').selectOption({label:"Gamemaster"});
  await page.getByRole("button",{name:"Join Game Session",exact:true}).click();
  await page.waitForFunction(()=>globalThis.game?.ready);
  const reload=await page.evaluate(async()=>{
    const ids=["swade-pro-bending","swade-better-setting","swade-better-effects","swade-better-powers","swade-better-templates"];
    if(ids.every(id=>game.modules.get(id)?.active))return false;
    await game.settings.set("core","moduleConfiguration",Object.fromEntries(ids.map(id=>[id,true])));
    return true;
  });
  if(reload)await page.reload();
  await page.waitForFunction(()=>globalThis.game?.ready&&game.modules.get("swade-pro-bending")?.api?.boostLowerTrait);
  const values=await page.evaluate(async()=>{
    const {applyTraitEffect}=await import("/modules/swade-pro-bending/scripts/traits.mjs");
    const actor=await Actor.create({name:"Trait macro QA",type:"character",
      system:{attributes:{agility:{die:{sides:8}},vigor:{die:{sides:8}}}},
      items:[{name:"Fighting",type:"skill",system:{swid:"fighting",attribute:"agility",die:{sides:8}}}]});
    globalThis.traitQa=actor;
    const snapshots=[];
    const read=()=>[actor.system.attributes.agility.die.sides,actor.system.attributes.vigor.die.sides,
      actor.items.getName("Fighting").system.die.sides,actor.system.stats.parry.value,actor.system.stats.toughness.value];
    const original=read();
    const lower=await applyTraitEffect(actor,{trait:"attribute:agility",lower:true,strong:true,raised:true});
    snapshots.push(read()[0]);
    await actor.createEmbeddedDocuments("ActiveEffect",[{name:lower.name+" · 1/2 successes",transfer:false,
      flags:{"swade-better-effects":{lingeringProgress:lower.uuid}}}]);
    await lower.update({"flags.swade-better-effects.lingeringState":{progress:1}});
    snapshots.push(read()[0]);
    await lower.delete();
    snapshots.push(read()[0]);
    const fighting=actor.items.getName("Fighting");
    const boost=await applyTraitEffect(actor,{trait:"skill:"+fighting.id,raised:true});
    const parry=read()[3];
    await applyTraitEffect(actor,{trait:"skill:"+fighting.id,raised:false});
    const count=actor.effects.filter(e=>e.flags["swade-pro-bending"]?.traitEffect?.id===fighting.id).length;
    await boost.update({disabled:true});
    const restored=read()[3];
    await applyTraitEffect(actor,{trait:"attribute:vigor",lower:true,raised:true});
    const toughness=read()[4];
    await actor.update({"system.attributes.strength.die.sides":12,"system.attributes.strength.die.modifier":2});
    await applyTraitEffect(actor,{trait:"attribute:strength",lower:true});
    const high=actor.system.attributes.strength.die;
    return {snapshots,original,parry,count,restored,toughness,high:{sides:high.sides,modifier:high.modifier},
      macro:!!(await fromUuid("Compendium.swade-pro-bending.macros.Macro.8b75a8e41c824cbd"))};
  });
  console.log(values);
  assert.deepEqual(values.snapshots,[4,6,8]);
  assert.equal(values.parry,values.original[3]+2);
  assert.equal(values.count,1);
  assert.equal(values.restored,values.original[3]);
  assert.equal(values.toughness,values.original[4]-2);
  assert.deepEqual(values.high,{sides:12,modifier:1});
  assert.equal(values.macro,true);
  await page.evaluate(async()=>{
    await traitQa.update({"system.attributes.smarts.die.sides":8});
    void game.modules.get("swade-pro-bending").api.boostLowerTrait(traitQa);
  });
  await page.getByRole("button",{name:"Apply effect",exact:true}).waitFor();
  const form=page.locator('form:has(select[name="trait"])');
  await form.locator('select[name="mode"]').selectOption("lower");
  await form.locator('input[name="strong"]').check();
  await form.locator('input[name="raised"]').check();
  await form.locator('select[name="trait"]').selectOption("attribute:smarts");
  await form.getByRole("button",{name:"Apply effect",exact:true}).click();
  await page.waitForFunction(()=>traitQa.effects.some(e=>e.name==="Strong Lower Smarts (Raise)"));
  assert.deepEqual(errors,[]);
  console.log("Trait picker, Better Effects recovery stages, d12+, stacking, Parry, and Toughness verified.");
} finally {
  await page.evaluate(async()=>{if(globalThis.traitQa)await traitQa.delete();}).catch(()=>{});
  await browser.close();
}
