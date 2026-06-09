const {
  createDefaultSurvivors,
  normalizeConfig,
  normalizeSurvivors
} = require("../../utils/calculator");
const { readStore, updateStore } = require("../../utils/storage");

Page({
  data: {
    config: {},
    survivors: [],
    countOptions: [1, 2, 3, 4],
    countIndex: 3
  },

  onShow() {
    this.load();
  },

  load() {
    const store = readStore();
    this.setData({
      config: store.config,
      survivors: store.survivors,
      countIndex: Math.max(0, store.config.survivorCount - 1)
    });
  },

  changeCount(event) {
    const survivorCount = Number(this.data.countOptions[Number(event.detail.value)]);
    const config = normalizeConfig(Object.assign({}, this.data.config, { survivorCount }));
    const survivors = normalizeSurvivors(this.data.survivors, config);
    this.setData({
      config,
      survivors,
      countIndex: survivorCount - 1
    });
  },

  changeConfigNumber(event) {
    const key = event.currentTarget.dataset.key;
    const value = Number(event.detail.value);
    const config = Object.assign({}, this.data.config, {
      [key]: Number.isFinite(value) ? value : this.data.config[key]
    });
    this.setData({ config: normalizeConfig(config) });
  },

  changeSurvivorText(event) {
    const index = Number(event.currentTarget.dataset.index);
    const key = event.currentTarget.dataset.key;
    const survivors = this.data.survivors.map((survivor, itemIndex) => (
      itemIndex === index ? Object.assign({}, survivor, { [key]: event.detail.value }) : survivor
    ));
    this.setData({ survivors });
  },

  changeSurvivorNumber(event) {
    const index = Number(event.currentTarget.dataset.index);
    const key = event.currentTarget.dataset.key;
    const value = Number(event.detail.value);
    const survivors = this.data.survivors.map((survivor, itemIndex) => (
      itemIndex === index ? Object.assign({}, survivor, { [key]: Number.isFinite(value) ? value : survivor[key] }) : survivor
    ));
    this.setData({ survivors });
  },

  save() {
    const config = normalizeConfig(this.data.config);
    const survivors = normalizeSurvivors(this.data.survivors, config);
    updateStore({ config, survivors });
    wx.showToast({ title: "已保存", icon: "success" });
  },

  resetHealth() {
    const config = normalizeConfig(this.data.config);
    const survivors = normalizeSurvivors(this.data.survivors, config).map((survivor) => (
      Object.assign({}, survivor, { currentHealth: survivor.maxHealth })
    ));
    updateStore({ config, survivors });
    this.setData({ config, survivors });
    wx.showToast({ title: "血量已重置", icon: "success" });
  },

  clearReport() {
    updateStore({ report: [], nextQuestionNumber: 1 });
    wx.showToast({ title: "战报已清空", icon: "success" });
  },

  createDefaultTeam() {
    const config = normalizeConfig(this.data.config);
    const survivors = createDefaultSurvivors(config.survivorCount, config.defaultMaxHealth);
    this.setData({ survivors });
  }
});
