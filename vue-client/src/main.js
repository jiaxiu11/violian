import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store/store";
import vuetify from "./plugins/vuetify";
import Panel from "@/components/Globals/Panel";
import VueAnalytics from "vue-analytics";
import Notifications from 'vue-notification';

Vue.use(Notifications)
Vue.config.productionTip = false;
if (process.env.NODE_ENV !== "development") {
  Vue.use(VueAnalytics, {
    id: "UA-178632955-2",
    router
  });
}

Vue.component("panel", Panel);

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount("#app");
