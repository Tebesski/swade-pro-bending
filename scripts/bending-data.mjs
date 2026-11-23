import {EFFECTS, ID, flag} from "./shared.mjs";
import {changeSignature} from "../../swade-better-effects/scripts/rules.mjs";

export const ELEMENTS = {fire:"Fire",water:"Water",earth:"Earth"};
const weaponKinds = {hurl:"Hurl",assault:"Assault"};
export const weaponKey = (element, kind, off) => `${element}-${kind}${off?"-off":""}`;
export const weaponName = (element, kind, off) => `${ELEMENTS[element]} ${weaponKinds[kind]}${off?" (Off-Hand)":""}`;
export const legacyWeaponName = (kind, off) => `Elemental ${weaponKinds[kind]}${off?" (Off Hand)":""}`;
export const weaponKit = element => Object.keys(weaponKinds).flatMap(kind=>[false,true].map(off=>weaponKey(element,kind,off)));
export const isElementalWeapon = item => item?.type==="weapon" &&
  (["hurl","assault"].includes(flag(item,"weapon")) ||
    /^(?:Elemental|Fire|Water|Earth) (?:Hurl|Assault)(?: \(Off[- ]Hand\))?$/i.test(item.name));
export const naturalWeaponUpdate = item => isElementalWeapon(item) &&
  (item.flags?.["swade-grid-inventory"]?.naturalWeapon!==true || item.flags?.["swade-grid-inventory"]?.placement)
  ? {"flags.swade-grid-inventory.naturalWeapon":true,"flags.swade-grid-inventory.placement":null} : null;

export function elementalPowerName(name, element) {
  if (!Object.hasOwn(ELEMENTS,element) || /\b(?:(?:fire|water|earth)(?:bending)?|air|ice|frost|flames?|lightning|lava|seismic)\b/i.test(name)) return name;
  return `${name} (${ELEMENTS[element]})`;
}

export function legacyWeaponUpdate(item, element) {
  const kind = flag(item,"weapon"), off = !!flag(item,"off");
  if (!Object.hasOwn(ELEMENTS,element) || !Object.hasOwn(weaponKinds,kind) || flag(item,"key")!==weaponKey("elemental",kind,off)) return;
  return {
    ...(item.name===legacyWeaponName(kind,off)?{name:weaponName(element,kind,off)}:{}),
    ...(item.system.swid===weaponKey("elemental",kind,off)?{"system.swid":weaponKey(element,kind,off)}:{}),
    [`flags.${ID}.key`]:weaponKey(element,kind,off),
    [`flags.${ID}.element`]:element,
    [`flags.${EFFECTS}.tags`]:[...new Set([...(item.flags?.[EFFECTS]?.tags ?? []),"elemental-weapon",`elemental-${kind}`,element])]
  };
}

export function weaponEffectUpdate(effect) {
  const source = typeof effect.toObject==="function" ? effect.toObject() : effect;
  const changes = source.system?.changes ?? [];
  const originalConditions = source.flags?.[EFFECTS]?.conditions;
  const conditions = [];
  let changed = false;
  const next = changes.flatMap((change,i)=>{
    const match = /^@Weapon\{Elemental (Hurl|Assault)( \(Off Hand\))?\}(\[.*\])$/.exec(change.key);
    const condition = originalConditions?.[i] ?? null;
    if (!match) {
      conditions.push(condition);
      return [change];
    }
    changed = true;
    return Object.keys(ELEMENTS).map(element=>{
      const key = `@Weapon{${weaponName(element,match[1].toLowerCase(),!!match[2])}}${match[3]}`;
      const replacement = {...change,key};
      conditions.push(condition?.signature===changeSignature(change) ? {...condition,signature:changeSignature(replacement)} : null);
      return replacement;
    });
  });
  if (changed) return {
    "system.changes":next,
    ...(originalConditions?{[`flags.${EFFECTS}.conditions`]:conditions}:{})
  };
}
