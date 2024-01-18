<template>
  <div v-show="guideEndStatus" class="guide-end" data-step="26" data-title="Guide Tour Finished" data-intro="Enjoy your journey on Tumour Position & Extent Reporting APP! 🙌" data-tool="guideend"/>
  <router-view />
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import emitter from "@/plugins/bus";

const guideEndStatus = ref(false);

onMounted(()=>{
  manageEmitters();
})
function manageEmitters() {
  emitter.on("guide_status", (val)=>{
    if(val === "start"){
      guideEndStatus.value = true;
    }else{
      guideEndStatus.value = false;
    }
  });
}

</script>

<style>
.guide-end{
  /* display: none; */
  position: fixed;
  top: 50%;
  left:50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  width: 1px;
  height: 1px;
}
</style>