import assert from "node:assert/strict";
import {chromium} from "../../swade-better-setting/node_modules/playwright/index.mjs";
const browser=await chromium.launch({executablePath:process.env.LOCALAPPDATA+"/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-win64/chrome-headless-shell.exe"});
try{
  const page=await browser.newPage();
  await page.goto("http://localhost:30039/join");
  await page.locator('select[name="userId"]').selectOption({label:"Gamemaster"});
  await page.getByRole("button",{name:"Join Game Session",exact:true}).click();
  await page.waitForFunction(()=>globalThis.game?.ready&&game.modules.get("swade-pro-bending")?.api?.elementalManeuver);
  const result=await page.evaluate(async()=>{
    const {resolveManeuver,elementalManeuver,updateManeuverContent}=await import("/modules/swade-pro-bending/scripts/maneuver.mjs");
    const {rollRestricted}=await import("/modules/swade-better-effects/scripts/restrictions.mjs");
    const actor=await Actor.create({name:"Maneuver QA",type:"character"});
    const original=actor.rollAttribute;
    try{
      await updateManeuverContent();
      await resolveManeuver(actor,actor,{mode:"disarm",resistance:"failed"});
      const restricted=flag=>rollRestricted(actor,{hasRoll:true,rollType:"trait",roll:[flag],attacker:[],targetUuids:[]});
      const blocked=[restricted("elemental-hurl"),restricted("elemental-assault"),restricted("bending-technique")];
      const effect=actor.effects.find(effect=>effect.name==="Disarm");
      await effect.update({disabled:true});const disabled=restricted("elemental-hurl");
      await effect.update({disabled:false});const restored=restricted("elemental-hurl");
      const prompt=foundry.applications.api.DialogV2.prompt;
      try{
        foundry.applications.api.DialogV2.prompt=async()=>{const form=new FormData();form.set("mode","release");return form;};
        await elementalManeuver(actor);
      }finally{foundry.applications.api.DialogV2.prompt=prompt;}
      const removed=restricted("elemental-hurl");
      actor.rollAttribute=async()=>({total:8});
      await resolveManeuver(actor,actor,{mode:"disarm",castTotal:6});
      const resisted=actor.effects.size;
      actor.rollAttribute=async()=>({total:5});
      await resolveManeuver(actor,actor,{mode:"distracted",raises:3,prone:true,both:true,rounds:2,castTotal:6});
      const statuses=[...actor.statuses].sort();
      const durations=actor.effects.filter(e=>e.name!=="Prone").map(e=>e.toObject().duration.value);
      return {blocked,disabled,restored,removed,resisted,statuses,durations,
        macro:!!await game.packs.get("swade-pro-bending.macros").getDocument("6c53a29fb7c64a12")};
    }finally{actor.rollAttribute=original;await actor.delete();}
  });
  assert.deepEqual(result.blocked,[true,true,false]);
  assert.equal(result.disabled,false);assert.equal(result.restored,true);assert.equal(result.removed,false);
  assert.equal(result.resisted,0);assert.equal(result.macro,true);
  assert.deepEqual(result.statuses,["distracted","prone","vulnerable"]);
  assert.deepEqual(result.durations,[2,2]);
  console.log("Verified Restrict, disable/restore, Remove Disarm, resistance, raise effects, duration and macro installation.");
}finally{await browser.close();}
