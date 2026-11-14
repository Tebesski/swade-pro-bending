import assert from "node:assert/strict";
import test from "node:test";
import {martialOutcome, nextFatigue, treatmentOutcome} from "../scripts/rules.mjs";

test("a technique can activate while missing Parry; specialist +2 only offsets Parry",()=>{
  const targets=[{engaged:true,parry:7},{engaged:true,parry:7,opposed:6}];
  const cast={targets,threatened:true,total:5};
  assert.deepEqual(martialOutcome(cast).results.map(t=>t.hit),[false,false]);
  assert.equal(martialOutcome(cast).activated,true);
  assert.deepEqual(martialOutcome({...cast,specialist:true}).results.map(t=>t.hit),[true,false]);
  assert.equal(martialOutcome({...cast,critical:true}).activated,false);
});

test("Vulnerability uses the declared recipients and applies even on failure",()=>{
  const cast={total:2,threatened:true};
  assert.equal(martialOutcome({...cast,mode:"self"}).vulnerable,false);
  assert.equal(martialOutcome({...cast,mode:"area"}).vulnerable,true);
  assert.equal(martialOutcome({...cast,targets:[{engaged:true},{self:true}]}).vulnerable,false);
  assert.equal(martialOutcome({...cast,targets:[{engaged:true},{engaged:false}]}).vulnerable,true);
  assert.equal(martialOutcome({...cast,mode:"area",specialist:true}).vulnerable,false);
});

test("healing, recovery and Backlash distinguish raises and critical failures",()=>{
  assert.equal(treatmentOutcome(8,false,"mundane").delta,-2);
  assert.equal(treatmentOutcome(1,true,"mundane").delta,1);
  assert.equal(treatmentOutcome(1,true,"water").delta,0);
  assert.equal(treatmentOutcome(8,false,"recovery").bonus,4);
  assert.equal(treatmentOutcome(7,false,"recovery").bonus,2);
  assert.deepEqual(nextFatigue(1),{value:2,incapacitated:false});
  assert.deepEqual(nextFatigue(2),{value:2,incapacitated:true});
});
