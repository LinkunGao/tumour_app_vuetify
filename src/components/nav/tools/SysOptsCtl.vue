<template>
  <div>
    <Switcher
      :title="'Debug Mode'"
      :label="switchLable"
      v-model:controller="debugMode"
      @toggleUpdate="toggleDebug"
    />
  </div>
</template>

<script setup lang="ts">
import Switcher from "@/components/commonBar/Switcher.vue";
import { ref } from "vue";
import emitter from "@/plugins/bus";

const debugMode = ref(false);
const switchLable = ref("off");

function toggleDebug(value: any) {
  switchLable.value = switchLable.value === "on" ? "off" : "on";
  emitter.emit("show_debug_mode", value);
}
</script>

<style scoped></style>
