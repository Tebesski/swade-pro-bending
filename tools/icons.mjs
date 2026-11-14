import {existsSync} from "node:fs";
import {resolve} from "node:path";

const root = resolve(process.env.FOUNDRY_APP ?? "C:/Program Files/Foundry Virtual Tabletop/resources/app", "public");
const element = {
  earth: "magic/earth/projectile-boulder-debris.webp",
  fire: "svg/fire.svg",
  water: "magic/water/water-drop-swirl-blue.webp"
};
const attacks = {
  fire: ["magic/fire/projectile-fireball-sparks-orange.webp","magic/fire/flame-burning-fist-strike.webp"],
  water: ["magic/water/projectile-water-wave-teal.webp","magic/water/water-hand.webp"],
  earth: ["magic/earth/projectile-boulder-yellow.webp","magic/earth/strike-fist-stone.webp"]
};
const weaponIcons = Object.fromEntries(Object.entries(attacks).flatMap(([element,[hurl,assault]])=>
  [[`${element}-hurl`,hurl],[`${element}-hurl-off`,hurl],[`${element}-assault`,assault],[`${element}-assault-off`,assault]]));

const techniques = {
  knacks:"magic/holy/meditation-chi-focus-blue.webp", "basic-elemental-manipulation":"magic/symbols/elements-air-earth-fire-water.webp",
  "advanced-elemental-manipulation":"magic/air/wind-vortex-swirl-purple.webp", "elemental-maneuver":"svg/thrust.svg",
  "deadly-elements":"magic/control/buff-strength-muscle-damage-orange.webp", "analyse-foe":"magic/perception/hand-eye-pink.webp",
  barrier:"magic/earth/barrier-stone-brown-green.webp", awareness:"magic/perception/third-eye-blue-red.webp", relief:"svg/regen.svg",
  "boost-lower-trait":"svg/upgrade.svg", blind:"svg/blind.svg", "manipulate-emotions":"magic/control/control-influence-puppet.webp",
  impede:"environment/wilderness/terrain-rocky-ground.webp", launch:"svg/jump.svg", tremor:"magic/earth/projectile-stone-landslide.webp",
  havoc:"magic/earth/barrier-stone-explosion-debris.webp", jet:"magic/water/water-jet-wave-blue.webp",
  "detect-conceal-chi":"magic/perception/orb-eye-scrying.webp", "elemental-vortex":"magic/air/wind-vortex-swirl-blue.webp",
  blast:"svg/explosion.svg", "elemental-tunnel":"svg/burrow.svg", burst:"magic/sonic/explosion-shock-wave-teal.webp",
  "damage-field":"svg/aura.svg", quicken:"skills/movement/figure-running-gray.webp", veil:"svg/invisible.svg",
  "elemental-barrage":"magic/earth/projectiles-stone-salvo.webp", "advanced-earth-manipulation":"magic/earth/construct-stone.webp",
  "earth-shelter":"environment/wilderness/cave-entrance-rocky.webp", "seismic-sense":"magic/perception/mask-stone-eyes-orange.webp",
  "earth-armour":"svg/stoned.svg", "earth-entangle":"magic/earth/barrier-stone-explosion-spiked.webp", shield:"svg/mage-shield.svg",
  "earth-move":"magic/earth/projectile-boulder-dust.webp", "fan-the-flames":"svg/fire-shield.svg", healing:"svg/heal.svg",
  "accelerated-recovery":"svg/regen.svg", paralysis:"svg/paralysis.svg", "water-shelter":"magic/water/barrier-ice-wall-snow.webp",
  "water-armour":"svg/ice-shield.svg", "water-entangle":"magic/water/tendrils-ice-growth.webp",
  "water-bubble":"magic/water/orb-water-bubbles-blue.webp", banish:"svg/portal.svg", "water-move":"magic/water/wave-water-rolling-blue.webp"
};

