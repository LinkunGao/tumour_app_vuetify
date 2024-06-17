<template>
    <v-list-group value="Calculator">
      <template v-slot:activator="{ props }">
        <v-list-item
          v-bind="props"
          color="nav-success-2"
          prepend-icon="mdi-map-marker-distance"
          title="Calculate Distance"
        ></v-list-item>
      </template>
      <v-container fluid>
        <v-progress-linear
          color="nav-success-2"
          buffer-value="0"
          stream
        ></v-progress-linear>
        <v-radio-group
          class="radio-group"
          v-model="calculatorPickerRadios"
          label=""
          :inline="true"
          :disabled="calculatorPickerRadiosDisabled"
          @update:modelValue="toggleCalculatorPickerRadios"
        >
          <v-radio
            v-for="(item, idx) in commFuncRadioValues"
            :key="idx"
            :label="item.label"
            :value="item.value"
            :color="item.color"
          ></v-radio>
        </v-radio-group>
        <v-btn
        block
        density="comfortable"
        @click="onBtnClick('finish')"
        >Finish</v-btn>
        <v-progress-linear
          color="nav-success-2"
          buffer-value="0"
          stream
        ></v-progress-linear>
      </v-container>
    </v-list-group>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from "vue";
  import emitter from "@/plugins/bus";
  
  // buttons
  const calculatorPickerRadios = ref("tumour");
  const calculatorPickerRadiosDisabled = ref(true);
  
  const commFuncRadioValues = ref([
    // { label: "Tumour", value: "tumour", color: "#4CAF50" },
    { label: "Skin", value: "skin", color: "#FFEB3B" },
    { label: "Nipple", value: "nipple", color: "#E91E63" },
    { label: "Ribcage", value: "ribcage", color: "#2196F3" },
  ]);
  
  const guiSettings = ref<any>();
  
  onMounted(() => {
    manageEmitters();
  });
  
  function manageEmitters() {
    emitter.on("caseswitched", async (casename)=>{
      onBtnClick("load case");
      emitter.emit("close_calculate_box", "Calculator");
  });
    emitter.on("finishloadcases", (val) => {
      guiSettings.value = val;
      calculatorPickerRadios.value = "tumour";
      calculatorPickerRadiosDisabled.value = false;
      
    });
    emitter.on("open_calculate_box", (val)=>{
      calculatorPickerRadiosDisabled.value = false;
    })
    emitter.on("close_calculate_box", (val)=>{
      calculatorPickerRadiosDisabled.value = true;
    })
  }
  
  function toggleCalculatorPickerRadios(val: string | null) {
    if (val === "skin"){
      // "tumour" | "skin" | "nipple" | "ribcage"
      guiSettings.value.guiState["cal_distance"] = "skin";
    }
    if (val === "nipple"){
      guiSettings.value.guiState["cal_distance"] = "nipple";
    }
    if (val === "ribcage"){
      guiSettings.value.guiState["cal_distance"] = "ribcage";
    }

    guiSettings.value.guiSetting["cal_distance"].onChange(calculatorPickerRadios.value);
    
  }

  function onBtnClick(val:string){
    if (!!guiSettings.value){
      calculatorPickerRadios.value = "tumour";
      guiSettings.value.guiState["cal_distance"] = "tumour";
      calculatorPickerRadiosDisabled.value = true;
    }
  }
  
  </script>
  
  <style scoped></style>
  