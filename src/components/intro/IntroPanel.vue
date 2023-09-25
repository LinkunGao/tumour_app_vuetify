<template>
  <v-menu transition="scroll-x-reverse-transition">
    <template v-slot:activator="{ props }">
      <v-btn
        color="info"
        class="ma-2"
        density="compact"
        icon="mdi-information-outline"
        v-bind="props"
      >
      </v-btn>
    </template>
    <v-sheet
      border="md"
      class="pa-6 text-white mx-auto"
      color="#141518"
      max-width="400"
    >
      <h4 class="text-h5 font-weight-bold mb-4">How to use:</h4>

      <p class="mb-8">
        <a href="#" class="text-red-accent-2 text-decoration-none">Zoom: </a>
        <p class="ml-9">Scroll mouse wheel.</p>

        <a href="#" class="text-red-accent-2 text-decoration-none">Pan: </a>
         <p class="ml-9">Mouse right click <a href="#" class="text-teal text-decoration-none">+</a> drag image.</p>

        <a href="#" class="text-red-accent-2 text-decoration-none"
          >Switch slice:
        </a>
         <p class="ml-9">Mouse left click <a href="#" class="text-teal text-decoration-none">+</a> drag image.</p>

        <a href="#" class="text-red-accent-2 text-decoration-none"
          >Painting:
        </a>
         <p class="ml-9">Press <a href="#" class="text-teal text-decoration-none font-weight-bold">shift</a> key on your keyboard ( <a href="#" class="text-warning text-decoration-none font-weight-bold">Don't release it</a> ), then use mouse
        left click to paint.</p>

        <a href="#" class="text-red-accent-2 text-decoration-none">Undo: </a>
         <p class="ml-9">&#9734; In GUI click undo; or </p>
         <p class="ml-9">&#9734; On keyborad using ctrl <a href="#" class="text-teal text-decoration-none">+</a> z (windows) /
        command <a href="#" class="text-teal text-decoration-none">+</a> z (mac).</p>

        <a href="#" class="text-red-accent-2 text-decoration-none"
          >Cursor Inspector:
        </a>
         <p class="ml-9">Press <a href="#" class="text-teal text-decoration-none font-weight-bold">s</a> key on the keyboard ( <a href="#" class="text-warning text-decoration-none font-weight-bold">Once</a> ) to enable/disable, then left click on images,
        and use bottom tool's bar to switch the image orientation.</p>
      </p>

      

      <v-btn
        block
        class="text-none text-black mb-4"
        color="red-accent-2"
        size="x-large"
        variant="flat"
      >
        Got it
      </v-btn>
    </v-sheet>
  </v-menu>
</template>

<script setup lang="ts"></script>

<style scoped>
</style>
