<template>
  <v-navigation-drawer v-model="drawer">
    <!--  -->

    <NavPanel />
  </v-navigation-drawer>

  <v-app-bar color="surface" class="d-flex justify-end">
    <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

    <v-app-bar-title class="text-deep-orange">
      <span>Tumour Tracking APP </span>
      <span class="text-body-2">v2.3.6</span>
    </v-app-bar-title>

    <div width="" class="w-50 d-flex flex-row justify-end align-center px-2">
      <IntroPanel />

      <v-btn
        color="secondary-font"
        class="px-5"
        density="compact"
        icon="mdi-theme-light-dark"
        @click="toggleTheme"
      ></v-btn>
      <v-img
        class="px-5"
        width="250px"
        max-width="250px"
        src="@/assets/images/abi.png"
      ></v-img>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useTheme } from "vuetify";

import NavPanel from "@/components/nav/NavPanel.vue";
import IntroPanel from "@/components/intro/IntroPanel.vue";
import emitter from "@/plugins/bus";

const drawer = ref(false);

const theme = useTheme();

function toggleTheme(value: any) {
  // theme.global.current.value.dark
  theme.global.name.value = theme.global.current.value.dark
    ? "lightTheme"
    : "darkTheme";

  emitter.emit("toggleTheme", theme.global.name.value);
}
</script>
<style></style>
