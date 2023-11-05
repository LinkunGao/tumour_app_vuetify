<template>
  <v-card class="mx-auto">
    <v-list v-model:opened="open">
      <v-list-item
        prepend-icon="mdi-tools"
        color="success"
        title="Tools Core Settings"
      ></v-list-item>
      <ImageCtl />
      <OperationCtl />
      <SysOpts />
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ImageCtl from "./tools/NrrdImageCtl.vue";
import OperationCtl from "./tools/OperationCtl.vue";
import SysOpts from "./SysOpts.vue";
const open = ref(["Cases"]);
</script>

<style lang="scss"></style>
