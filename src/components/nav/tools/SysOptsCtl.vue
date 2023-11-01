<template>
  <div>
    <!-- <v-container>
      <v-row style="height: 60px">
        <v-col cols="4" class="d-flex justify-center align-center">
          Debug:
        </v-col>
        <v-col cols="8" class="d-flex justify-center align-center">
          <v-switch
            v-model="debugMode"
            color="secondary"
            hide-details
            class="ml-5"
            @update:model-value="toggleDebug"
          ></v-switch>
        </v-col>
      </v-row>
    </v-container> -->
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
