import {ID, dialog, report} from "./shared.mjs";
import {applyEffect, changeStance, chooseStance, initializeCharacters, installCharacter, setup} from "./character.mjs";
import {installCombat, reviewLatest, reviewMartial, sustainBubble} from "./combat.mjs";
import {heal, installHealing} from "./healing.mjs";
import {installPresentation, migrateAvatarContent} from "./presentation.mjs";
import {installRosterPresentation, useRosterFolders} from "./roster.mjs";
import {installSignatureActions, signatureAction} from "./signatures.mjs";
import {boostLowerTrait, installTraitEffects} from "./traits.mjs";
import {deadlyElements, installDeadlyElements} from "./deadly-elements.mjs";
import {elementalManeuver,installManeuver} from "./maneuver.mjs";
import {elementalProtection,areaProtection,elementalSurf,installAdvancedManipulation} from "./advanced-manipulation.mjs";
import {analyseFoe,installAnalyseFoe} from "./analyse-foe.mjs";
import {awareness,installAwareness} from "./awareness.mjs";
import {resolveBendingArea,installBendingAreas} from "./bending-areas.mjs";

async function worldSettings() {
  if (!game.user.isGM) throw new Error("Only a GM can change world settings.");
  const apply = await dialog().confirm({window:{title:"Avatar World Settings"},content:"<p>Enable No Power Points and Unarmored Hero for this world. More Skill Points is handled at character creation. The per-entry No Power Points toggle still lets you opt out on a casting entry.</p>",
    yes:{label:"Enable world rules"},no:{label:"Cancel"},rejectClose:false});
  if (apply) {
    await game.settings.set("swade","unarmoredHero",true);
    await game.settings.set("swade","noPowerPoints",true);
  }
}
Hooks.once("init",()=>{
  for (const [key,name,hint,value] of [
    ["resetStance","Start encounters in Balanced Stance","Reset active stance effects at the start of combat. An actor with no active stance effect is left alone.",true]
  ]) game.settings.register(ID,key,{name,hint,scope:"world",config:true,type:Boolean,default:value});
});
Hooks.once("setup",()=>{
  installCharacter();
  installCombat();
  installPresentation();
  installRosterPresentation();
  installSignatureActions();
  installHealing();
  installTraitEffects();
  installDeadlyElements();
  installManeuver();
  installAdvancedManipulation();
  installAnalyseFoe();
  installAwareness();
  installBendingAreas();
  game.modules.get(ID).api = Object.freeze({setup,changeStance,chooseStance,applyEffect,
    reviewMartial,reviewLatest,sustainBubble,heal,worldSettings,signatureAction,boostLowerTrait,deadlyElements,elementalManeuver,elementalProtection,areaProtection,elementalSurf,analyseFoe,awareness,resolveBendingArea});
});
Hooks.once("ready",()=>{
  // SWADE's alternate compendium view groups Actors by type and hides their folders.
  useRosterFolders();
  void migrateAvatarContent().then(initializeCharacters).catch(report);
});
