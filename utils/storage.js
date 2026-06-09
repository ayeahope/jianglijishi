const {
  DEFAULT_CONFIG,
  createDefaultSurvivors,
  normalizeConfig,
  normalizeSurvivors
} = require("./calculator");

const STORE_KEY = "hermitPracticeStore";

function getFallbackStore() {
  const config = normalizeConfig(DEFAULT_CONFIG);
  return {
    config,
    survivors: createDefaultSurvivors(config.survivorCount, config.defaultMaxHealth),
    report: [],
    nextQuestionNumber: 1
  };
}

function readStore() {
  if (typeof wx === "undefined") return getFallbackStore();
  const stored = wx.getStorageSync(STORE_KEY);
  if (!stored) return getFallbackStore();

  const config = normalizeConfig(stored.config);
  return {
    config,
    survivors: normalizeSurvivors(stored.survivors, config),
    report: Array.isArray(stored.report) ? stored.report : [],
    nextQuestionNumber: stored.nextQuestionNumber || 1
  };
}

function writeStore(store) {
  if (typeof wx === "undefined") return store;
  const config = normalizeConfig(store && store.config);
  const normalized = {
    config,
    survivors: normalizeSurvivors(store && store.survivors, config),
    report: Array.isArray(store && store.report) ? store.report : [],
    nextQuestionNumber: store && store.nextQuestionNumber ? store.nextQuestionNumber : 1
  };
  wx.setStorageSync(STORE_KEY, normalized);
  return normalized;
}

function ensureStore() {
  const store = readStore();
  writeStore(store);
  return store;
}

function updateStore(patch) {
  const current = readStore();
  return writeStore(Object.assign({}, current, patch || {}));
}

function resetStore() {
  const fresh = getFallbackStore();
  writeStore(fresh);
  return fresh;
}

module.exports = {
  STORE_KEY,
  ensureStore,
  getFallbackStore,
  readStore,
  resetStore,
  updateStore,
  writeStore
};
