<template>
  <div>
    <v-container>
      <v-row style="height: 60px">
        <v-col cols="4" class="d-flex justify-center align-center">
          Theme:
        </v-col>
        <v-col cols="8" class="d-flex justify-center align-center">
          <v-switch
            v-model="themeFlag"
            color="orange-darken-4"
            hide-details
            class="ml-5"
            :label="themeFlag ? 'Dark' : 'Light'"
            @update:model-value="toggleTheme"
          ></v-switch>
        </v-col>
      </v-row>
      <v-row style="height: 60px">
        <v-col cols="4" class="d-flex justify-center align-center">
          Intros:
        </v-col>
        <v-col cols="8" class="d-flex justify-center align-center">
          <v-switch
            v-model="showIntro"
            color="info"
            hide-details
            class="ml-5"
            @update:model-value="toggleIntro"
          ></v-switch>
        </v-col>
      </v-row>
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
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from "vuetify";
import { ref } from "vue";
import emitter from "@/plugins/bus";

const themeFlag = ref(true);
const showIntro = ref(false);
const debugMode = ref(false);

const theme = useTheme();

function toggleTheme(value: any) {
  // theme.global.current.value.dark
  theme.global.name.value = theme.global.current.value.dark
    ? "lightTheme"
    : "darkTheme";
}

function toggleIntro(value: any) {
  emitter.emit("show-intro-panel", value);
}

function toggleDebug(value: any) {
  emitter.emit("show-intro-panel", value);
}
</script>

<style scoped></style>
