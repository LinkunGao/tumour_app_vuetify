<template>
  <v-list-group value="Operation">
    <template v-slot:activator="{ props }">
      <v-list-item
        v-bind="props"
        color="nav-success"
        prepend-icon="mdi-axe"
        title="Operation Settings"
      ></v-list-item>
    </template>
    <!-- Functional Control -->
    <v-container fluid>
      <v-progress-linear
        color="nav-success-2"
        buffer-value="0"
        stream
      ></v-progress-linear>
      <v-radio-group
        class="radio-group"
        v-model="commFuncRadios"
        label="Functional Controls"
        :inline="true"
        :disabled="commFuncRadiosDisabled"
        @update:modelValue="toggleFuncRadios"
      >
        <v-radio
          v-for="(item, idx) in commFuncRadioValues"
          :key="idx"
          :label="item.label"
          :value="item.value"
          :color="item.color"
        ></v-radio>
      </v-radio-group>
      <v-progress-linear
        color="nav-success-2"
        buffer-value="0"
        stream
      ></v-progress-linear>
      <!-- </v-container> -->

      <!-- Slider Controls -->
      <!-- <v-container fluid> -->
      <v-progress-linear
        color="nav-success"
        buffer-value="0"
        stream
      ></v-progress-linear>
      <v-radio-group
        class="radio-group"
        v-model="commSliderRadios"
        label="Slider Controls"
        :inline="true"
        :disabled="commSliderRadiosDisabled"
        @update:modelValue="toggleSliderRadios"
      >
        <v-radio
          v-for="(item, idx) in commSliderRadioValues"
          :key="idx"
          :label="item.label"
          :value="item.value"
          :color="item.color"
        ></v-radio>
      </v-radio-group>
      <v-slider
        v-model="slider"
        :color="sliderColor"
        thumb-label="always"
        :disabled="sliderDisabled"
        :max="sliderMax"
        :min="sliderMin"
        :step="sliderStep"
        @update:modelValue="toggleSlider"
        @end="toggleSliderFinished"
      ></v-slider>
      <v-progress-linear
        color="nav-success"
        buffer-value="0"
        stream
      ></v-progress-linear>
    </v-container>

    <OperationAdvance />
  </v-list-group>
</template>

<script setup lang="ts">
import OperationAdvance from "./advance/OperationAdvance.vue";
import { ref, onMounted } from "vue";
import emitter from "@/plugins/bus";

const commFuncRadioValues = ref([
  { label: "Pencil", value: "segmentation", color: "success" },
  { label: "Spere", value: "sphere", color: "warning" },
  { label: "Eraser", value: "Eraser", color: "error" },
  { label: "Brush", value: "brush", color: "info" },
]);

const commSliderRadioValues = ref([
  { label: "Opacity", value: "globalAlpha", color: "success" },
  { label: "B&E size", value: "brushAndEraserSize", color: "info" },
  { label: "ImageContrast", value: "windowHigh", color: "warning" },
]);

// Functional Controls
const commFuncRadios = ref("segmentation");
const commFuncRadiosDisabled = ref(true);

// Slider Controls
const commSliderRadios = ref("");
const commSliderRadiosDisabled = ref(true);
const slider = ref(0);
const sliderColor = ref("grey");
const sliderDisabled = ref(true);
const sliderMax = ref(100);
const sliderMin = ref(0);
const sliderStep = ref(1);

const guiSettings = ref<any>();

onMounted(() => {
  manageEmitters();
});

function manageEmitters() {
  emitter.on("finishloadcases", (val) => {
    guiSettings.value = val;
    commSliderRadios.value = "globalAlpha";
    updateSliderSettings();
    commFuncRadiosDisabled.value = false;
    commSliderRadiosDisabled.value = false;
    sliderDisabled.value = false;
  });
}

function toggleFuncRadios(val: any) {
  if (val === "sphere") {
    guiSettings.value.guiState["sphere"] = true;
  } else {
    guiSettings.value.guiState["sphere"] = false;
    if (val === "Eraser") {
      guiSettings.value.guiState["Eraser"] = true;
    } else {
      guiSettings.value.guiState["Eraser"] = false;
      if (val === "segmentation") {
        guiSettings.value.guiState["segmentation"] = true;
      } else {
        guiSettings.value.guiState["segmentation"] = false;
        guiSettings.value.guiSetting["segmentation"].onChange();
        return;
      }
    }
  }

  guiSettings.value.guiSetting[commFuncRadios.value].onChange();
}

function toggleSliderRadios(val: any) {
  updateSliderSettings();
}

function toggleSlider(val: number) {
  if (commSliderRadios.value !== "windowHigh") {
    guiSettings.value.guiState[commSliderRadios.value] = val;
  }
  if (commSliderRadios.value === "brushAndEraserSize") {
    guiSettings.value.guiSetting[commSliderRadios.value].onChange();
  }
  if (commSliderRadios.value === "windowHigh") {
    guiSettings.value.guiSetting[commSliderRadios.value].onChange(val);
  }
}

function toggleSliderFinished(val: number) {
  if (commSliderRadios.value === "windowHigh") {
    guiSettings.value.guiSetting[commSliderRadios.value].onFinished();
  }
}

function updateSliderSettings() {
  if (commSliderRadios.value !== "windowHigh") {
    slider.value = guiSettings.value.guiState[commSliderRadios.value];
  } else {
    slider.value =
      guiSettings.value.guiSetting[commSliderRadios.value].value.windowHigh;
  }
  sliderMax.value = guiSettings.value.guiSetting[commSliderRadios.value].max;
  sliderMin.value = guiSettings.value.guiSetting[commSliderRadios.value].min;
  sliderStep.value = guiSettings.value.guiSetting[commSliderRadios.value].step;

  const radioSettings = commSliderRadioValues.value.filter(
    (item) => item.value === commSliderRadios.value
  );

  if (radioSettings.length > 0) {
    sliderColor.value = radioSettings[0].color;
  }
}
</script>

<style>
.v-selection-control-group--inline {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 0 10px;
}
</style>
