const assert = require("assert");
const {
  calculateStandardAnswers,
  createDefaultSurvivors,
  generateQuestion,
  judgeAnswers,
  normalizeConfig
} = require("../utils/calculator");

function byId(answers, id) {
  return answers.find((answer) => answer.id === id);
}

function testSameChargeShare() {
  const config = normalizeConfig({});
  const survivors = createDefaultSurvivors(4, 2);
  const answers = calculateStandardAnswers({
    config,
    survivors,
    targetId: "s1",
    attackType: "normal",
    charges: {
      s1: "red",
      s2: "red",
      s3: "blue",
      s4: "none"
    }
  });

  assert.strictEqual(byId(answers, "s1").health, 1.4);
  assert.strictEqual(byId(answers, "s2").health, 1.4);
  assert.strictEqual(byId(answers, "s3").health, 2);
  assert.strictEqual(byId(answers, "s4").health, 2);
}

function testNoChargeSoloDamage() {
  const config = normalizeConfig({});
  const survivors = createDefaultSurvivors(4, 2);
  const answers = calculateStandardAnswers({
    config,
    survivors,
    targetId: "s4",
    attackType: "normal",
    charges: {
      s1: "red",
      s2: "red",
      s3: "blue",
      s4: "none"
    }
  });

  assert.strictEqual(byId(answers, "s4").health, 0.8);
  assert.strictEqual(byId(answers, "s1").health, 2);
}

function testTerrorShockDownedClamp() {
  const config = normalizeConfig({});
  const survivors = createDefaultSurvivors(1, 2);
  const answers = calculateStandardAnswers({
    config,
    survivors,
    targetId: "s1",
    attackType: "terrorShock",
    charges: {
      s1: "none"
    }
  });

  assert.strictEqual(byId(answers, "s1").rawHealth, -0.2);
  assert.strictEqual(byId(answers, "s1").health, 0);
  assert.strictEqual(byId(answers, "s1").status, "downed");
}

function testJudgeAnswers() {
  const standardAnswers = [
    { id: "s1", name: "求生者1", health: 0, status: "downed" },
    { id: "s2", name: "求生者2", health: 1.4, status: "injured" }
  ];
  const result = judgeAnswers(standardAnswers, [
    { id: "s1", status: "downed", health: 0 },
    { id: "s2", status: "healthy", health: 1.4 }
  ], normalizeConfig({}));

  assert.strictEqual(result.correct, false);
  assert.strictEqual(result.details[0].correct, true);
  assert.strictEqual(result.details[1].healthCorrect, true);
  assert.strictEqual(result.details[1].statusCorrect, false);
}

function testGenerateQuestionBounds() {
  const randomValues = [0, 0.34, 0.68, 0.99, 0.25, 0.7];
  let index = 0;
  const question = generateQuestion({
    config: normalizeConfig({ survivorCount: 3 }),
    survivors: createDefaultSurvivors(3, 2),
    nextQuestionNumber: 7
  }, () => randomValues[index++ % randomValues.length]);

  assert.strictEqual(question.number, 7);
  assert.strictEqual(Object.keys(question.charges).length, 3);
  assert.ok(["s1", "s2", "s3"].includes(question.targetId));
  assert.ok(["normal", "terrorShock"].includes(question.attackType));
  assert.strictEqual(question.standardAnswers.length, 3);
}

testSameChargeShare();
testNoChargeSoloDamage();
testTerrorShockDownedClamp();
testJudgeAnswers();
testGenerateQuestionBounds();

console.log("calculator tests passed");
