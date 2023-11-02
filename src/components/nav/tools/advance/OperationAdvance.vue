<template>
  <v-list-group value="Advance">
    <template v-slot:activator="{ props }">
      <v-list-item
        v-bind="props"
        color="nav-success-2"
        prepend-icon="mdi-axe-battle"
        title="Advance Settings"
      ></v-list-item>
    </template>

    <v-color-picker hide-inputs></v-color-picker>
  </v-list-group>
</template>

<script setup lang="ts">
import { ref } from "vue";
</script>

<style scoped></style>
