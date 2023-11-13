<template>
  <div>
    <Switcher
      :title="'Debug Mode'"
      :label="switchDebugLabel"
      v-model:controller="debugMode"
      @toggleUpdate="toggleDebug"
    />
    <Switcher
      :title="'Sticky Tool Settings Bar'"
      :label="switchStickyLabel"
      v-model:controller="stickMode"
      @toggleUpdate="toggleSticky"
    />
  </div>
</template>

<script setup lang="ts">
import Switcher from "@/components/commonBar/Switcher.vue";
import { ref, onMounted, onUnmounted } from "vue";
import emitter from "@/plugins/bus";

const debugMode = ref(false);
const switchDebugLabel = ref("off");

const stickMode = ref(false);
const switchStickyLabel = ref("off");

onMounted(() => {
  manageEmitters();
});

function manageEmitters() {
  emitter.on("close-drawer-sticky", () => {
    stickMode.value = false;
    toggleSticky(stickMode.value);
  });
}

function toggleDebug(value: boolean) {
  switchDebugLabel.value = switchDebugLabel.value === "on" ? "off" : "on";
  emitter.emit("show_debug_mode", value);
}

function toggleSticky(value: boolean) {
  switchStickyLabel.value = switchStickyLabel.value === "on" ? "off" : "on";
  emitter.emit("set_nav_sticky_mode", value);
}
</script>

<style scoped></style>
