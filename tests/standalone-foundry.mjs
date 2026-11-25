import assert from "node:assert/strict";
import {chromium} from "../../swade-better-setting/node_modules/playwright/index.mjs";

const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined});
const url = process.env.FOUNDRY_QA_URL || "http://localhost:30039/join";
async function join(name) {
  const page = await browser.newPage();
  await page.goto(url);
  await page.locator('select[name="userId"]').selectOption({label:name});
  await page.getByRole("button",{name:"Join Game Session",exact:true}).click();
  await page.waitForFunction(()=>globalThis.game?.ready && game.modules.get("swade-pro-bending")?.api);
  assert.match(await page.evaluate(()=>game.world.id),/-qa$/);
  return page;
}
const gm = await join("Gamemaster");
let fixture, player;
try {
  fixture = await gm.evaluate(async()=>{
    const user = await User.create({name:"Macro QA "+foundry.utils.randomID(6),role:CONST.USER_ROLES.PLAYER});
    const caster = await Actor.create({name:"Untrained caster",type:"character",ownership:{[user.id]:3}});
    const target = await Actor.create({name:"GM target",type:"npc"});
    const scene = await Scene.create({name:"Standalone macro QA"});
    const [token] = await scene.createEmbeddedDocuments("Token",[{actorId:target.id,actorLink:true},{actorId:caster.id,actorLink:true,x:200}]);
    const previousScene = game.scenes.active?.id;
    await scene.activate();
    await user.update({character:caster.id});
    return {user:user.id,name:user.name,scene:scene.id,previousScene,caster:caster.uuid,target:target.uuid,token:token.uuid};
  });
  player = await join(fixture.name);
  await player.waitForFunction(scene=>canvas.ready && canvas.scene?.id===scene,fixture.scene);
  const result = await player.evaluate(async({caster,token,target})=>{
    const id="swade-pro-bending", actor=await fromUuid(caster), gm=game.users.activeGM;
    const dialog=foundry.applications.api.DialogV2, prompt=dialog.prompt;
    let title;
    const values=new Map([["target","0"],["trait","attribute:agility"],["mode","boost"]]);
    dialog.prompt=async options=>{title=options.window.title;return values;};
    try {
      const agility=actor.system.attributes.agility.die.sides;
      await game.swade.rollItemMacro("Boost/Lower Trait (Earth)");
      if(actor.system.attributes.agility.die.sides!==agility+2) throw Error("Standalone hotbar shortcut did not boost Agility.");
      const boostTitle=title;
      values.set("quality","heavy");
      values.set("attack","hurl");
      await game.swade.rollItemMacro("Deadly Elements");
      values.set("strong","heavy");
      await game.swade.rollItemMacro("Awareness");
      await game.swade.rollItemMacro("Elemental Surf");
      for (const key of ["deadlyElements","awareness","elementalSurf"]) {
        if (!actor.effects.some(e=>e.getFlag(id,key))) throw Error("Standalone effect missing: "+key);
      }
      const wait=dialog.wait;
      let shapes;
      try {
        dialog.wait=async options=>{shapes=options.buttons.map(b=>b.action);return null;};
        await game.modules.get(id).api.areaProtection(actor);
        if (!shapes?.includes("medium") || !shapes.includes("large")) throw Error("Area Protection did not open Better Templates.");
      } finally {dialog.wait=wait;}
      const options={trait:"attribute:vigor",lower:false,raised:true};
      await gm.query(id+".traitEffect",{casterUuid:caster,tokenUuid:token,options});
      await gm.query(id+".elementalProtection",{casterUuid:caster,tokenUuid:token,flags:"fire"});
      await gm.query(id+".analyseFoe",{casterUuid:caster,tokenUuid:token,extended:true});
      await gm.query(id+".elementalManeuver",{casterUuid:caster,tokenUuid:token,options:{mode:"disarm",castTotal:6,raises:0,rounds:1,resistance:"failed"}});
      return {title:boostTitle,noPower:actor.itemTypes.power.length===0,ownsTarget:(await fromUuid(target))?.isOwner??false};
    } finally {dialog.prompt=prompt;}
  },fixture);
  assert.deepEqual(result,{title:"Boost / Lower Trait",noPower:true,ownsTarget:false});
  const applied = await gm.evaluate(async({caster,target})=>{
    const actor=await fromUuid(caster), foe=await fromUuid(target);
    return [actor.effects.some(e=>e.name==="Boost Agility"),foe.effects.some(e=>e.getFlag("swade-pro-bending","traitEffect")?.key==="vigor"),
      foe.effects.some(e=>e.getFlag("swade-pro-bending","maneuver")==="disarm"),foe.effects.some(e=>e.getFlag("swade-pro-bending","elementalProtection")),
      [actor,foe].every(a=>a.effects.some(e=>e.getFlag("swade-pro-bending","analyse")))];
  },fixture);
  assert.deepEqual(applied,[true,true,true,true,true]);
  console.log("Player hotbar shortcut, four GM-mediated effects, and unowned target verified without any caster Techniques.");
} finally {
  await player?.close();
  if(fixture) await gm.evaluate(async({scene,previousScene,user,caster,target})=>{
    if(previousScene) await game.scenes.get(previousScene)?.activate();
    await game.scenes.get(scene)?.delete();
    await (await fromUuid(caster))?.delete();
    await (await fromUuid(target))?.delete();
    await game.users.get(user)?.delete();
  },fixture);
  await browser.close();
}
