<template>
  <v-card class="mx-auto">
    <v-list v-model:opened="open">
      <v-list-item
        prepend-icon="mdi-home"
        color="primary"
        title="Home"
      ></v-list-item>
      <ImageCtl />
      <SysOpts />
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ImageCtl from "./tools/ImageCtl.vue";
import SysOpts from "./SysOpts.vue";
const open = ref(["Cases"]);
const items = ref([
  { text: "Real-Time", icon: "mdi-clock" },
  { text: "Audience", icon: "mdi-account" },
  { text: "Conversions", icon: "mdi-flag" },
]);
</script>

<style lang="scss"></style>
