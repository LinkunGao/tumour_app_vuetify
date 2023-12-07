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

      <!-- Buttons -->
      <v-progress-linear
        color="nav-success"
        buffer-value="0"
        stream
      ></v-progress-linear>

      <v-btn
        v-for="(btn, idx) in commFuncBtnValues"
        block
        density="comfortable"
        variant="outlined"
        class="my-1"
        :key="idx"
        :color="btn.color"
        :disabled="btn.disabled"
        @click="onBtnClick(btn.value)"
        >{{ btn.label }}</v-btn
      >

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

// Functional Controls
const commFuncRadios = ref("segmentation");
const commFuncRadiosDisabled = ref(true);
const prebtn = ref("segmentation")

// Slider Controls
const commSliderRadios = ref("");
const commSliderRadiosDisabled = ref(true);
const slider = ref(0);
const sliderColor = ref("grey");
const sliderDisabled = ref(true);
const sliderMax = ref(100);
const sliderMin = ref(0);
const sliderStep = ref(1);

// Functional Buttons
const btnUndoDisabled = ref(true);
const btnResetZoomDisabled = ref(true);
const btnClearDisabled = ref(true);
const btnClearAllDisabled = ref(true);

const guiSettings = ref<any>();

const commFuncRadioValues = ref([
  { label: "Pencil", value: "segmentation", color: "success" },
  { label: "Sphere", value: "sphere", color: "warning" },
  { label: "Eraser", value: "Eraser", color: "error" },
  { label: "Brush", value: "brush", color: "info" },
]);

const commSliderRadioValues = ref([
  { label: "Opacity", value: "globalAlpha", color: "success" },
  { label: "B&E Size", value: "brushAndEraserSize", color: "info" },
  { label: "WindowHigh", value: "windowHigh", color: "warning" },
  { label: "WindowCenter", value: "windowLow", color: "error" },
]);

const commFuncBtnValues = ref([
  {
    label: "Undo",
    value: "undo",
    disabled: btnUndoDisabled,
    color: "nav-success-2",
  },
  {
    label: "Reset Zoom",
    value: "resetZoom",
    disabled: btnResetZoomDisabled,
    color: "nav-success-2",
  },
  {
    label: "Clear Slice Mask",
    value: "clear",
    disabled: btnClearDisabled,
    color: "nav-success-2",
  },
  {
    label: "Clear All Slices Masks",
    value: "clearAll",
    disabled: btnClearAllDisabled,
    color: "nav-success",
  },
]);

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

    btnUndoDisabled.value = false;
    btnResetZoomDisabled.value = false;
    btnClearDisabled.value = false;
    btnClearAllDisabled.value = false;
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

  if(prebtn.value==="sphere" && prebtn!==val){
    guiSettings.value.guiSetting["sphere"].onChange();
  }

  prebtn.value=val;
  guiSettings.value.guiSetting[commFuncRadios.value].onChange();
}

function toggleSliderRadios(val: any) {
  updateSliderSettings();
}

function toggleSlider(val: number) {
  if (commSliderRadios.value !== "windowHigh" && commSliderRadios.value !== "windowLow") {
    guiSettings.value.guiState[commSliderRadios.value] = val;
  }
  if (commSliderRadios.value === "brushAndEraserSize") {
    guiSettings.value.guiSetting[commSliderRadios.value].onChange();
  }
  if (commSliderRadios.value === "windowHigh" || commSliderRadios.value === "windowLow") {
    guiSettings.value.guiSetting[commSliderRadios.value].onChange(val);
  }
}

function toggleSliderFinished(val: number) {
  if (commSliderRadios.value === "windowHigh" || commSliderRadios.value === "windowLow") {
    guiSettings.value.guiSetting[commSliderRadios.value].onFinished();
  }
}

function updateSliderSettings() {
  // if (commSliderRadios.value !== "windowHigh" && commSliderRadios.value !== "windowLow") {
    
  // } else {
    if (commSliderRadios.value === "windowHigh"){
      slider.value = guiSettings.value.guiSetting[commSliderRadios.value].value.windowHigh;
    }else if (commSliderRadios.value === "windowLow"){
      slider.value =
      guiSettings.value.guiSetting[commSliderRadios.value].value.windowLow;
    }else{
      slider.value = guiSettings.value.guiState[commSliderRadios.value];
    }
    
  // }
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

function onBtnClick(val: any) {
  guiSettings.value.guiState[val].call();
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
