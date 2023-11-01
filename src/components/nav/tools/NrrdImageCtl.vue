<template>
  <v-list-group value="Cases">
    <template v-slot:activator="{ props }">
      <v-list-item
        v-bind="props"
        color="primary"
        prepend-icon="mdi-image"
        title="Cases Select"
      ></v-list-item>
    </template>

    <v-select :items="cases?.names" density="compact" label="Cases"></v-select>
    <v-select
      v-model="contrastValue"
      :items="contrast"
      chips
      label="Contrast Select"
      multiple
    ></v-select>
  </v-list-group>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useFileCountStore } from "@/store/app";
import { storeToRefs } from "pinia";
const { cases } = storeToRefs(useFileCountStore());
const { getFilesNames } = useFileCountStore();
const contrastValue = ref([
  "Contrast Pre",
  "Contrast 1",
  "Contrast 2",
  "Contrast 3",
  "Contrast 4",
  "Contrast 5",
]);
const contrast = ref([
  "Contrast Pre",
  "Contrast 1",
  "Contrast 2",
  "Contrast 3",
  "Contrast 4",
  "Contrast 5",
]);

onMounted(async () => {});

async function getInitData() {
  await getFilesNames();
}
function setupGui() {
  state.switchCase = cases.value?.names[0] as string;

  gui
    .add(state, "switchCase", cases.value?.names as string[])
    .onChange(async (caseId) => {
      switchAnimationStatus("flex", "Saving masks data, please wait......");
      // revoke the regsiter images
      if (!!originUrls.value && originUrls.value.nrrdUrls.length > 0) {
        revokeRegisterNrrdImages(originUrls.value.nrrdUrls);
        originUrls.value.nrrdUrls.length = 0;
      }
      originAllSlices.length = 0;
      defaultRegAllSlices.length = 0;
      originAllMeshes.length = 0;
      defaultRegAllMeshes.length = 0;
      // temprary disable this function
      revokeAppUrls(loadedUrls);
      loadedUrls = {};

      currentCaseId = caseId;
      await getInitData();

      if (loadedUrls[caseId]) {
        switchAnimationStatus(
          "flex",
          "Prepare and Loading masks data, please wait......"
        );
        URL.revokeObjectURL(loadedUrls[caseId].jsonUrl);
        await getMaskDataBackend(caseId);
        loadedUrls[caseId].jsonUrl = maskBackend.value;
        urls = loadedUrls[caseId].nrrdUrls;
        if (!!caseUrls.value) {
          caseUrls.value.nrrdUrls = urls;
        }
      } else {
        switchAnimationStatus("flex", "Prepare Nrrd files, please wait......");
        // await getCaseFileUrls(value);

        const requests = findRequestUrls(
          cases.value?.details as Array<IDetails>,
          currentCaseId,
          "registration"
        );
        await getNrrdAndJsonFileUrls(requests);

        if (!!caseUrls.value) {
          urls = caseUrls.value.nrrdUrls;
          loadedUrls[currentCaseId] = caseUrls.value;
          const details = cases.value?.details;
          emitter.emit("casename", {
            currentCaseId,
            details,
            maskNrrd: urls[1],
          });
        }
      }

      readyToLoad(urls, "registration");
      loadCases = true;
      setUpGuiAfterLoading();
    });

  selectedContrastFolder = gui.addFolder("select display contrast");
}

function setUpGuiAfterLoading() {
  if (!!optsGui) {
    gui.removeFolder(optsGui);
    optsGui = undefined;
    state.showRegisterImages = true;
  }
  optsGui = gui.addFolder("opts");
  regCkeckbox = optsGui.add(state, "showRegisterImages");
  regCheckboxElement = regCkeckbox.domElement.childNodes[0] as HTMLInputElement;
  regCkeckbox.onChange(async () => {
    if (regCheckboxElement.disabled) {
      state.showRegisterImages = !state.showRegisterImages;
      return;
    }

    switchRegCheckBoxStatus(regCkeckbox.domElement, "none", "0.5");
    loadOrigin = true;
    switchAnimationStatus(
      "flex",
      "Prepare and Loading data, please wait......"
    );
    if (!state.showRegisterImages) {
      if (originAllSlices.length > 0) {
        allSlices = [...originAllSlices];
        allLoadedMeshes = [...originAllMeshes];
        filesCount.value = 5;
        emitter.emit("showRegBtnToRight", {
          maskNrrdMeshes: originAllMeshes[1],
          maskSlices: originAllSlices[1],
          url: urls[1],
          register: state.showRegisterImages,
        });
        return;
      }

      const reQuestInfo: IRegRquest = {
        name: currentCaseId,
        radius: toolsState?.sphereRadius,
        origin: toolsState?.sphereOrigin.z,
      };

      if (
        !(!!originUrls.value?.nrrdUrls && originUrls.value?.nrrdUrls.length > 0)
      ) {
        const requests = findRequestUrls(
          cases.value?.details as Array<IDetails>,
          reQuestInfo.name,
          "origin"
        );
        await getNrrdAndJsonFileUrls(requests);
        originUrls.value = caseUrls.value as ICaseUrls;
      }
      if (
        !!originUrls.value?.nrrdUrls &&
        originUrls.value?.nrrdUrls.length > 0
      ) {
        urls = originUrls.value.nrrdUrls;
        readyToLoad(urls, "origin")?.then((data) => {
          emitter.emit("showRegBtnToRight", {
            maskNrrdMeshes: data.meshes[1],
            maskSlices: data.slices[1],
            url: urls[1],
            register: state.showRegisterImages,
          });
        });
      }
    } else {
      if (defaultRegAllSlices.length > 0) {
        allSlices = [...defaultRegAllSlices];
        allLoadedMeshes = [...defaultRegAllMeshes];
        emitter.emit("showRegBtnToRight", {
          maskNrrdMeshes: defaultRegAllMeshes[1],
          maskSlices: defaultRegAllSlices[1],
          url: urls[1],
          register: state.showRegisterImages,
        });
        filesCount.value = 5;
        return;
      }
      if (caseUrls.value) {
        urls = caseUrls.value.nrrdUrls;
        readyToLoad(urls, "registration");
      }
    }
  });
  optsGui.add(state, "release");
  optsGui.closed = false;
}

function switchRegCheckBoxStatus(
  checkbox: HTMLElement,
  pointerEvents: "none" | "auto",
  opacity: "0.5" | "1"
) {
  const inputBox = checkbox.childNodes[0] as HTMLInputElement;
  inputBox.disabled = !inputBox.disabled;
  inputBox.readOnly = !inputBox.readOnly;
  checkbox.style.pointerEvents = pointerEvents;
  checkbox.style.opacity = opacity;
}
</script>

<style scoped></style>
