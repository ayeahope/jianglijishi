const CHARGE_STATES = ["red", "blue", "none"];
const ATTACK_TYPES = ["normal", "terrorShock"];

const DEFAULT_CONFIG = {
  survivorCount: 4,
  normalDamage: 1.2,
  terrorShockDamage: 2.2,
  healthStep: 0.1,
  defaultMaxHealth: 2,
  statusIcons: [
    { key: "healthy", label: "无伤", minExclusive: 1 },
    { key: "injured", label: "受伤", minExclusive: 0 },
    { key: "downed", label: "倒地", minExclusive: null }
  ]
};

function clampSurvivorCount(count) {
  const parsed = Number(count);
  if (!Number.isFinite(parsed)) return DEFAULT_CONFIG.survivorCount;
  return Math.min(4, Math.max(1, Math.round(parsed)));
}

function roundToStep(value, step) {
  const safeStep = Number(step) > 0 ? Number(step) : DEFAULT_CONFIG.healthStep;
  return Number((Math.round((Number(value) || 0) / safeStep) * safeStep).toFixed(2));
}

function displayHealth(value, step) {
  return Math.max(0, roundToStep(value, step));
}

function healthToStatus(health) {
  if (health <= 0) return "downed";
  if (health >= 2) return "healthy";
  return "injured";
}

function createDefaultSurvivors(count, maxHealth) {
  const safeCount = clampSurvivorCount(count);
  const safeHealth = Number(maxHealth) > 0 ? Number(maxHealth) : DEFAULT_CONFIG.defaultMaxHealth;
  return Array.from({ length: safeCount }, (_, index) => ({
    id: `s${index + 1}`,
    name: `求生者${index + 1}`,
    role: "普通求生者",
    active: true,
    maxHealth: safeHealth,
    currentHealth: safeHealth
  }));
}

function normalizeConfig(config) {
  const merged = Object.assign({}, DEFAULT_CONFIG, config || {});
  merged.survivorCount = clampSurvivorCount(merged.survivorCount);
  merged.normalDamage = Number(merged.normalDamage) || DEFAULT_CONFIG.normalDamage;
  merged.terrorShockDamage = Number(merged.terrorShockDamage) || DEFAULT_CONFIG.terrorShockDamage;
  merged.healthStep = Number(merged.healthStep) > 0 ? Number(merged.healthStep) : DEFAULT_CONFIG.healthStep;
  merged.defaultMaxHealth = Number(merged.defaultMaxHealth) > 0 ? Number(merged.defaultMaxHealth) : DEFAULT_CONFIG.defaultMaxHealth;
  return merged;
}

function normalizeSurvivors(survivors, config) {
  const safeConfig = normalizeConfig(config);
  const source = Array.isArray(survivors) && survivors.length
    ? survivors.slice(0, safeConfig.survivorCount)
    : createDefaultSurvivors(safeConfig.survivorCount, safeConfig.defaultMaxHealth);

  while (source.length < safeConfig.survivorCount) {
    source.push(createDefaultSurvivors(source.length + 1, safeConfig.defaultMaxHealth)[source.length]);
  }

  return source.map((survivor, index) => {
    const maxHealth = Number(survivor.maxHealth) > 0 ? Number(survivor.maxHealth) : safeConfig.defaultMaxHealth;
    const currentHealth = Number.isFinite(Number(survivor.currentHealth))
      ? displayHealth(Number(survivor.currentHealth), safeConfig.healthStep)
      : maxHealth;

    return {
      id: survivor.id || `s${index + 1}`,
      name: survivor.name || `求生者${index + 1}`,
      role: survivor.role || "普通求生者",
      active: survivor.active !== false,
      maxHealth,
      currentHealth
    };
  });
}

function getAttackDamage(attackType, config) {
  const safeConfig = normalizeConfig(config);
  return attackType === "terrorShock" ? safeConfig.terrorShockDamage : safeConfig.normalDamage;
}

function randomFrom(items, random) {
  return items[Math.floor(random() * items.length)];
}

