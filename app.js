const { ensureStore } = require("./utils/storage");

App({
  onLaunch() {
    ensureStore();
  }
});