const edges = {
  berserk:"magic/control/buff-strength-muscle-damage-red.webp", "experienced-healer":"svg/heal.svg", "shadow-training":"magic/perception/shadow-stealth-eyes-purple.webp",
  companion:"svg/pawprint.svg", "faith-s-favoured":"magic/control/buff-luck-fortune-gold.webp", "lightning-reflexes":"svg/lightning.svg",
  "bending-mastery":"svg/upgrade.svg", "epic-bending":"magic/symbols/elements-air-earth-fire-water.webp",
  "channeling-mastery":"svg/clockwork.svg", "concentration-mastery":"magic/holy/meditation-chi-focus-blue.webp",
  "careful-bending":"svg/mage-shield.svg", "extra-effort":"magic/control/buff-strength-muscle-damage-orange.webp",
  "chakra-drain":"svg/blood.svg", "elemental-crush":"magic/earth/strike-fist-stone-light.webp",
  "chakra-overflow":"svg/aura.svg", "efficient-bending":"svg/wingfoot.svg", "rock-gloves":"magic/earth/strike-fist-stone-gray.webp",
  "attack-is-the-best-defense":"skills/melee/shield-block-fire-orange.webp", "sweeping-techniques":"skills/melee/strike-slashes-orange.webp",
  "explosive-bending":"svg/explosion.svg", "ice-claws":"magic/water/strike-ice-blades.webp", "leg-work":"svg/leg.svg",
  "deadly-hurl":"magic/earth/projectile-boulder-yellow.webp", "fatal-hurl":"magic/earth/projectile-moonrock-asteroid.webp",
  "deadly-assault":"magic/earth/strike-fist-stone.webp", "close-combat-specialist":"svg/combat.svg", "fluid-stance":"svg/waterfall.svg",
  "elemental-onslaught":"magic/earth/projectiles-stone-salvo.webp", "forceful-elements":"magic/sonic/explosion-impact-shock-wave.webp",
  "pummeling-strikes":"svg/daze.svg", "mountain-stance":"svg/mountain.svg", "unleash-elements":"svg/fire-shield.svg",
  "hampering-stance":"svg/net.svg", "turtle-shell":"svg/shield.svg", "dancing-stance":"skills/movement/figure-running-gray.webp",
  "redirect-energy":"svg/direction.svg", "bending-parry-and-riposte":"skills/melee/sword-shield-stylized-white.webp",
  "dampening-parry":"svg/holy-shield.svg", "reflecting-parry":"svg/thrust.svg", "additional-techniques":"svg/book.svg",
  sandbending:"environment/wilderness/terrain-rocks-brown.webp", metalbending:"svg/door-steel.svg",
  glassbending:"magic/water/projectile-ice-faceted-teal.webp", crystalbending:"magic/water/barrier-ice-crystal-wall-faceted-blue.webp",
  lavabending:"magic/earth/orb-lava-orange.webp", pigmentbending:"magic/control/buff-luck-fortune-rainbow.webp",
  mudbending:"magic/earth/barrier-stone-brown-green.webp", lightningbending:"svg/lightning.svg",
  heatbending:"magic/earth/lava-stone-fire-yellow.webp", combustionbending:"magic/earth/explosion-lava-stone-orange.webp",
  plasmabending:"magic/earth/volcano-explosion-lava-teal.webp", "blue-flames":"magic/perception/hand-eye-fire-blue.webp",
  plantbending:"skills/trades/farming-plant-seedling-gray.webp", bloodbending:"svg/blood.svg",
  spiritbending:"svg/angel.svg", icebending:"magic/water/ice-crystal-white.webp"
};

const skills = {
  athletics:"svg/jump.svg", eloquence:"svg/sound.svg", intimidation:"svg/terror.svg", science:"svg/biohazard.svg",
  academics:"skills/trades/academics-book-study-purple.webp", riding:"svg/pawprint.svg", boating:"svg/anchor.svg",
  knowledge:"skills/trades/academics-book-study-runes.webp", notice:"svg/eye.svg", performance:"skills/trades/music-singing-voice-blue.webp",
  healing:"svg/heal.svg", "sleight-of-hand":"svg/card-hand.svg", shooting:"svg/target.svg", stealth:"svg/invisible.svg",
  survival:"environment/wilderness/camp-improvised.webp", vehicles:"svg/clockwork.svg", fighting:"svg/combat.svg",
  "common-knowledge":"svg/village.svg", language:"skills/trades/academics-study-reading-book.webp", workshop:"svg/lever.svg",
  bending:"magic/symbols/elements-air-earth-fire-water.webp"
};

const effects = {
  backlash:"svg/hazard.svg", martial:"svg/target.svg", legs:edges["leg-work"], onslaught:edges["elemental-onslaught"],
  cold:"magic/water/snowflake-ice-blue.webp", movement:"svg/stoned.svg", turtle:edges["turtle-shell"], unleash:edges["unleash-elements"],
  berserk:edges.berserk, deadly:techniques["deadly-elements"], "deadly-raise":"svg/explosion.svg",
  "earth-armour":techniques["earth-armour"], "earth-armour-raise":"magic/earth/construct-stone.webp",
  "ice-armour":techniques["water-armour"], "ice-armour-raise":"magic/water/barrier-ice-shield.webp",
  havoc:"svg/daze.svg", numb:"svg/pill.svg", "numb-raise":"svg/regen.svg", vortex:techniques["elemental-vortex"],
  paralysis:techniques.paralysis, quicken:techniques.quicken, "quicken-raise":"svg/wingfoot.svg",
  "forced-movement":"svg/direction.svg", hampering:"svg/net.svg"
};

const icons = {
  techniques, edges, effects,
  backgrounds: {earthbending:element.earth,firebending:element.fire,waterbending:element.water},
  nations: {"earth-kingdom":"svg/mountain.svg","fire-nation":"svg/temple.svg","water-tribe":"magic/water/ice-crystal-white.webp",
    "swamp-people":"environment/wilderness/terrain-forest-gray.webp",republican:"svg/city.svg"},
  stances: {defensive:"skills/melee/shield-block-gray-yellow.webp",balanced:"skills/social/trading-justice-scale-gold.webp",offensive:"svg/combat.svg"},
  "bending-kit": {...skills,...weaponIcons},
  macros: {setup:"svg/tower-flag.svg",stance:"skills/social/trading-justice-scale-gold.webp",martial:"svg/target.svg",
    "sustain-bubble":"magic/water/orb-water-bubbles-blue.webp","mundane-healing":"svg/heal.svg","water-healing":"magic/water/water-hand.webp",
    "accelerated-recovery":"svg/regen.svg","world-settings":"svg/clockwork.svg"}
};

export function iconFor(pack, key) {
  const file = icons[pack]?.[key];
  if (!file) throw new Error(`Assign a Foundry icon for ${pack}/${key}.`);
  const path = `icons/${file}`;
  if (!existsSync(resolve(root, path))) throw new Error(`Foundry icon does not exist: ${path}`);
  return path;
}
