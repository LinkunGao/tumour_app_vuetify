<template>
  <v-menu transition="scroll-x-reverse-transition" >
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
      color="surface"
      max-width="550"
      max-height="750"
    >
      <h4 class="text-h5 font-weight-bold mb-4">How to use:</h4>

      <p class="mb-8">
        <a href="#" class="text-red-accent-2 text-decoration-none">Full panel view: </a>
        <p class="ml-9">Mouse left double click the panel.</p>

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
         <p class="ml-9">&#9734; On keyborad using ctrl <a href="#" class="text-teal text-decoration-none">+</a> z (Windows) /
        command <a href="#" class="text-teal text-decoration-none">+</a> z (Mac).</p>

        <a href="#" class="text-red-accent-2 text-decoration-none"
          >Cursor Inspector:
        </a>
         <p class="ml-9">Press <a href="#" class="text-teal text-decoration-none font-weight-bold">s</a> key on the keyboard ( <a href="#" class="text-warning text-decoration-none font-weight-bold">Once</a> ) to enable/disable, then left click on images,
        and use bottom tool's bar to switch the image orientation.</p>
      </p>

      

      <v-btn
        block
        class="text-none text-black mb-4"
        color="teal-accent-3"
        variant="flat"
        @click="guideTour"
      >
        Guide Tour
      </v-btn>
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

<script setup lang="ts">
import introJs from 'intro.js';
import { useTheme } from "vuetify";
import emitter from "@/plugins/bus";

const theme = useTheme();
let tipclass = '';
let helperclass = '';

function guideTour() {

  if(theme.global.current.value.dark){
    tipclass = "tipText-dark";
    helperclass = 'helperLayer-dark';
  }else{
    tipclass = "tipText";
    helperclass = 'helperLayer';
  }

  emitter.emit("guide_status", "start");

  setTimeout(()=>{
    introJs().setOptions({
        // prevLabel: "prev",
        // nextLabel: "next",
        // skipLabel: "Jump",
        // doneLabel: "Finish"
        tooltipClass: tipclass,
        highlightClass: helperclass,
    }).oncomplete(function () {
        //after jump clicked
    }).onexit(function () {
        //after exit clicked
        
        emitter.emit("guide_status", "end");
    }).onchange(function(targetElement:HTMLDivElement) {
      if(!!targetElement){
        var dataToolValue = targetElement.getAttribute("data-tool");
        if(dataToolValue === "expandtool"){
          emitter.emit("guide_to_drawer_status", "open");
        }else if(dataToolValue === "operationtool"){
          emitter.emit("guide_to_operation_status", "open");
        }else if(dataToolValue == "guideend"){
          setTimeout(() => {
            emitter.emit("guide_status", "end");
          }, 1000);
          
        }
      }
    }).start();
  }, 500);
}

</script>

<style>
.tipText{
  background-color: #ffffff;
  box-shadow: 0 3px 30px rgba(211, 209, 209, 0.3);
}
.helperLayer{
  /* z-index: -1 !important; */
  box-shadow: #009688 0px 0px 1px 2px, rgba(33, 33, 33, 0.5) 0px 0px 0px 5000px !important;
}
.tipText-dark{
  background-color: #656464;
  box-shadow: 0 3px 30px rgb(226 217 217 / 30%);
}
.helperLayer-dark{
  /* z-index: -1 !important; */
  box-shadow: rgb(222 89 89 / 80%) 0px 0px 1px 2px, rgba(33, 33, 33, 0.5) 0px 0px 0px 5000px !important;
}

</style>
