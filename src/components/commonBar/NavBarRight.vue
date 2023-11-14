<template>
  <div class="nav dark" ref="nav_container">
    <div class="content" id="left_nav_bar">
      <div class="arrows">
        <span
          v-for="item in viewData"
          @click.stop="onSigleClick(item.label)"
          @dblclick.stop="onDoubleClick(item.label)"
        >
          <i v-if="item.label !== 'reset'">
            <img class="image" v-if="darkMode" :src="item.img_white" alt="" />
            <img class="image" v-else :src="item.img_blank" alt="" />
          </i>
          <i class="switch_font" v-else>
            <ion-icon name="sync-outline"></ion-icon>
          </i>
          <v-tooltip activator="parent" location="top">{{
            item.name
          }}</v-tooltip>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import sagittalImg_white from "@/assets/images/person_left_view_white.png";
import axialImg_white from "@/assets/images/person_top_down_white.png";
import coronalImg_white from "@/assets/images/person_anterior_white.png";
import sagittalImg_blank from "@/assets/images/person_left_view.png";
import axialImg_blank from "@/assets/images/person_top_down.png";
import coronalImg_blank from "@/assets/images/person_anterior.png";
import clockImg from "@/assets/images/clock_white.png";
import resetImg from "@/assets/images/reset.png";
import emitter from "@/plugins/bus";

const viewData = [
  {
    name: "Sagittal view",
    label: "sagittal",
    img_white: sagittalImg_white,
    img_blank: sagittalImg_blank,
  },
  {
    name: "Axial view",
    label: "axial",
    img_white: axialImg_white,
    img_blank: axialImg_blank,
  },
  {
    name: "Coronal view",
    label: "coronal",
    img_white: coronalImg_white,
    img_blank: coronalImg_blank,
  },
  // {
  // name:"Clock function",
  // label:"clock",
  // img:clockImg
  // },
  {
    name: "Reset views",
    label: "reset",
    img: resetImg,
  },
];

const darkMode = ref(true);
const nav_container = ref<HTMLDivElement>();
const emit = defineEmits(["onViewSingleClick", "onViewDoubleClick"]);

const onSigleClick = (view: string) => {
  emit("onViewSingleClick", view);
};

const onDoubleClick = (view: string) => {
  emit("onViewDoubleClick", view);
};

onMounted(() => {
  emitter.on("toggleTheme", () => {
    darkMode.value = !darkMode.value;
    nav_container.value?.classList.toggle("dark");
  });
});
</script>

<style scoped>
.dark .el-slider {
  max-width: 35vw;
  margin-right: 10px;
  --el-slider-main-bg-color: #f4511e !important;
  --el-slider-runway-bg-color: rgba(0, 0, 0) !important;
}

.nav {
  /* position: fixed;
  bottom: 25px;
  left: 10px; */

  height: 60px;
  width: 85%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
.nav .content {
  /* position: relative; */
  width: 100%;
  height: 100%;
  /* background-color: #edf1f4; */
  background-color: #f4f4f4;
  padding: 0 20px;
  border-radius: 10px;
  box-shadow: 0 30px 30px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .content {
  background: #33393e;
  /* box-shadow: 15px 15px 20px rgba(0, 0, 0, 0.25),
    -15px -15px 20px rgba(255, 255, 255, 0.1); */
  box-shadow: 15px 15px 20px rgba(0, 0, 0, 0.25),
    -5px -10px 15px rgba(255, 255, 255, 0.1);
}

.nav .content .arrows {
  display: flex;
  align-items: center;
}
.nav .content .arrows span {
  position: relative;
  padding: 10px;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.1), -5px -5px 20px #fff;
  margin: 10px;
  cursor: pointer;
  user-select: none;
  min-width: 55px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2em;
  color: #666;
  border: 2px solid #edf1f4;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.1), -5px -5px 10px #fff;
  border-radius: 10px;
  cursor: pointer;
}
.dark .content .arrows span {
  color: #eee;
  border: 2px solid #333;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.25),
    -5px -5px 10px rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.nav .content .arrows span:active {
  box-shadow: inset 5px 5px 10px rgba(0, 0, 0, 0.1), inset -5px -5px 10px #fff;
  color: #f44336;
}

.dark .content .arrows span:active {
  box-shadow: inset 5px 5px 10px rgba(0, 0, 0, 0.25),
    inset -5px -5px 10px rgba(255, 255, 255, 0.1);
}

.image {
  width: 1em;
  height: 1em;
}
.switch_font {
  font-size: 1em;
}
.switch_font:active {
  font-size: 1em;
  color: #f44336;
}
.iconfont {
  font-size: 36px;
}
.switch_font img {
  width: 16px;
  height: 16px;
}
</style>
