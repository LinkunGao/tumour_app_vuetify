<template>
  <div class="main-container" ref="mainContainer">
    <div
      v-show="!rightFullScreen"
      class="box bg-surface ml-1 my-1 mt-2 rounded"
      ref="left_container"
      @dblclick.stop="togglePanelActive('left', $event)"
    >
      <LeftPanel />
    </div>
    <div class="d-flex justify-center align-center" ref="splitBar">
      <div
        v-show="!leftFullScreen && !rightFullScreen"
        class="split-bar bg-split-line rounded-lg"
      ></div>
    </div>

    <div
      v-show="!leftFullScreen"
      class="box bg-surface mr-1 my-1 mt-2 rounded"
      ref="right_container"
      @dblclick.stop="togglePanelActive('right', $event)"
    >
      <RightPanel />
    </div>
  </div>
</template>

<script lang="ts" setup>
import MainArea from "@/views/main/components/MainArea.vue";
import LeftPanel from "./components/left-panel-core/left.vue";
import RightPanel from "./components/right-panel-core/right.vue";
import { ref, onMounted } from "vue";
import emitter from "@/plugins/bus";

const mainContainer = ref<HTMLDivElement>();
const splitBar = ref<HTMLDivElement>();

const left_container = ref<HTMLDivElement>();
const right_container = ref<HTMLDivElement>();
let leftFullScreen = ref(false);
let rightFullScreen = ref(false);
const ignoreElements = ["INPUT", "I", "svg", "path"];

let isDragging = false;
onMounted(() => {
  const initHeight = mainContainer.value?.clientHeight as number;
  const h = ((initHeight - 80 - 100) / initHeight) * 100;

  emitter.emit("containerHight", h);
  (mainContainer.value as HTMLDivElement).style.height = `${
    ((initHeight - 80) / initHeight) * 100
  }vh`;
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
      mainContainer.value as HTMLDivElement
    ).getBoundingClientRect();
    const mousePosition = e.clientX - containerRect.left;

    const minLeft = containerRect.left;
    const maxLeft =
      containerRect.right - (splitBar.value as HTMLDivElement).offsetWidth;
    const percent = ((mousePosition - minLeft) / (maxLeft - minLeft)) * 100;
    // if (percent < 0 || percent > 100) {
    //   return;
    // }
    (mainContainer.value as HTMLDivElement).style.gridTemplateColumns =
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
      // emitter.emit("leftFullScreen", leftFullScreen.value);

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
.main-container {
  display: grid;
  grid-template-columns: 64% 1% 35%;
  width: 100%;
  /* height: 90vh; */
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
