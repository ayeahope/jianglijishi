const {
  applyStandardAnswers,
  generateQuestion,
  getAttackLabel,
  getChargeLabel,
  getStatusLabel,
  judgeAnswers,
  normalizeConfig,
  normalizeSurvivors
} = require("../../utils/calculator");
const { readStore, updateStore } = require("../../utils/storage");

Page({
  data: {
    config: {},
    survivors: [],
    currentQuestion: null,
    answers: [],
    result: null,
    survivorCards: [],
    answerRows: [],
    statusOptions: [
      { key: "healthy", label: "无伤" },
      { key: "injured", label: "受伤" },
      { key: "downed", label: "倒地" }
    ],
    attackLabel: "",
    targetName: ""
  },

  onShow() {
    const store = readStore();
    this.setData({
      config: store.config,
      survivors: store.survivors,
      currentQuestion: null,
      answers: [],
      result: null
    });
    this.refreshView();
  },

  createQuestion() {
    const store = readStore();
    const config = normalizeConfig(store.config);
    const survivors = normalizeSurvivors(store.survivors, config);
    const question = generateQuestion({
      config,
      survivors,
      nextQuestionNumber: store.nextQuestionNumber
    });
    const answers = question.standardAnswers.map((answer) => ({
      id: answer.id,
      name: answer.name,
      status: "",
      health: ""
    }));

    this.setData({
      config,
      survivors,
      currentQuestion: question,
      answers,
      result: null
    });
    this.refreshView();
  },

  selectStatus(event) {
    const id = event.currentTarget.dataset.id;
    const status = event.currentTarget.dataset.status;
    const answers = this.data.answers.map((answer) => (
      answer.id === id ? Object.assign({}, answer, { status }) : answer
    ));
    this.setData({ answers });
    this.refreshView();
  },

  changeHealth(event) {
    const id = event.currentTarget.dataset.id;
    const health = event.detail.value;
    const answers = this.data.answers.map((answer) => (
      answer.id === id ? Object.assign({}, answer, { health }) : answer
    ));
    this.setData({ answers });
    this.refreshView();
  },

  submitAnswer() {
    if (!this.data.currentQuestion) {
      wx.showToast({ title: "请先出题", icon: "none" });
      return;
    }
    if (this.data.result) {
      wx.showToast({ title: "请先换下一题", icon: "none" });
      return;
    }

    const missing = this.data.answers.some((answer) => !answer.status || answer.health === "");
    if (missing) {
      wx.showToast({ title: "请填完所有状态和血量", icon: "none" });
      return;
    }

    const result = judgeAnswers(
      this.data.currentQuestion.standardAnswers,
      this.data.answers,
      this.data.config
    );
    const updatedSurvivors = applyStandardAnswers(
      this.data.survivors,
      this.data.currentQuestion.standardAnswers
    );
    const store = readStore();
    const reportItem = {
      id: `${this.data.currentQuestion.id}-${store.report.length + 1}`,
      question: this.data.currentQuestion,
      userAnswers: this.data.answers,
      result,
      createdAt: new Date().toISOString()
    };

    updateStore({
      survivors: updatedSurvivors,
      report: [reportItem].concat(store.report || []),
      nextQuestionNumber: (store.nextQuestionNumber || 1) + 1
    });

    this.setData({
      survivors: updatedSurvivors,
      result
    });
    this.refreshView();
  },

  goConfig() {
    wx.switchTab({ url: "/pages/config/config" });
  },

  goReport() {
    wx.switchTab({ url: "/pages/report/report" });
  },

  refreshView() {
    const question = this.data.currentQuestion;
    const result = this.data.result;
    const detailsById = {};
    if (result && result.details) {
      result.details.forEach((detail) => {
        detailsById[detail.id] = detail;
      });
    }

    const survivorCards = this.data.survivors.map((survivor) => {
      const charge = question ? question.charges[survivor.id] : "none";
      const detail = detailsById[survivor.id];
      const status = question && !result ? "question" : (detail ? detail.standard.status : survivor.currentHealth > 0 ? "healthy" : "downed");
      const displayStatus = question && !result ? "?" : getStatusLabel(status);
      const displayHealth = question && !result ? "?" : (detail ? detail.standard.health.toFixed(1) : Number(survivor.currentHealth).toFixed(1));

      return {
        id: survivor.id,
        name: survivor.name,
        role: survivor.role,
        chargeLabel: question ? getChargeLabel(charge) : "待随机",
        chargeClass: question ? `pill-${charge}` : "pill-none",
        displayStatus,
        displayHealth,
        statusClass: `status-${status}`,
        resultClass: detail ? (detail.correct ? "correct" : "wrong") : "",
        resultText: detail
          ? `${detail.correct ? "正确" : "错误"}：你答 ${getStatusLabel(detail.user.status)} ${detail.user.health.toFixed(1)}，答案 ${getStatusLabel(detail.standard.status)} ${detail.standard.health.toFixed(1)}`
          : ""
      };
    });

    const answerRows = this.data.answers.map((answer) => ({
      id: answer.id,
      name: answer.name,
      status: answer.status,
      health: answer.health
    }));
    const target = question && this.data.survivors.find((survivor) => survivor.id === question.targetId);

    this.setData({
      survivorCards,
      answerRows,
      targetName: target ? target.name : "",
      attackLabel: question ? getAttackLabel(question.attackType) : ""
    });
  }
});
