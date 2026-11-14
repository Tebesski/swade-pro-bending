export function martialOutcome({total,critical=false,targets=[],threatened=false,mode="targets",specialist=false,area=false}) {
  const activated = Number.isFinite(total) && total >= 4 && !critical;
  const results = targets.map(target => {
    const parry = target.engaged ? Math.max(4,Number(target.parry)||4) : 4;
    const opposed = Number.isFinite(target.opposed) ? Math.max(4,target.opposed) : 4;
    const hit = activated && total >= opposed && total + (specialist && target.engaged ? 2 : 0) >= parry;
    return {...target,parry,opposed,hit};
  });
  const vulnerable = threatened && !specialist && (area || mode === "area" || (mode !== "self" && targets.some(t=>!t.self&&!t.engaged)));
  return {activated,results,vulnerable};
}
export function treatmentOutcome(total, critical, mode) {
  if (critical) return {delta:mode==="mundane"?1:0, bonus:0, critical:true, success:false};
  const success = Number.isFinite(total) && total >= 4;
  const raised = success && total >= 8;
  return {delta:success && mode!=="recovery" ? (raised?-2:-1):0,bonus:success && mode==="recovery"?(raised?4:2):0,success,critical:false};
}
export const nextFatigue = (value,max=2) => value >= max ? {value,incapacitated:true} : {value:value+1,incapacitated:false};
