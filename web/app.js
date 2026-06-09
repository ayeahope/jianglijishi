(function () {
  const calc = window.HermitCalculator;
  const STORE_KEY = "hermitPracticeWebStore";
  const statusOptions = [
    { key: "healthy", label: "无伤" },
    { key: "injured", label: "受伤" },
    { key: "downed", label: "倒地" }
  ];

  const els = {
    tabs: document.querySelectorAll(".tab"),
    views: document.querySelectorAll(".view"),
    survivorGrid: document.getElementById("survivorGrid"),
    answerSheet: document.getElementById("answerSheet"),
    answerRows: document.getElementById("answerRows"),
    answerProgress: document.getElementById("answerProgress"),
    questionNumber: document.getElementById("questionNumber"),
    attackPrompt: document.getElementById("attackPrompt"),
    promptHint: document.getElementById("promptHint"),
    newQuestionBtn: document.getElementById("newQuestionBtn"),
    submitAnswerBtn: document.getElementById("submitAnswerBtn"),
    reportList: document.getElementById("reportList"),
    clearReportBtn: document.getElementById("clearReportBtn"),
    resetHealthBtn: document.getElementById("resetHealthBtn"),
    saveConfigBtn: document.getElementById("saveConfigBtn"),
    survivorCountInput: document.getElementById("survivorCountInput"),
    normalDamageInput: document.getElementById("normalDamageInput"),
    terrorShockDamageInput: document.getElementById("terrorShockDamageInput"),
    healthStepInput: document.getElementById("healthStepInput"),
    defaultMaxHealthInput: document.getElementById("defaultMaxHealthInput"),
    teamConfig: document.getElementById("teamConfig")
  };

  let state = loadStore();

  function loadStore() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE_KEY));
      if (stored) {
        const config = calc.normalizeConfig(stored.config);
        return {
          config,
          survivors: calc.normalizeSurvivors(stored.survivors, config),
          report: Array.isArray(stored.report) ? stored.report : [],
          nextQuestionNumber: stored.nextQuestionNumber || 1,
          currentQuestion: null,
          answers: [],
          result: null
        };
      }
    } catch (error) {
      console.warn("Failed to load local store", error);
    }

    const config = calc.normalizeConfig(calc.DEFAULT_CONFIG);
    return {
      config,
      survivors: calc.createDefaultSurvivors(config.survivorCount, config.defaultMaxHealth),
      report: [],
      nextQuestionNumber: 1,
      currentQuestion: null,
      answers: [],
      result: null
    };
  }

  function saveStore() {
    const snapshot = {
      config: state.config,
      survivors: state.survivors,
      report: state.report,
      nextQuestionNumber: state.nextQuestionNumber
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
  }

  function setView(viewName) {
    els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
    els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
    if (viewName === "report") renderReport();
    if (viewName === "config") renderConfig();
  }

  function makeQuestion() {
    state.currentQuestion = calc.generateQuestion({
      config: state.config,
      survivors: state.survivors,
      nextQuestionNumber: state.nextQuestionNumber
    });
    state.answers = state.currentQuestion.standardAnswers.map((answer) => ({
      id: answer.id,
      name: answer.name,
      status: "",
      health: ""
    }));
    state.result = null;
    render();
  }

  function submitAnswer() {
    if (!state.currentQuestion) return;
    if (state.result) {
      alert("请先换下一题。");
      return;
    }
    if (state.answers.some((answer) => !answer.status || answer.health === "")) {
      alert("请填完所有状态和血量。");
      return;
    }

    state.result = calc.judgeAnswers(
      state.currentQuestion.standardAnswers,
      state.answers,
      state.config
    );
    state.survivors = calc.applyStandardAnswers(state.survivors, state.currentQuestion.standardAnswers);
    state.report.unshift({
      id: `${state.currentQuestion.id}-${state.report.length + 1}`,
      question: state.currentQuestion,
      userAnswers: state.answers,
      result: state.result,
      createdAt: new Date().toISOString()
    });
    state.nextQuestionNumber += 1;
    saveStore();
    render();
  }

  function render() {
    renderPrompt();
    renderSurvivors();
    renderAnswers();
  }

  function renderPrompt() {
    const question = state.currentQuestion;
    if (!question) {
      els.questionNumber.textContent = "准备开始";
      els.attackPrompt.textContent = `当前队伍 ${state.survivors.length} 人`;
      els.promptHint.textContent = "点击出题后，系统会隐藏结算结果。";
      els.newQuestionBtn.textContent = "开始出题";
      return;
    }

    const target = state.survivors.find((survivor) => survivor.id === question.targetId);
    els.questionNumber.textContent = `第 ${question.number} 题`;
    els.attackPrompt.textContent = `${target ? target.name : "未知目标"} 将受到 ${calc.getAttackLabel(question.attackType)}`;
    els.promptHint.textContent = "先根据电荷和伤害心算，再填写每名求生者的结果。";
    els.newQuestionBtn.textContent = "换一题";
  }

  function renderSurvivors() {
    const detailsById = {};
    if (state.result) {
      state.result.details.forEach((detail) => {
        detailsById[detail.id] = detail;
      });
    }

    els.survivorGrid.innerHTML = state.survivors.map((survivor) => {
      const question = state.currentQuestion;
      const detail = detailsById[survivor.id];
      const charge = question ? question.charges[survivor.id] : "none";
      const status = question && !state.result
        ? "question"
        : detail
          ? detail.standard.status
          : calc.healthToStatus(Number(survivor.currentHealth));
      const displayStatus = question && !state.result ? "?" : calc.getStatusLabel(status);
      const displayHealth = question && !state.result
        ? "?"
        : Number(detail ? detail.standard.health : survivor.currentHealth).toFixed(1);
      const resultText = detail
        ? `${detail.correct ? "正确" : "错误"}：你答 ${calc.getStatusLabel(detail.user.status)} ${Number(detail.user.health).toFixed(1)}，答案 ${calc.getStatusLabel(detail.standard.status)} ${Number(detail.standard.health).toFixed(1)}`
        : "";

      return `
        <article class="survivor-card ${detail ? (detail.correct ? "correct" : "wrong") : ""}">
          <div class="card-head">
            <div>
              <div class="name">${escapeHtml(survivor.name)}</div>
              <div class="sub">${escapeHtml(survivor.role)}</div>
            </div>
            <span class="pill ${question ? `pill-${charge}` : "pill-none"}">${question ? calc.getChargeLabel(charge) : "待随机"}</span>
          </div>
          <div class="health-visual status-${status}">${displayStatus}</div>
          <div class="health-row"><span class="sub">当前</span><strong>${displayHealth}</strong></div>
          ${resultText ? `<div class="result-text">${resultText}</div>` : ""}
        </article>
      `;
    }).join("");
  }

  function renderAnswers() {
    if (!state.currentQuestion) {
      els.answerSheet.classList.add("hidden");
      els.answerRows.innerHTML = "";
      return;
    }

    els.answerSheet.classList.remove("hidden");
    const completed = state.answers.filter((answer) => answer.status && answer.health !== "").length;
    els.answerProgress.textContent = `${completed}/${state.answers.length}`;
    els.answerRows.innerHTML = state.answers.map((answer) => `
      <div class="answer-row">
        <strong>${escapeHtml(answer.name)}</strong>
        <div class="status-tabs">
          ${statusOptions.map((status) => `
            <button class="status-btn ${answer.status === status.key ? "selected" : ""}" type="button" data-answer-id="${answer.id}" data-status="${status.key}">${status.label}</button>
          `).join("")}
        </div>
        <input class="health-input" type="number" min="0" step="${state.config.healthStep}" value="${answer.health}" data-health-id="${answer.id}" placeholder="血量" />
      </div>
    `).join("");
  }

  function renderReport() {
    if (!state.report.length) {
      els.reportList.innerHTML = '<div class="empty">还没有战报。去练习页提交一次判定后会出现在这里。</div>';
      return;
    }

    els.reportList.innerHTML = state.report.map((report) => {
      const question = report.question;
      const rows = report.result.details.map((detail) => {
        const chargeLabel = calc.getChargeLabel(question.charges[detail.id]);
        return `
          <div class="detail-row ${detail.correct ? "" : "row-bad"}">
            <div><strong>${escapeHtml(detail.name)}</strong><div class="sub">${chargeLabel}</div></div>
            <div>答：${calc.getStatusLabel(detail.user.status)} ${Number(detail.user.health).toFixed(1)}</div>
            <div>正：${calc.getStatusLabel(detail.standard.status)} ${Number(detail.standard.health).toFixed(1)}</div>
          </div>
        `;
      }).join("");
      const target = report.result.details.find((detail) => detail.id === question.targetId);

      return `
        <article class="report-item">
          <div class="report-head">
            <div>
              <div class="report-title">第 ${question.number} 题：${target ? escapeHtml(target.name) : "未知目标"} ${calc.getAttackLabel(question.attackType)}</div>
              <p>${report.result.details.map((detail) => `${escapeHtml(detail.name)}${calc.getChargeLabel(question.charges[detail.id])}`).join(" / ")}</p>
            </div>
            <span class="badge ${report.result.correct ? "ok" : "bad"}">${report.result.correct ? "全对" : "有误"}</span>
          </div>
          ${rows}
        </article>
      `;
    }).join("");
  }

  function renderConfig() {
    els.survivorCountInput.value = String(state.config.survivorCount);
    els.normalDamageInput.value = state.config.normalDamage;
    els.terrorShockDamageInput.value = state.config.terrorShockDamage;
    els.healthStepInput.value = state.config.healthStep;
    els.defaultMaxHealthInput.value = state.config.defaultMaxHealth;
    els.teamConfig.innerHTML = state.survivors.map((survivor, index) => `
      <article class="team-card">
        <div class="team-title">槽位 ${index + 1}</div>
        <label><span>名称</span><input value="${escapeHtml(survivor.name)}" data-team-index="${index}" data-team-key="name" /></label>
        <label><span>角色</span><input value="${escapeHtml(survivor.role)}" data-team-index="${index}" data-team-key="role" /></label>
        <label><span>最大血量</span><input type="number" min="0.1" step="0.1" value="${survivor.maxHealth}" data-team-index="${index}" data-team-key="maxHealth" /></label>
        <label><span>当前血量</span><input type="number" min="0" step="0.1" value="${survivor.currentHealth}" data-team-index="${index}" data-team-key="currentHealth" /></label>
      </article>
    `).join("");
  }

  function saveConfigFromInputs() {
    state.config = calc.normalizeConfig({
      survivorCount: Number(els.survivorCountInput.value),
      normalDamage: Number(els.normalDamageInput.value),
      terrorShockDamage: Number(els.terrorShockDamageInput.value),
      healthStep: Number(els.healthStepInput.value),
      defaultMaxHealth: Number(els.defaultMaxHealthInput.value)
    });
    state.survivors = calc.normalizeSurvivors(state.survivors, state.config);
    state.currentQuestion = null;
    state.answers = [];
    state.result = null;
    saveStore();
    render();
    renderConfig();
    alert("已保存配置。");
  }

  function updateSurvivorCount() {
    state.config = calc.normalizeConfig(Object.assign({}, state.config, {
      survivorCount: Number(els.survivorCountInput.value)
    }));
    state.survivors = calc.normalizeSurvivors(state.survivors, state.config);
    renderConfig();
  }

  function resetHealth() {
    state.survivors = state.survivors.map((survivor) => Object.assign({}, survivor, {
      currentHealth: survivor.maxHealth
    }));
    state.currentQuestion = null;
    state.answers = [];
    state.result = null;
    saveStore();
    render();
    alert("血量已重置。");
  }

  function clearReport() {
    state.report = [];
    state.nextQuestionNumber = 1;
    saveStore();
    renderReport();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });
  document.querySelectorAll("[data-view-button]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewButton));
  });
  els.newQuestionBtn.addEventListener("click", makeQuestion);
  els.submitAnswerBtn.addEventListener("click", submitAnswer);
  els.saveConfigBtn.addEventListener("click", saveConfigFromInputs);
  els.resetHealthBtn.addEventListener("click", resetHealth);
  els.clearReportBtn.addEventListener("click", clearReport);
  els.survivorCountInput.addEventListener("change", updateSurvivorCount);

  els.answerRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-answer-id]");
    if (!button) return;
    state.answers = state.answers.map((answer) => (
      answer.id === button.dataset.answerId
        ? Object.assign({}, answer, { status: button.dataset.status })
        : answer
    ));
    renderAnswers();
  });

  els.answerRows.addEventListener("input", (event) => {
    const input = event.target.closest("[data-health-id]");
    if (!input) return;
    state.answers = state.answers.map((answer) => (
      answer.id === input.dataset.healthId
        ? Object.assign({}, answer, { health: input.value })
        : answer
    ));
    const completed = state.answers.filter((answer) => answer.status && answer.health !== "").length;
    els.answerProgress.textContent = `${completed}/${state.answers.length}`;
  });

  els.teamConfig.addEventListener("input", (event) => {
    const input = event.target.closest("[data-team-index]");
    if (!input) return;
    const index = Number(input.dataset.teamIndex);
    const key = input.dataset.teamKey;
    state.survivors = state.survivors.map((survivor, survivorIndex) => {
      if (survivorIndex !== index) return survivor;
      const value = key === "name" || key === "role" ? input.value : Number(input.value);
      return Object.assign({}, survivor, { [key]: value });
    });
  });

  render();
})();
