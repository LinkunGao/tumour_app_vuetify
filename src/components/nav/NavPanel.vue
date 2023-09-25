<template>
  <v-card class="mx-auto">
    <v-list v-model:opened="open">
      <v-list-item
        prepend-icon="mdi-tools"
        color="primary"
        title="Tools"
      ></v-list-item>
      <ImageCtl />
      <SysOpts />
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ImageCtl from "./tools/NrrdImageCtl.vue";
import SysOpts from "./SysOpts.vue";
const open = ref(["Cases"]);
</script>

<style lang="scss"></style>
