const {
  getAttackLabel,
  getChargeLabel,
  getStatusLabel
} = require("../../utils/calculator");
const { readStore } = require("../../utils/storage");

Page({
  data: {
    items: []
  },

  onShow() {
    const store = readStore();
    const items = (store.report || []).map((report) => {
      const question = report.question || {};
      const details = report.result && report.result.details ? report.result.details : [];
      const target = details.find((detail) => detail.id === question.targetId);
      const rows = details.map((detail) => ({
        id: detail.id,
        name: detail.name,
        chargeLabel: getChargeLabel(question.charges && question.charges[detail.id]),
        userStatus: getStatusLabel(detail.user.status),
        userHealth: Number(detail.user.health).toFixed(1),
        standardStatus: getStatusLabel(detail.standard.status),
        standardHealth: Number(detail.standard.health).toFixed(1),
        correct: detail.correct
      }));

      return {
        id: report.id,
        number: question.number,
        targetName: target ? target.name : "未知目标",
        attackLabel: getAttackLabel(question.attackType),
        correct: report.result && report.result.correct,
        summary: rows.map((row) => `${row.name}${row.chargeLabel}`).join(" / "),
        rows
      };
    });

    this.setData({ items });
  }
});
