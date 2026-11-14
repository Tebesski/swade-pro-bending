const paths = {
  armor:"system.stats.toughness.armor", toughness:"system.stats.toughness.value", "outgoing-damage":"system.stats.globalMods.damage",
  "incoming-damage":"system.stats.globalMods.targetDamage", map:"sbe.map"
};

function rulePath(selector) {
  if (paths[selector]) return paths[selector];
  const [kind, name] = selector.split(":");
  switch (kind) {
    case "global": return `system.stats.globalMods.${name}`;
    case "target-roll": return `sbe.targetRoll.${name}`;
    case "power-roll": return `sbe.powerRoll.${name}`;
    case "attribute": return `system.attributes.${name}.die.modifier`;
    case "skill": return `@Skill{${name}}[system.die.modifier]`;
    default: throw new Error(`Unsupported Better Effects rule: ${selector}`);
  }
}

export function effectChanges(nativeChanges, rules) {
  const changes = [...nativeChanges];
  const conditions = nativeChanges.map(() => null);
  for (const {selector, type, value, predicate} of rules) {
    // Native changes without a predicate still belong in A.E.G.I.S. Special Better
    // Effects paths always run through its resolver even with an empty predicate.
    const change = {key:rulePath(selector), type, value:String(value), phase:"initial", priority:null};
    changes.push(change);
    conditions.push({signature:JSON.stringify([change.key, change.type, change.value, change.phase, change.priority]), predicate});
  }
  return {system:{changes}, conditions};
}
