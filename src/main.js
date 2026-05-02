import { createApp } from "vue";
import { registerSW } from "virtual:pwa-register";
import App from "./App.vue";
import "./styles.css";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(
      new CustomEvent("pwa-update-available", {
        detail: {
          updateSW
        }
      })
    );
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent("pwa-offline-ready"));
  }
});

createApp(App).mount("#app");
