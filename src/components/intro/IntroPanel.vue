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
    <div class="intro" v-show="showIntro">
      <h3>How to use:</h3>
      <p><strong>--> Zoom:</strong> Mouse wheel.</p>
      <p><strong>--> Pan: </strong> Mouse right click + drag image.</p>
      <p><strong>--> Switch slice:</strong> Mouse left click + drag image.</p>
      <p>
        <strong>--> Painting:</strong> Press `shift` key on your keyboard (don't
        release it), then use mouse left click to paint.
      </p>
      <p>
        <strong> --> Undo:</strong> 1. In GUI click undo; or 2. on keyborad
        using ctrl+z (windows) / command+z (mac).
      </p>
      <p>
        <strong> --> Cursor Inspector:</strong> Press `s` on the keyboard to
        enable/disable, then left click on images, and use bottom tool's bar to
        switch the image orientation.
      </p>
    </div>
  </v-menu>
</template>

<script setup lang="ts">
import { ref } from "vue";
import emitter from "@/plugins/bus";
const showIntro = ref(true);
emitter.on("show-intro-panel", (value) => {
  showIntro.value = value as boolean;
});
</script>

<style scoped>
.intro {
  /* display: flex; */
  flex-direction: column;
  /* justify-content: center; */
  align-items: center;
  /* position: fixed;
  left: 45vw;
  top: 25vh; */
  padding: 20px;
  width: 300px;
  min-height: 400px;
  background-color: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.9);
  border-radius: 10px;
  z-index: 10;
}
h3 {
  color: crimson;
}
.intro p {
  /* color: darkcyan; */
  /* color: #ef5e0a; */
  font-size: 0.8em;
  color: darkgray;
  width: 100%;
}
</style>
