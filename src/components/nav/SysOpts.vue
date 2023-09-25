<template>
  <v-list-group value="Opts">
    <template v-slot:activator="{ props }">
      <v-list-item
        v-bind="props"
        color="primary"
        prepend-icon="mdi-cogs"
        title="Opts"
      ></v-list-item>
    </template>

    <IntroCtl />
  </v-list-group>
</template>

<script setup lang="ts">
import IntroCtl from "@/components/intro/IntroCtl.vue";
import { ref } from "vue";
</script>

<style scoped></style>
