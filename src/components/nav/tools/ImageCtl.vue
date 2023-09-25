<template>
  <v-list-group value="Cases">
    <template v-slot:activator="{ props }">
      <v-list-item
        v-bind="props"
        color="primary"
        prepend-icon="mdi-image"
        title="Cases Select"
      ></v-list-item>
    </template>

    <v-select :items="cases" density="compact" label="Cases"></v-select>
    <v-select
      v-model="contrastValue"
      :items="contrast"
      chips
      label="Contrast Select"
      multiple
    ></v-select>
  </v-list-group>
</template>

<script setup lang="ts">
import { ref } from "vue";

const cases = ref([
  "CL00012",
  "CL00013",
  "CL00015",
  "CL00017",
  "CL00024",
  "CL00033",
]);
const contrastValue = ref([
  "Contrast Pre",
  "Contrast 1",
  "Contrast 2",
  "Contrast 3",
  "Contrast 4",
  "Contrast 5",
]);
const contrast = ref([
  "Contrast Pre",
  "Contrast 1",
  "Contrast 2",
  "Contrast 3",
  "Contrast 4",
  "Contrast 5",
]);
</script>

<style scoped></style>
