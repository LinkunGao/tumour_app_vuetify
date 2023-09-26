<template>
  <div class="split-container" ref="splitContainer">
    <div
      v-show="!rightFullScreen"
      class="box bg-surface ml-1 my-1 rounded"
      ref="left_container"
      @dblclick.stop="togglePanelActive('left', $event)"
    >
      <MainArea />
    </div>
    <div class="d-flex justify-center align-center">
      <div
        v-show="!leftFullScreen && !rightFullScreen"
        class="split-bar bg-split-line rounded-lg"
        ref="splitBar"
      ></div>
    </div>

    <div
      v-if="!leftFullScreen"
      class="box bg-surface mr-1 my-1 rounded"
      ref="right_container"
      @dblclick.stop="togglePanelActive('right', $event)"
    ></div>
  </div>
</template>

<script lang="ts" setup>
import MainArea from "@/views/main/components/MainArea.vue";
import { ref, onMounted } from "vue";
import emitter from "@/plugins/bus";

const splitContainer = ref<HTMLDivElement>();
const splitBar = ref<HTMLDivElement>();

const left_container = ref<HTMLDivElement>();
const right_container = ref<HTMLDivElement>();
let leftFullScreen = ref(false);
let rightFullScreen = ref(false);
const ignoreElements = ["INPUT", "I", "svg", "path"];

let isDragging = false;
onMounted(() => {
  splitBar.value?.addEventListener("mousedown", function (e) {
    isDragging = true;
    document.addEventListener("mousemove", moveSplitLine);
  });

  document.addEventListener("mouseup", function (e) {
    isDragging = false;
    document.removeEventListener("mousemove", moveSplitLine);
  });
});

function moveSplitLine(e: MouseEvent) {
  if (isDragging) {
    const containerRect = (
      splitContainer.value as HTMLDivElement
    ).getBoundingClientRect();
    const mousePosition = e.clientX - containerRect.left;

    const minLeft = containerRect.left;
    const maxLeft =
      containerRect.right - (splitBar.value as HTMLDivElement).offsetWidth;
    const percent = ((mousePosition - minLeft) / (maxLeft - minLeft)) * 100;
    if (percent < 1 || percent > 99) {
      return;
    }
    (splitContainer.value as HTMLDivElement).style.gridTemplateColumns =
      percent - 1 + "% 1%" + (100 - percent) + "%";
    emitter.emit("resize", true);
  }
}

function togglePanelActive(panel: string, e: MouseEvent) {
  const nodeName = (e.target as HTMLElement).nodeName;
  if (ignoreElements.includes(nodeName)) return;
  switch (panel) {
    case "left":
      leftFullScreen.value = !leftFullScreen.value;
      left_container.value?.classList.toggle("panel_active");
      emitter.emit("leftFullScreen", leftFullScreen.value);

      break;
    case "right":
      rightFullScreen.value = !rightFullScreen.value;
      right_container.value?.classList.toggle("panel_active");
      break;
  }
  emitter.emit("resize", true);
}
</script>

<style scoped>
.split-container {
  display: grid;
  grid-template-columns: 64% 1% 35%;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  user-select: none;
}

.box {
  height: 100%;
}
.panel_active {
  width: 100%;
  position: fixed;
  z-index: 100;
}

.split-bar {
  width: 4px;
  height: 10%;
  cursor: col-resize;
}
</style>