function generateQuestion(state, random) {
  const safeRandom = typeof random === "function" ? random : Math.random;
  const config = normalizeConfig(state && state.config);
  const survivors = normalizeSurvivors(state && state.survivors, config).filter((survivor) => survivor.active);
  const charges = {};

  survivors.forEach((survivor) => {
    charges[survivor.id] = randomFrom(CHARGE_STATES, safeRandom);
  });

  const target = randomFrom(survivors, safeRandom);
  const attackType = randomFrom(ATTACK_TYPES, safeRandom);
  const before = survivors.map((survivor) => ({
    id: survivor.id,
    name: survivor.name,
    health: displayHealth(survivor.currentHealth, config.healthStep),
    status: healthToStatus(displayHealth(survivor.currentHealth, config.healthStep))
  }));
  const question = {
    id: Date.now(),
    number: state && state.nextQuestionNumber ? state.nextQuestionNumber : 1,
    before,
    charges,
    targetId: target.id,
    attackType,
    standardAnswers: []
  };

  question.standardAnswers = calculateStandardAnswers({
    survivors,
    charges,
    targetId: target.id,
    attackType,
    config
  });

  return question;
}

function calculateStandardAnswers(input) {
  const config = normalizeConfig(input && input.config);
  const survivors = normalizeSurvivors(input && input.survivors, config).filter((survivor) => survivor.active);
  const charges = input && input.charges ? input.charges : {};
  const targetId = input && input.targetId;
  const attackType = input && input.attackType;
  const targetCharge = charges[targetId] || "none";
  const damage = getAttackDamage(attackType, config);
  const participantIds = targetCharge === "none"
    ? [targetId]
    : survivors.filter((survivor) => charges[survivor.id] === targetCharge).map((survivor) => survivor.id);
  const share = participantIds.length ? damage / participantIds.length : damage;

  return survivors.map((survivor) => {
    const rawHealth = participantIds.indexOf(survivor.id) >= 0
      ? Number(survivor.currentHealth) - share
      : Number(survivor.currentHealth);
    const health = displayHealth(rawHealth, config.healthStep);

    return {
      id: survivor.id,
      name: survivor.name,
      rawHealth: Number(rawHealth.toFixed(4)),
      health,
      status: healthToStatus(health),
      delta: Number((health - displayHealth(survivor.currentHealth, config.healthStep)).toFixed(2))
    };
  });
}

function normalizeAnswer(answer, step) {
  return {
    status: answer && answer.status ? answer.status : "",
    health: displayHealth(answer && answer.health, step)
  };
}

function judgeAnswers(standardAnswers, userAnswers, config) {
  const safeConfig = normalizeConfig(config);
  const answersById = {};
  (userAnswers || []).forEach((answer) => {
    answersById[answer.id] = normalizeAnswer(answer, safeConfig.healthStep);
  });

  const details = (standardAnswers || []).map((standard) => {
    const user = answersById[standard.id] || { status: "", health: NaN };
    const healthCorrect = Number(user.health) === Number(standard.health);
    const statusCorrect = user.status === standard.status;

    return {
      id: standard.id,
      name: standard.name,
      user,
      standard,
      healthCorrect,
      statusCorrect,
      correct: healthCorrect && statusCorrect
    };
  });

  return {
    correct: details.every((item) => item.correct),
    details
  };
}

function applyStandardAnswers(survivors, standardAnswers) {
  const healthById = {};
  (standardAnswers || []).forEach((answer) => {
    healthById[answer.id] = answer.health;
  });

  return (survivors || []).map((survivor) => {
    if (Object.prototype.hasOwnProperty.call(healthById, survivor.id)) {
      return Object.assign({}, survivor, { currentHealth: healthById[survivor.id] });
    }
    return survivor;
  });
}

function getChargeLabel(charge) {
  if (charge === "red") return "红电";
  if (charge === "blue") return "蓝电";
  return "无电";
}

function getAttackLabel(attackType) {
  return attackType === "terrorShock" ? "震慑" : "普攻";
}

function getStatusLabel(status) {
  if (status === "healthy") return "无伤";
  if (status === "injured") return "受伤";
  if (status === "downed") return "倒地";
  return "未选";
}

const HermitCalculator = {
  ATTACK_TYPES,
  CHARGE_STATES,
  DEFAULT_CONFIG,
  applyStandardAnswers,
  calculateStandardAnswers,
  clampSurvivorCount,
  createDefaultSurvivors,
  displayHealth,
  generateQuestion,
  getAttackDamage,
  getAttackLabel,
  getChargeLabel,
  getStatusLabel,
  healthToStatus,
  judgeAnswers,
  normalizeConfig,
  normalizeSurvivors,
  roundToStep
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = HermitCalculator;
} else if (typeof window !== "undefined") {
  window.HermitCalculator = HermitCalculator;
}
