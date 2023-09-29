import { GUI } from "dat.gui";
import {
  nrrdSliceType,
  mouseMovePositionType,
  undoType,
  exportPaintImageType,
  storeExportPaintImageType,
  exportPaintImagesType,
  loadingBarType,
} from "../../types/types";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";
import { Copper3dTrackballControls } from "../../Controls/Copper3dTrackballControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import copperMScene from "../../Scene/copperMScene";
import copperScene from "../../Scene/copperScene";

import { switchEraserSize, switchPencilIcon } from "../utils";
import { saveFileAsJson } from "../download";
import {
  restructData,
  convertReformatDataToBlob,
} from "../workers/reformatSaveDataWorker";

import { setupGui } from "./coreTools/gui";
import { autoFocusDiv, enableDownload } from "./coreTools/divControlTools";
import {
  IConvertObjType,
  IDownloadImageConfig,
  IDrawingEvents,
  IDragPrameters,
  IProtected,
  IGUIStates,
  INrrdStates,
  IDrawOpts,
  IPaintImage,
  IPaintImages,
  IStoredPaintImages,
  ISkipSlicesDictType,
  IMaskData,
  IDragOpts,
} from "./coreTools/coreType";
import DragOperator from "./DragOperator";

export class NrrdTools {
  container: HTMLDivElement;

  // A base conatainer to append displayCanvas and drawingCanvas
  private mainAreaContainer: HTMLDivElement = document.createElement("div");

  private originCanvas: HTMLCanvasElement | any;

  private sceneIn: copperScene | copperMScene | undefined;

  private protectedData: IProtected;
  storedPaintImages: IStoredPaintImages | undefined;

  private dragOperator: DragOperator;

  start: () => void = () => {};

  private paintedImage: IPaintImage | undefined;
  private previousDrawingImage: ImageData;
  private undoArray: Array<undoType> = [];
  private initState: boolean = true;
  private preTimer: any;
  private eraserUrls: string[] = [];
  private pencilUrls: string[] = [];

  private nrrd_states: INrrdStates = {
    originWidth: 0,
    originHeight: 0,
    nrrd_x_mm: 0,
    nrrd_y_mm: 0,
    nrrd_z_mm: 0,
    nrrd_x_pixel: 0,
    nrrd_y_pixel: 0,
    nrrd_z_pixel: 0,
    changedWidth: 0,
    changedHeight: 0,
    oldIndex: 0,
    currentIndex: 0,
    maxIndex: 0,
    minIndex: 0,
    RSARatio: 0,
    voxelSpacing: [],
    spaceOrigin: [],
    dimensions: [],
    loadMaskJson: false,
    ratios: { x: 1, y: 1, z: 1 },
    sharedPlace: { x: [-1], y: [-1], z: [-1] },
    contrastNum: 0,

    showContrast: false,
    enableCursorChoose: false,
    isCursorSelect: false,
    cursorPageX: 0,
    cursorPageY: 0,
    // x: [cursorX, cursorY, sliceIndex]
    sphereOrigin: { x: [0, 0, 0], y: [0, 0, 0], z: [0, 0, 0] },
    spherePlanB: true,
    sphereRadius: 10,
    Mouse_Over_x: 0,
    Mouse_Over_y: 0,
    Mouse_Over: false,
    stepClear: 1,
    sizeFoctor: 1,
    clearAllFlag: false,
    previousPanelL: -99999,
    previousPanelT: -99999,
    switchSliceFlag: false,
    labels: ["label1", "label2", "label3"],

    getMask: (
      mask: ImageData,
      sliceId: number,
      label: string,
      width: number,
      height: number,
      clearAllFlag: boolean
    ) => {},
    drawStartPos: { x: 1, y: 1 },
  };

  private cursorPage = {
    x: {
      cursorPageX: 0,
      cursorPageY: 0,
      index: 0,
      updated: false,
    },
    y: {
      cursorPageX: 0,
      cursorPageY: 0,
      index: 0,
      updated: false,
    },
    z: {
      cursorPageX: 0,
      cursorPageY: 0,
      index: 0,
      updated: false,
    },
  };

  private gui_states: IGUIStates = {
    mainAreaSize: 1,
    dragSensitivity: 75,
    Eraser: false,
    globalAlpha: 0.7,
    lineWidth: 2,
    color: "#f50a33",
    segmentation: true,
    fillColor: "#00ff00",
    brushColor: "#00ff00",
    brushAndEraserSize: 15,
    cursor: "dot",
    label: "label1",
    sphere: false,
    readyToUpdate: true,
    defaultPaintCursor: switchPencilIcon("dot"),
    max_sensitive: 100,
    // EraserSize: 25,
    clear: () => {
      this.clearPaint();
    },
    clearAll: () => {
      const text = "Are you sure remove annotations on All slice?";
      if (confirm(text) === true) {
        this.nrrd_states.clearAllFlag = true;
        this.clearPaint();
        this.clearStoreImages();
      }
      this.nrrd_states.clearAllFlag = false;
    },
    undo: () => {
      this.undoLastPainting();
    },
    downloadCurrentMask: () => {
      const config: IDownloadImageConfig = {
        axis: this.protectedData.axis,
        currentIndex: this.nrrd_states.currentIndex,
        drawingCanvas: this.protectedData.canvases.drawingCanvas,
        originWidth: this.nrrd_states.originWidth,
        originHeight: this.nrrd_states.originHeight,
      };
      enableDownload(config);
    },
    resetZoom: () => {
      this.nrrd_states.sizeFoctor = 1;
      this.resizePaintArea(1);
      this.resetPaintArea();
    },
    subView: false,
    subViewScale: 1.0,
    resetView: () => {
      this.sceneIn?.resetView();
    },
    exportMarks: () => {
      this.exportData();
    },
  };

  private dragPrameters: IDragPrameters = {
    move: 0,
    y: 0,
    h: 0,
    sensivity: 1,
    handleOnDragMouseUp: (ev: MouseEvent) => {},
    handleOnDragMouseDown: (ev: MouseEvent) => {},
    handleOnDragMouseMove: (ev: MouseEvent) => {},
  };

  private drawingPrameters: IDrawingEvents = {
    handleOnDrawingMouseDown: (ev: MouseEvent) => {},
    handleOnDrawingMouseMove: (ev: MouseEvent) => {},
    handleOnPanMouseMove: (ev: MouseEvent) => {},
    handleOnDrawingMouseUp: (ev: MouseEvent) => {},
    handleOnDrawingMouseLeave: (ev: MouseEvent) => {},
    handleOnDrawingBrushCricleMove: (ev: MouseEvent) => {},
    handleZoomWheel: (e: WheelEvent) => {},
    handleSphereWheel: (e: WheelEvent) => {},
  };

  constructor(container: HTMLDivElement) {
    this.container = container;
    const canvases = this.generateCanvases();
    this.protectedData = {
      allSlicesArray: [],
      displaySlices: [],
      backUpDisplaySlices: [],
      skipSlicesDic: {},
      currentShowingSlice: undefined,
      mainPreSlices: undefined,
      Is_Shift_Pressed: false,
      Is_Draw: false,
      axis: "z",
      maskData: {
        // used to store one label all marks
        paintImagesLabel1: { x: [], y: [], z: [] },
        paintImagesLabel2: { x: [], y: [], z: [] },
        paintImagesLabel3: { x: [], y: [], z: [] },

        // used to store display marks with multiple labels
        paintImages: { x: [], y: [], z: [] },
      },
      canvases: {
        drawingCanvas: canvases[0],
        displayCanvas: canvases[1],
        drawingCanvasLayerMaster: canvases[2],
        drawingCanvasLayerOne: canvases[3],
        drawingCanvasLayerTwo: canvases[4],
        drawingCanvasLayerThree: canvases[5],
        drawingSphereCanvas: canvases[6],
        emptyCanvas: canvases[7],
      },
      ctxes: {
        drawingCtx: canvases[0].getContext("2d") as CanvasRenderingContext2D,
        displayCtx: canvases[1].getContext("2d") as CanvasRenderingContext2D,
        drawingLayerMasterCtx: canvases[2].getContext(
          "2d"
        ) as CanvasRenderingContext2D,
        drawingLayerOneCtx: canvases[3].getContext(
          "2d"
        ) as CanvasRenderingContext2D,
        drawingLayerTwoCtx: canvases[4].getContext(
          "2d"
        ) as CanvasRenderingContext2D,
        drawingLayerThreeCtx: canvases[5].getContext(
          "2d"
        ) as CanvasRenderingContext2D,
        drawingSphereCtx: canvases[6].getContext(
          "2d"
        ) as CanvasRenderingContext2D,
        emptyCtx: canvases[7].getContext("2d") as CanvasRenderingContext2D,
      },
    };

    this.storedPaintImages = {
      label1: this.protectedData.maskData.paintImagesLabel1,
      label2: this.protectedData.maskData.paintImagesLabel2,
      label3: this.protectedData.maskData.paintImagesLabel3,
    };

    this.previousDrawingImage =
      this.protectedData.ctxes.emptyCtx.createImageData(1, 1);
    this.init();

    this.dragOperator = new DragOperator(
      this.container,
      this.nrrd_states,
      this.gui_states,
      this.protectedData,
      this.dragPrameters,
      this.drawingPrameters,
      this.setSyncsliceNum,
      this.setIsDrawFalse,
      this.flipDisplayImageByAxis,
      this.setEmptyCanvasSize,
      this.filterDrawedImage
    );
  }

  private generateCanvases() {
    const canvasArr: Array<HTMLCanvasElement> = [];
    for (let i = 0; i < 8; i++) {
      const canvas = document.createElement("canvas");
      canvasArr.push(canvas);
    }
    return canvasArr;
  }
  /**
   * A initialise function for nrrd_tools
   */
  private init() {
    this.mainAreaContainer.classList.add("copper3D_drawingCanvasContainer");
    this.container.appendChild(this.mainAreaContainer);
    autoFocusDiv(this.container);

    this.container.addEventListener("keydown", (ev: KeyboardEvent) => {
      if (ev.key === "Shift" && !this.gui_states.sphere) {
        this.protectedData.Is_Shift_Pressed = true;
        this.nrrd_states.enableCursorChoose = false;
      }
      if (ev.key === "s") {
        this.protectedData.Is_Draw = false;
        this.nrrd_states.enableCursorChoose =
          !this.nrrd_states.enableCursorChoose;
      }
    });
    this.container.addEventListener("keyup", (ev: KeyboardEvent) => {
      if (ev.key === "Shift") {
        this.protectedData.Is_Shift_Pressed = false;
      }
    });
  }

  getMaskData(): IMaskData {
    return this.protectedData.maskData;
  }

  /**
   *
   * entry function
   *
   * @param allSlices - all nrrd contrast slices
   * {
   *    x:slice,
   *    y:slice,
   *    z:slice
   * }
   */
  setAllSlices(allSlices: Array<nrrdSliceType>) {
    this.protectedData.allSlicesArray = [...allSlices];

    const randomSlice = this.protectedData.allSlicesArray[0];
    this.nrrd_states.nrrd_x_mm = randomSlice.z.canvas.width;
    this.nrrd_states.nrrd_y_mm = randomSlice.z.canvas.height;
    this.nrrd_states.nrrd_z_mm = randomSlice.x.canvas.width;
    this.nrrd_states.nrrd_x_pixel = randomSlice.x.volume.dimensions[0];
    this.nrrd_states.nrrd_y_pixel = randomSlice.x.volume.dimensions[1];
    this.nrrd_states.nrrd_z_pixel = randomSlice.x.volume.dimensions[2];

    this.nrrd_states.voxelSpacing = randomSlice.x.volume.spacing;
    this.nrrd_states.ratios.x = randomSlice.x.volume.spacing[0];
    this.nrrd_states.ratios.y = randomSlice.x.volume.spacing[1];
    this.nrrd_states.ratios.z = randomSlice.x.volume.spacing[2];
    this.nrrd_states.dimensions = randomSlice.x.volume.dimensions;

    this.nrrd_states.spaceOrigin = (
      randomSlice.x.volume.header.space_origin as number[]
    ).map((item) => {
      return item * 1;
    }) as [];

    this.protectedData.allSlicesArray.forEach((item, index) => {
      item.x.contrastOrder = index;
      item.y.contrastOrder = index;
      item.z.contrastOrder = index;
    });

    this.nrrd_states.sharedPlace.x = this.getSharedPlace(
      this.nrrd_states.dimensions[0],
      this.nrrd_states.ratios.x
    );
    this.nrrd_states.sharedPlace.y = this.getSharedPlace(
      this.nrrd_states.dimensions[1],
      this.nrrd_states.ratios.y
    );
    this.nrrd_states.sharedPlace.z = this.getSharedPlace(
      this.nrrd_states.dimensions[2],
      this.nrrd_states.ratios.z
    );

    // init paintImages array
    this.initPaintImages(this.nrrd_states.dimensions);

    // init displayslices array, the axis default is "z"
    this.setDisplaySlicesBaseOnAxis();
    this.afterLoadSlice();
  }

  private loadingMaskByLabel(
    masks: exportPaintImageType[],
    index: number,
    imageData: ImageData
  ) {
    let imageDataLable = this.protectedData.ctxes.emptyCtx.createImageData(
      this.nrrd_states.nrrd_x_pixel,
      this.nrrd_states.nrrd_y_pixel
    );
    this.setEmptyCanvasSize();
    for (let j = 0; j < masks[index].data.length; j++) {
      imageDataLable.data[j] = masks[index].data[j];
      imageData.data[j] += masks[index].data[j];
    }
    return imageDataLable;
  }

  setMasksData(
    masksData: storeExportPaintImageType,
    loadingBar?: loadingBarType
  ) {
    if (!!masksData) {
      this.nrrd_states.loadMaskJson = true;
      if (loadingBar) {
        let { loadingContainer, progress } = loadingBar;
        loadingContainer.style.display = "flex";
        progress.innerText = "Loading masks data......";
      }

      this.setEmptyCanvasSize();

      const len = masksData["label1"].length;
      for (let i = 0; i < len; i++) {
        let imageData = this.protectedData.ctxes.emptyCtx.createImageData(
          this.nrrd_states.nrrd_x_pixel,
          this.nrrd_states.nrrd_y_pixel
        );
        let imageDataLabel1, imageDataLabel2, imageDataLabel3;
        if (masksData["label1"][i].data.length > 0) {
          this.setEmptyCanvasSize();
          imageDataLabel1 = this.loadingMaskByLabel(
            masksData["label1"],
            i,
            imageData
          );
          this.protectedData.ctxes.emptyCtx.putImageData(imageDataLabel1, 0, 0);
          this.storeEachLayerImage(i, "label1");
        }
        if (masksData["label2"][i].data.length > 0) {
          this.setEmptyCanvasSize();
          imageDataLabel2 = this.loadingMaskByLabel(
            masksData["label2"],
            i,
            imageData
          );
          this.protectedData.ctxes.emptyCtx.putImageData(imageDataLabel2, 0, 0);
          this.storeEachLayerImage(i, "label2");
        }
        if (masksData["label3"][i].data.length > 0) {
          this.setEmptyCanvasSize();
          imageDataLabel3 = this.loadingMaskByLabel(
            masksData["label3"],
            i,
            imageData
          );
          this.protectedData.ctxes.emptyCtx.putImageData(imageDataLabel3, 0, 0);
          this.storeEachLayerImage(i, "label3");
        }
        this.setEmptyCanvasSize();
        this.protectedData.ctxes.emptyCtx.putImageData(imageData, 0, 0);
        this.storeAllImages(i, "default");
      }

      this.nrrd_states.loadMaskJson = false;
      this.gui_states.resetZoom();
      if (loadingBar) {
        loadingBar.loadingContainer.style.display = "none";
      }
    }
  }

  setEraserUrls(urls: string[]) {
    this.eraserUrls = urls;
  }
  setPencilIconUrls(urls: string[]) {
    this.pencilUrls = urls;
    this.gui_states.defaultPaintCursor = switchPencilIcon(
      "dot",
      this.pencilUrls
    );
    this.protectedData.canvases.drawingCanvas.style.cursor =
      this.gui_states.defaultPaintCursor;
  }
  getCurrentImageDimension() {
    return this.nrrd_states.dimensions;
  }

  getVoxelSpacing() {
    return this.nrrd_states.voxelSpacing;
  }
  getSpaceOrigin() {
    return this.nrrd_states.spaceOrigin;
  }

  private getSharedPlace(len: number, ratio: number): number[] {
    let old = -1;
    let same: number[] = [];
    let temp = new Set<number>();
    for (let i = 0; i < len; i++) {
      const index = Math.floor(i * ratio);
      if (index === old) {
        temp.add(i - 1);
        temp.add(i);
      } else {
        old = index;
      }
    }

    temp.forEach((value) => {
      same.push(value);
    });
    return same;
  }

  /**
   * init all painted images for store images
   * @param dimensions
   */

  private initPaintImages(dimensions: Array<number>) {
    this.createEmptyPaintImage(
      dimensions,
      this.protectedData.maskData.paintImages
    );
    this.createEmptyPaintImage(
      dimensions,
      this.protectedData.maskData.paintImagesLabel1
    );
    this.createEmptyPaintImage(
      dimensions,
      this.protectedData.maskData.paintImagesLabel2
    );
    this.createEmptyPaintImage(
      dimensions,
      this.protectedData.maskData.paintImagesLabel3
    );
  }

  private createEmptyPaintImage(
    dimensions: Array<number>,
    paintImages: IPaintImages
  ) {
    for (let i = 0; i < dimensions[0]; i++) {
      const markImage_x = this.protectedData.ctxes.emptyCtx.createImageData(
        this.nrrd_states.nrrd_z_pixel,
        this.nrrd_states.nrrd_y_pixel
      );
      const initMark_x: IPaintImage = {
        index: i,
        image: markImage_x,
      };
      paintImages.x.push(initMark_x);
    }
    // for y slices' marks
    for (let i = 0; i < dimensions[1]; i++) {
      const markImage_y = this.protectedData.ctxes.emptyCtx.createImageData(
        this.nrrd_states.nrrd_x_pixel,
        this.nrrd_states.nrrd_z_pixel
      );
      const initMark_y: IPaintImage = {
        index: i,
        image: markImage_y,
      };
      paintImages.y.push(initMark_y);
    }
    // for z slices' marks
    for (let i = 0; i < dimensions[2]; i++) {
      const markImage_z = this.protectedData.ctxes.emptyCtx.createImageData(
        this.nrrd_states.nrrd_x_pixel,
        this.nrrd_states.nrrd_y_pixel
      );
      const initMark_z: IPaintImage = {
        index: i,
        image: markImage_z,
      };
      paintImages.z.push(initMark_z);
    }
  }

  private convertCursorPoint(
    from: "x" | "y" | "z",
    to: "x" | "y" | "z",
    cursorNumX: number,
    cursorNumY: number,
    currentSliceIndex: number
  ) {
    const nrrd = this.nrrd_states;
    const dimensions = nrrd.dimensions;
    const ratios = nrrd.ratios;
    const { nrrd_x_mm, nrrd_y_mm, nrrd_z_mm } = nrrd;

    let currentIndex = 0;
    let oldIndex = 0;
    let convertCursorNumX = 0;
    let convertCursorNumY = 0;

    const convertIndex = {
      x: {
        y: (val: number) => Math.ceil((val / nrrd_x_mm) * dimensions[0]),
        z: (val: number) => Math.ceil((val / nrrd_z_mm) * dimensions[2]),
      },
      y: {
        x: (val: number) => Math.ceil((val / nrrd_y_mm) * dimensions[1]),
        z: (val: number) => Math.ceil((val / nrrd_z_mm) * dimensions[2]),
      },
      z: {
        x: (val: number) => Math.ceil((val / nrrd_x_mm) * dimensions[0]),
        y: (val: number) => Math.ceil((val / nrrd_y_mm) * dimensions[1]),
      },
    };

    const convertCursor = {
      x: {
        y: (sliceIndex: number) =>
          Math.ceil((sliceIndex / dimensions[0]) * nrrd_x_mm),
        z: (sliceIndex: number) =>
          Math.ceil((sliceIndex / dimensions[0]) * nrrd_x_mm),
      },
      y: {
        x: (sliceIndex: number) =>
          Math.ceil((sliceIndex / dimensions[1]) * nrrd_y_mm),
        z: (sliceIndex: number) =>
          Math.ceil((sliceIndex / dimensions[1]) * nrrd_y_mm),
      },
      z: {
        x: (sliceIndex: number) =>
          Math.ceil((sliceIndex / dimensions[2]) * nrrd_z_mm),
        y: (sliceIndex: number) =>
          Math.ceil((sliceIndex / dimensions[2]) * nrrd_z_mm),
      },
    };

    if (from === to) {
      return;
    }
    if (from === "z" && to === "x") {
      currentIndex = convertIndex[from][to](cursorNumX);
      oldIndex = currentIndex * ratios[to];
      convertCursorNumX = convertCursor[from][to](currentSliceIndex);
      convertCursorNumY = cursorNumY;
    } else if (from === "y" && to === "x") {
      currentIndex = convertIndex[from][to](cursorNumX);
      oldIndex = currentIndex * ratios.x;
      convertCursorNumY = convertCursor[from][to](currentSliceIndex);
      convertCursorNumX = cursorNumY;
    } else if (from === "z" && to === "y") {
      currentIndex = convertIndex[from][to](cursorNumY);
      oldIndex = currentIndex * ratios[to];
      convertCursorNumY = convertCursor[from][to](currentSliceIndex);
      convertCursorNumX = cursorNumX;
    } else if (from === "x" && to === "y") {
      currentIndex = convertIndex[from][to](cursorNumY);
      oldIndex = currentIndex * ratios[to];
      convertCursorNumX = convertCursor[from][to](currentSliceIndex);
      convertCursorNumY = cursorNumX;
    } else if (from === "x" && to === "z") {
      currentIndex = convertIndex[from][to](cursorNumX);
      oldIndex = currentIndex * ratios[to];
      convertCursorNumX = convertCursor[from][to](currentSliceIndex);
      convertCursorNumY = cursorNumY;
    } else if (from === "y" && to === "z") {
      currentIndex = convertIndex[from][to](cursorNumY);
      oldIndex = currentIndex * ratios.z;
      convertCursorNumY = convertCursor[from][to](currentSliceIndex);
      convertCursorNumX = cursorNumX;
    } else {
      return;
    }

    return { currentIndex, oldIndex, convertCursorNumX, convertCursorNumY };
  }

  /**
   * Switch all contrast slices' orientation
   * @param {string} aixs:"x" | "y" | "z"
   *  */
  setSliceOrientation(axisTo: "x" | "y" | "z") {
    let convetObj;
    if (this.nrrd_states.enableCursorChoose || this.gui_states.sphere) {
      if (this.protectedData.axis === "z") {
        this.cursorPage.z.index = this.nrrd_states.currentIndex;
        this.cursorPage.z.cursorPageX = this.nrrd_states.cursorPageX;
        this.cursorPage.z.cursorPageY = this.nrrd_states.cursorPageY;
      } else if (this.protectedData.axis === "x") {
        this.cursorPage.x.index = this.nrrd_states.currentIndex;
        this.cursorPage.x.cursorPageX = this.nrrd_states.cursorPageX;
        this.cursorPage.x.cursorPageY = this.nrrd_states.cursorPageY;
      } else if (this.protectedData.axis === "y") {
        this.cursorPage.y.index = this.nrrd_states.currentIndex;
        this.cursorPage.y.cursorPageX = this.nrrd_states.cursorPageX;
        this.cursorPage.y.cursorPageY = this.nrrd_states.cursorPageY;
      }
      if (axisTo === "z") {
        if (this.nrrd_states.isCursorSelect && !this.cursorPage.z.updated) {
          if (this.protectedData.axis === "x") {
            // convert x to z
            convetObj = this.convertCursorPoint(
              "x",
              "z",
              this.cursorPage.x.cursorPageX,
              this.cursorPage.x.cursorPageY,
              this.cursorPage.x.index
            );
          }
          if (this.protectedData.axis === "y") {
            // convert y to z
            convetObj = this.convertCursorPoint(
              "y",
              "z",
              this.cursorPage.y.cursorPageX,
              this.cursorPage.y.cursorPageY,
              this.cursorPage.y.index
            );
          }
        } else {
          // not cursor select, freedom to switch x -> z or y -> z and z -> x or z -> y
          this.nrrd_states.currentIndex = this.cursorPage.z.index;
          this.nrrd_states.oldIndex =
            this.cursorPage.z.index * this.nrrd_states.ratios.z;
          this.nrrd_states.cursorPageX = this.cursorPage.z.cursorPageX;
          this.nrrd_states.cursorPageY = this.cursorPage.z.cursorPageY;
        }
      } else if (axisTo === "x") {
        if (this.nrrd_states.isCursorSelect && !this.cursorPage.x.updated) {
          if (this.protectedData.axis === "z") {
            // convert z to x
            convetObj = this.convertCursorPoint(
              "z",
              "x",
              this.cursorPage.z.cursorPageX,
              this.cursorPage.z.cursorPageY,
              this.cursorPage.z.index
            );
          }
          if (this.protectedData.axis === "y") {
            // convert y to x
            convetObj = this.convertCursorPoint(
              "y",
              "x",
              this.cursorPage.y.cursorPageX,
              this.cursorPage.y.cursorPageY,
              this.cursorPage.y.index
            );
          }
        } else {
          // not cursor select, freedom to switch z -> x or y -> x and x -> z or x -> y
          this.nrrd_states.currentIndex = this.cursorPage.x.index;
          this.nrrd_states.oldIndex =
            this.cursorPage.x.index * this.nrrd_states.ratios.x;
          this.nrrd_states.cursorPageX = this.cursorPage.x.cursorPageX;
          this.nrrd_states.cursorPageY = this.cursorPage.x.cursorPageY;
        }
      } else if (axisTo === "y") {
        if (this.nrrd_states.isCursorSelect && !this.cursorPage.y.updated) {
          if (this.protectedData.axis === "z") {
            // convert z to y
            convetObj = this.convertCursorPoint(
              "z",
              "y",
              this.cursorPage.z.cursorPageX,
              this.cursorPage.z.cursorPageY,
              this.cursorPage.z.index
            );
          }
          if (this.protectedData.axis === "x") {
            // convert x to y
            convetObj = this.convertCursorPoint(
              "x",
              "y",
              this.cursorPage.x.cursorPageX,
              this.cursorPage.x.cursorPageY,
              this.cursorPage.x.index
            );
          }
        } else {
          // not cursor select, freedom to switch z -> y or x -> y and y -> z or y -> x
          this.nrrd_states.currentIndex = this.cursorPage.y.index;
          this.nrrd_states.oldIndex =
            this.cursorPage.y.index * this.nrrd_states.ratios.y;
          this.nrrd_states.cursorPageX = this.cursorPage.y.cursorPageX;
          this.nrrd_states.cursorPageY = this.cursorPage.y.cursorPageY;
        }
      }

      if (convetObj) {
        // update convert cursor point, when cursor select
        this.nrrd_states.currentIndex = convetObj.currentIndex;
        this.nrrd_states.oldIndex = convetObj.oldIndex;
        this.nrrd_states.cursorPageX = convetObj.convertCursorNumX;
        this.nrrd_states.cursorPageY = convetObj.convertCursorNumY;
        convetObj = undefined;
        switch (axisTo) {
          case "x":
            this.cursorPage.x.updated = true;
            break;
          case "y":
            this.cursorPage.y.updated = true;
            break;
          case "z":
            this.cursorPage.z.updated = true;
            break;
        }
      }

      if (
        this.cursorPage.x.updated &&
        this.cursorPage.y.updated &&
        this.cursorPage.z.updated
      ) {
        // one point convert to all axis, reset all updated status
        this.nrrd_states.isCursorSelect = false;
      }
    }

    this.protectedData.axis = axisTo;
    this.resetDisplaySlicesStatus();
    // for sphere plan a
    if (this.gui_states.sphere && !this.nrrd_states.spherePlanB) {
      this.drawSphere(
        this.nrrd_states.sphereOrigin[axisTo][0],
        this.nrrd_states.sphereOrigin[axisTo][1],
        this.nrrd_states.sphereRadius
      );
    }
  }

  addSkip(index: number) {
    this.protectedData.skipSlicesDic[index] =
      this.protectedData.backUpDisplaySlices[index];
    if (index >= this.protectedData.displaySlices.length) {
      this.nrrd_states.contrastNum = this.protectedData.displaySlices.length;
    } else {
      this.nrrd_states.contrastNum = index;
    }

    this.resetDisplaySlicesStatus();
  }

  removeSkip(index: number) {
    this.protectedData.skipSlicesDic[index] = undefined;
    this.nrrd_states.contrastNum = 0;
    this.resetDisplaySlicesStatus();
  }

  clear() {
    // To effectively reduce the js memory garbage
    this.protectedData.allSlicesArray.length = 0;
    this.protectedData.displaySlices.length = 0;
    this.undoArray.length = 0;
    this.protectedData.maskData.paintImages.x.length = 0;
    this.protectedData.maskData.paintImages.y.length = 0;
    this.protectedData.maskData.paintImages.z.length = 0;
    this.protectedData.maskData.paintImagesLabel1.x.length = 0;
    this.protectedData.maskData.paintImagesLabel1.y.length = 0;
    this.protectedData.maskData.paintImagesLabel1.z.length = 0;
    this.protectedData.maskData.paintImagesLabel2.x.length = 0;
    this.protectedData.maskData.paintImagesLabel2.y.length = 0;
    this.protectedData.maskData.paintImagesLabel2.z.length = 0;
    this.protectedData.maskData.paintImagesLabel3.x.length = 0;
    this.protectedData.maskData.paintImagesLabel3.y.length = 0;
    this.protectedData.maskData.paintImagesLabel3.z.length = 0;

    this.clearDictionary(this.protectedData.skipSlicesDic);

    // this.nrrd_states.previousPanelL = this.nrrd_states.previousPanelT = -99999;
    this.protectedData.canvases.displayCanvas.style.left =
      this.protectedData.canvases.drawingCanvas.style.left = "";
    this.protectedData.canvases.displayCanvas.style.top =
      this.protectedData.canvases.drawingCanvas.style.top = "";

    this.protectedData.backUpDisplaySlices.length = 0;
    this.protectedData.mainPreSlices = undefined;
    this.protectedData.currentShowingSlice = undefined;
    this.previousDrawingImage =
      this.protectedData.ctxes.emptyCtx.createImageData(1, 1);
    this.initState = true;
    this.protectedData.axis = "z";
    this.nrrd_states.sizeFoctor = 1;
    this.resetLayerCanvas();
    this.protectedData.canvases.drawingCanvas.width =
      this.protectedData.canvases.drawingCanvas.width;
    this.protectedData.canvases.displayCanvas.width =
      this.protectedData.canvases.displayCanvas.width;
  }

  setSliceMoving(step: number) {
    if (this.protectedData.mainPreSlices) {
      this.protectedData.Is_Draw = true;
      this.setSyncsliceNum();
      this.dragOperator.updateIndex(step);
      this.setIsDrawFalse(1000);
    }
  }

  setShowInMainArea(isShowContrast: boolean) {
    this.nrrd_states.showContrast = isShowContrast;
    this.nrrd_states.contrastNum = 0;
    if (this.protectedData.mainPreSlices) {
      this.redrawMianPreOnDisplayCanvas();
      this.dragOperator.updateShowNumDiv(this.nrrd_states.contrastNum);
    }
  }

  setMainAreaSize(factor: number) {
    this.nrrd_states.sizeFoctor += factor;

    if (this.nrrd_states.sizeFoctor >= 8) {
      this.nrrd_states.sizeFoctor = 8;
    } else if (this.nrrd_states.sizeFoctor <= 1) {
      this.nrrd_states.sizeFoctor = 1;
    }
    this.resizePaintArea(this.nrrd_states.sizeFoctor);
    this.resetPaintArea();
    this.setIsDrawFalse(1000);
  }

  getContainer() {
    return this.mainAreaContainer;
  }
  getDrawingCanvas() {
    return this.protectedData.canvases.drawingCanvas;
  }
  getNrrdToolsSettings() {
    return this.nrrd_states;
  }

  getMaxSliceNum(): number[] {
    if (this.nrrd_states.showContrast) {
      return [
        this.nrrd_states.maxIndex,
        this.nrrd_states.maxIndex * this.protectedData.displaySlices.length,
      ];
    } else {
      return [this.nrrd_states.maxIndex];
    }
  }
  getCurrentSlicesNumAndContrastNum() {
    return {
      currentIndex: this.nrrd_states.currentIndex,
      contrastIndex: this.nrrd_states.contrastNum,
    };
  }

  getCurrentSliceIndex() {
    return Math.ceil(
      this.protectedData.mainPreSlices.index / this.nrrd_states.RSARatio
    );
  }

  getIsShowContrastState() {
    return this.nrrd_states.showContrast;
  }

  private setIsDrawFalse(target: number) {
    this.preTimer = setTimeout(() => {
      this.protectedData.Is_Draw = false;
      if (this.preTimer) {
        window.clearTimeout(this.preTimer);
        this.preTimer = undefined;
      }
    }, target);
  }

  private setDisplaySlicesBaseOnAxis() {
    this.protectedData.displaySlices.length = 0;
    this.protectedData.backUpDisplaySlices.length = 0;

    this.protectedData.allSlicesArray.forEach((slices) => {
      this.protectedData.backUpDisplaySlices.push(
        slices[this.protectedData.axis]
      );
    });

    this.loadDisplaySlicesArray();
  }

  private loadDisplaySlicesArray() {
    const remainSlices = Object.values(this.protectedData.skipSlicesDic);
    if (remainSlices.length === 0) {
      // load all display slices
      this.protectedData.backUpDisplaySlices.forEach((slice, index) => {
        this.protectedData.skipSlicesDic[index] = slice;
        this.protectedData.displaySlices.push(slice);
      });
    } else {
      remainSlices.forEach((slice, index) => {
        if (!!slice) {
          this.protectedData.displaySlices.push(
            this.protectedData.backUpDisplaySlices[index]
          );
          this.protectedData.skipSlicesDic[index] =
            this.protectedData.backUpDisplaySlices[index];
        }
      });
    }
  }

  switchAllSlicesArrayData(allSlices: Array<nrrdSliceType>) {
    this.protectedData.allSlicesArray.length = 0;
    this.protectedData.allSlicesArray = [...allSlices];
    this.resetDisplaySlicesStatus();
  }

  private resetDisplaySlicesStatus() {
    // reload slice data
    this.setDisplaySlicesBaseOnAxis();
    // reset canvas attribute for drag and draw
    this.setupConfigs();
  }

  private setupConfigs() {
    // reset main slice
    this.setMainPreSlice();
    // update the max index for drag and slider
    this.updateMaxIndex();
    // reset origin canvas and the nrrd_states origin Width/height
    // reset the current index
    this.setOriginCanvasAndPre();
    // update the show number div on top area
    this.dragOperator.updateShowNumDiv(this.nrrd_states.contrastNum);
    // repaint all contrast images
    this.repraintCurrentContrastSlice();
    // resize the draw/drawOutLayer/display canvas size
    this.resizePaintArea(this.nrrd_states.sizeFoctor);
    this.resetPaintArea();
  }

  private setMainPreSlice() {
    this.protectedData.mainPreSlices = this.protectedData.displaySlices[0];
    if (this.protectedData.mainPreSlices) {
      this.nrrd_states.RSARatio = this.protectedData.mainPreSlices.RSARatio;
    }
  }

  private setOriginCanvasAndPre() {
    if (this.protectedData.mainPreSlices) {
      if (this.nrrd_states.oldIndex > this.nrrd_states.maxIndex)
        this.nrrd_states.oldIndex = this.nrrd_states.maxIndex;

      if (this.initState) {
        this.nrrd_states.oldIndex =
          this.protectedData.mainPreSlices.initIndex *
          this.nrrd_states.RSARatio;
        this.nrrd_states.currentIndex =
          this.protectedData.mainPreSlices.initIndex;
      } else {
        // !need to change
        // todo
        this.protectedData.mainPreSlices.index = this.nrrd_states.oldIndex;
      }

      this.originCanvas = this.protectedData.mainPreSlices.canvas;
      this.updateOriginAndChangedWH();
    }
  }

  private afterLoadSlice() {
    this.setMainPreSlice();
    this.setOriginCanvasAndPre();
    this.protectedData.currentShowingSlice = this.protectedData.mainPreSlices;
    this.nrrd_states.oldIndex =
      this.protectedData.mainPreSlices.initIndex * this.nrrd_states.RSARatio;
    this.nrrd_states.currentIndex = this.protectedData.mainPreSlices.initIndex;
    this.undoArray = [
      {
        sliceIndex: this.nrrd_states.currentIndex,
        layers: { label1: [], label2: [], label3: [] },
      },
    ];

    // compute max index
    this.updateMaxIndex();
    this.dragOperator.updateShowNumDiv(this.nrrd_states.contrastNum);
    this.initState = false;
  }

  private updateMaxIndex() {
    if (this.protectedData.mainPreSlices) {
      this.nrrd_states.maxIndex = this.protectedData.mainPreSlices.MaxIndex;
    }
  }

  private updateOriginAndChangedWH() {
    this.nrrd_states.originWidth = this.originCanvas.width;
    this.nrrd_states.originHeight = this.originCanvas.height;
    this.nrrd_states.changedWidth =
      this.nrrd_states.originWidth * Number(this.gui_states.mainAreaSize);
    this.nrrd_states.changedHeight =
      this.nrrd_states.originWidth * Number(this.gui_states.mainAreaSize);
    this.resizePaintArea(1);
    this.resetPaintArea();
  }

  private initAllCanvas() {
    /**
     * display canvas
     */
    this.protectedData.canvases.displayCanvas.style.position = "absolute";
    this.protectedData.canvases.displayCanvas.style.zIndex = "9";
    this.protectedData.canvases.displayCanvas.width =
      this.nrrd_states.changedWidth;
    this.protectedData.canvases.displayCanvas.height =
      this.nrrd_states.changedHeight;

    /**
     * drawing canvas
     */
    this.protectedData.canvases.drawingCanvas.style.zIndex = "10";
    this.protectedData.canvases.drawingCanvas.style.position = "absolute";

    this.protectedData.canvases.drawingCanvas.width =
      this.nrrd_states.changedWidth;
    this.protectedData.canvases.drawingCanvas.height =
      this.nrrd_states.changedHeight;
    this.protectedData.canvases.drawingCanvas.style.cursor =
      this.gui_states.defaultPaintCursor;
    this.protectedData.canvases.drawingCanvas.oncontextmenu = () => false;

    /**
     * layer1
     * it should be hide, so we don't need to add it to mainAreaContainer
     */

    this.protectedData.canvases.drawingCanvasLayerMaster.width =
      this.protectedData.canvases.drawingCanvasLayerOne.width =
      this.protectedData.canvases.drawingCanvasLayerTwo.width =
      this.protectedData.canvases.drawingCanvasLayerThree.width =
        this.nrrd_states.changedWidth;
    this.protectedData.canvases.drawingCanvasLayerMaster.height =
      this.protectedData.canvases.drawingCanvasLayerOne.height =
      this.protectedData.canvases.drawingCanvasLayerTwo.height =
      this.protectedData.canvases.drawingCanvasLayerThree.height =
        this.nrrd_states.changedHeight;

    /**
     * display and drawing canvas container
     */
    // this.mainAreaContainer.style.width = this.nrrd_states.changedWidth + "px";
    // this.mainAreaContainer.style.height = this.nrrd_states.changedHeight + "px";
    this.mainAreaContainer.style.width =
      this.nrrd_states.originWidth * 8 + "px";
    this.mainAreaContainer.style.height =
      this.nrrd_states.originHeight * 8 + "px";
    this.mainAreaContainer.appendChild(
      this.protectedData.canvases.displayCanvas
    );
    this.mainAreaContainer.appendChild(
      this.protectedData.canvases.drawingCanvas
    );
  }

  private setSyncsliceNum() {
    this.protectedData.displaySlices.forEach((slice, index) => {
      if (index !== 0) {
        slice.index = this.protectedData.mainPreSlices.index;
      }
    });
  }

  private repraintCurrentContrastSlice() {
    this.setSyncsliceNum();
    this.protectedData.displaySlices.forEach((slice, index) => {
      slice.repaint.call(slice);
    });
  }

  private repraintAllContrastSlices() {
    this.protectedData.displaySlices.forEach((slice, index) => {
      slice.volume.repaintAllSlices();
    });
  }

  appendLoadingbar(loadingbar: HTMLDivElement) {
    this.mainAreaContainer.appendChild(loadingbar);
  }

  drag(opts?: IDragOpts) {
    this.dragOperator.drag(opts);
  }

  draw(sceneIn: copperMScene | copperScene, gui: GUI, opts?: IDrawOpts) {
    let modeFolder: GUI;
    let subViewFolder: GUI;

    if (!!opts) {
      this.nrrd_states.getMask = opts?.getMaskData as any;
    }

    this.sceneIn = sceneIn;
    sceneIn.controls.enabled = false;

    if (this.gui_states.subView === false) {
      sceneIn.subDiv && (sceneIn.subDiv.style.display = "none");
    }
    /**
     * GUI
     */

    modeFolder = gui.addFolder("Mode Parameters");

    if (sceneIn.subDiv) {
      subViewFolder = gui.addFolder("Sub View");
      subViewFolder.add(this.gui_states, "resetView");
      subViewFolder.add(this.gui_states, "subView").onChange((value) => {
        if (value) {
          sceneIn.controls.enabled = true;
          sceneIn.subDiv && (sceneIn.subDiv.style.display = "block");
        } else {
          sceneIn.subDiv && (sceneIn.subDiv.style.display = "none");
          sceneIn.controls.enabled = false;
        }
      });
      subViewFolder
        .add(this.gui_states, "subViewScale")
        .min(0.25)
        .max(2)
        .step(0.01)
        .onFinishChange((value) => {
          sceneIn.subDiv && (sceneIn.subDiv.style.width = 200 * value + "px");
          sceneIn.subDiv && (sceneIn.subDiv.style.height = 200 * value + "px");
        });
    }

    this.paintOnCanvas(modeFolder);
  }

  private paintOnCanvas(modeFolder: GUI) {
    /**
     * drag paint panel
     */
    let leftclicked = false;
    let rightclicked = false;
    let panelMoveInnerX = 0;
    let panelMoveInnerY = 0;

    // todo
    // let currentSliceIndex = this.protectedData.mainPreSlices.index;
    let currentSliceIndex = this.protectedData.mainPreSlices.index;

    // draw lines starts position
    let Is_Painting = false;
    let lines: Array<mouseMovePositionType> = [];
    const clearArc = this.useEraser();

    this.updateOriginAndChangedWH();

    this.initAllCanvas();

    const guiOptions = {
      modeFolder,
      gui_states: this.gui_states,
      drawingCanvas: this.protectedData.canvases.drawingCanvas,
      drawingPrameters: this.drawingPrameters,
      eraserUrls: this.eraserUrls,
      pencilUrls: this.pencilUrls,
      mainPreSlices: this.protectedData.mainPreSlices,
      canvasSizeFoctor: this.nrrd_states.sizeFoctor,
      removeDragMode: this.dragOperator.removeDragMode,
      configDragMode: this.dragOperator.configDragMode,
      clearPaint: this.clearPaint,
      clearStoreImages: this.clearStoreImages,
      updateSlicesContrast: this.updateSlicesContrast,
      resetPaintArea: this.resetPaintArea,
      repraintAllContrastSlices: this.repraintAllContrastSlices,
      resizePaintArea: this.resizePaintArea,
    };
    setupGui(guiOptions);

    this.protectedData.ctxes.displayCtx?.save();
    this.flipDisplayImageByAxis();
    this.protectedData.ctxes.displayCtx?.drawImage(
      this.originCanvas,
      0,
      0,
      this.nrrd_states.changedWidth,
      this.nrrd_states.changedHeight
    );

    this.protectedData.ctxes.displayCtx?.restore();

    this.previousDrawingImage =
      this.protectedData.ctxes.drawingCtx.getImageData(
        0,
        0,
        this.protectedData.canvases.drawingCanvas.width,
        this.protectedData.canvases.drawingCanvas.height
      );

    // let a global variable to store the wheel move event
    this.drawingPrameters.handleZoomWheel = this.configMouseZoomWheel(
      this.sceneIn?.controls
    );
    // init to add it
    this.protectedData.canvases.drawingCanvas.addEventListener(
      "wheel",
      this.drawingPrameters.handleZoomWheel,
      {
        passive: false,
      }
    );
    // sphere Wheel
    this.drawingPrameters.handleSphereWheel = this.configMouseSphereWheel();

    // pan move
    this.drawingPrameters.handleOnPanMouseMove = (e: MouseEvent) => {
      this.protectedData.canvases.drawingCanvas.style.cursor = "grabbing";
      this.nrrd_states.previousPanelL = e.clientX - panelMoveInnerX;
      this.nrrd_states.previousPanelT = e.clientY - panelMoveInnerY;
      this.protectedData.canvases.displayCanvas.style.left =
        this.protectedData.canvases.drawingCanvas.style.left =
          this.nrrd_states.previousPanelL + "px";
      this.protectedData.canvases.displayCanvas.style.top =
        this.protectedData.canvases.drawingCanvas.style.top =
          this.nrrd_states.previousPanelT + "px";
    };

    // brush circle move
    this.drawingPrameters.handleOnDrawingBrushCricleMove = (e: MouseEvent) => {
      e.preventDefault();
      this.nrrd_states.Mouse_Over_x = e.offsetX;
      this.nrrd_states.Mouse_Over_y = e.offsetY;
      if (this.nrrd_states.Mouse_Over_x === undefined) {
        this.nrrd_states.Mouse_Over_x = e.clientX;
        this.nrrd_states.Mouse_Over_y = e.clientY;
      }
      if (e.type === "mouseout") {
        this.nrrd_states.Mouse_Over = false;
        this.protectedData.canvases.drawingCanvas.removeEventListener(
          "mousemove",
          this.drawingPrameters.handleOnDrawingBrushCricleMove
        );
      } else if (e.type === "mouseover") {
        this.nrrd_states.Mouse_Over = true;
        this.protectedData.canvases.drawingCanvas.addEventListener(
          "mousemove",
          this.drawingPrameters.handleOnDrawingBrushCricleMove
        );
      }
    };

    // drawing move
    this.drawingPrameters.handleOnDrawingMouseMove = (e: MouseEvent) => {
      this.protectedData.Is_Draw = true;
      if (Is_Painting) {
        if (this.gui_states.Eraser) {
          this.nrrd_states.stepClear = 1;
          // drawingCtx.clearRect(e.offsetX - 5, e.offsetY - 5, 25, 25);
          clearArc(e.offsetX, e.offsetY, this.gui_states.brushAndEraserSize);
        } else {
          lines.push({ x: e.offsetX, y: e.offsetY });
          this.paintOnCanvasLayer(e.offsetX, e.offsetY);
        }
      }
    };
    this.drawingPrameters.handleOnDrawingMouseDown = (e: MouseEvent) => {
      if (leftclicked || rightclicked) {
        this.protectedData.canvases.drawingCanvas.removeEventListener(
          "pointerup",
          this.drawingPrameters.handleOnDrawingMouseUp
        );
        this.protectedData.ctxes.drawingLayerMasterCtx.closePath();
        return;
      }

      // when switch slice, clear previousDrawingImage
      // todo
      if (currentSliceIndex !== this.protectedData.mainPreSlices.index) {
        this.previousDrawingImage =
          this.protectedData.ctxes.emptyCtx.createImageData(1, 1);
        currentSliceIndex = this.protectedData.mainPreSlices.index;
      }

      // remove it when mouse click down
      this.protectedData.canvases.drawingCanvas.removeEventListener(
        "wheel",
        this.drawingPrameters.handleZoomWheel
      );

      if (e.button === 0) {
        if (this.protectedData.Is_Shift_Pressed) {
          leftclicked = true;
          lines = [];
          Is_Painting = true;
          this.protectedData.Is_Draw = true;

          if (this.gui_states.Eraser) {
            // this.protectedData.canvases.drawingCanvas.style.cursor =
            //   "url(https://raw.githubusercontent.com/LinkunGao/copper3d-datasets/main/icons/eraser/circular-cursor_48.png) 48 48, crosshair";
            this.eraserUrls.length > 0
              ? (this.protectedData.canvases.drawingCanvas.style.cursor =
                  switchEraserSize(
                    this.gui_states.brushAndEraserSize,
                    this.eraserUrls
                  ))
              : (this.protectedData.canvases.drawingCanvas.style.cursor =
                  switchEraserSize(this.gui_states.brushAndEraserSize));
          } else {
            this.protectedData.canvases.drawingCanvas.style.cursor =
              this.gui_states.defaultPaintCursor;
          }

          this.nrrd_states.drawStartPos.x = e.offsetX;
          this.nrrd_states.drawStartPos.y = e.offsetY;

          this.protectedData.canvases.drawingCanvas.addEventListener(
            "pointerup",
            this.drawingPrameters.handleOnDrawingMouseUp
          );
          this.protectedData.canvases.drawingCanvas.addEventListener(
            "pointermove",
            this.drawingPrameters.handleOnDrawingMouseMove
          );
        } else if (this.nrrd_states.enableCursorChoose) {
          this.nrrd_states.cursorPageX =
            e.offsetX / this.nrrd_states.sizeFoctor;
          this.nrrd_states.cursorPageY =
            e.offsetY / this.nrrd_states.sizeFoctor;
          this.enableCrosshair();
        } else if (this.gui_states.sphere) {
          let mouseX = e.offsetX;
          let mouseY = e.offsetY;

          //  record mouseX,Y, and enable crosshair function
          this.nrrd_states.sphereOrigin[this.protectedData.axis] = [
            mouseX,
            mouseY,
            this.nrrd_states.currentIndex,
          ];
          this.setUpSphereOrigins(mouseX, mouseY);
          this.nrrd_states.cursorPageX = mouseX;
          this.nrrd_states.cursorPageY = mouseY;
          this.enableCrosshair();

          // draw circle setup width/height for sphere canvas
          this.drawSphere(mouseX, mouseY, this.nrrd_states.sphereRadius);
          this.protectedData.canvases.drawingCanvas.addEventListener(
            "wheel",
            this.drawingPrameters.handleSphereWheel,
            true
          );
          this.protectedData.canvases.drawingCanvas.addEventListener(
            "pointerup",
            this.drawingPrameters.handleOnDrawingMouseUp
          );
        }
      } else if (e.button === 2) {
        rightclicked = true;

        // let offsetX = parseInt(this.protectedData.canvases.drawingCanvas.style.left);
        // let offsetY = parseInt(this.protectedData.canvases.drawingCanvas.style.top);
        let offsetX = this.protectedData.canvases.drawingCanvas.offsetLeft;
        let offsetY = this.protectedData.canvases.drawingCanvas.offsetTop;

        panelMoveInnerX = e.clientX - offsetX;
        panelMoveInnerY = e.clientY - offsetY;

        this.protectedData.canvases.drawingCanvas.style.cursor = "grab";
        this.protectedData.canvases.drawingCanvas.addEventListener(
          "pointerup",
          this.drawingPrameters.handleOnDrawingMouseUp
        );
        this.protectedData.canvases.drawingCanvas.addEventListener(
          "pointermove",
          this.drawingPrameters.handleOnPanMouseMove
        );
      } else {
        return;
      }
    };
    // disable browser right click menu
    this.protectedData.canvases.drawingCanvas.addEventListener(
      "pointerdown",
      this.drawingPrameters.handleOnDrawingMouseDown,
      true
    );

    const redrawPreviousImageToLabelCtx = (
      ctx: CanvasRenderingContext2D,
      label: string = "default"
    ) => {
      let paintImages: IPaintImages;
      switch (label) {
        case "label1":
          paintImages = this.protectedData.maskData.paintImagesLabel1;
          break;
        case "label2":
          paintImages = this.protectedData.maskData.paintImagesLabel2;
          break;
        case "label3":
          paintImages = this.protectedData.maskData.paintImagesLabel3;
          break;
        default:
          paintImages = this.protectedData.maskData.paintImages;
          break;
      }
      const tempPreImg = this.filterDrawedImage(
        this.protectedData.axis,
        this.nrrd_states.currentIndex,
        paintImages
      )?.image;
      this.protectedData.canvases.emptyCanvas.width =
        this.protectedData.canvases.emptyCanvas.width;

      if (tempPreImg && label == "default") {
        this.previousDrawingImage = tempPreImg;
      }
      this.protectedData.ctxes.emptyCtx.putImageData(tempPreImg, 0, 0);
      // draw privous image
      ctx.drawImage(
        this.protectedData.canvases.emptyCanvas,
        0,
        0,
        this.nrrd_states.changedWidth,
        this.nrrd_states.changedHeight
      );
    };

    this.drawingPrameters.handleOnDrawingMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        if (this.protectedData.Is_Shift_Pressed || Is_Painting) {
          leftclicked = false;
          let { ctx, canvas } = this.setCurrentLayer();

          ctx.closePath();

          this.protectedData.canvases.drawingCanvas.removeEventListener(
            "pointermove",
            this.drawingPrameters.handleOnDrawingMouseMove
          );
          if (!this.gui_states.Eraser) {
            if (this.gui_states.segmentation) {
              this.protectedData.canvases.drawingCanvasLayerMaster.width =
                this.protectedData.canvases.drawingCanvasLayerMaster.width;
              canvas.width = canvas.width;
              redrawPreviousImageToLabelCtx(
                this.protectedData.ctxes.drawingLayerMasterCtx
              );
              redrawPreviousImageToLabelCtx(ctx, this.gui_states.label);
              // draw new drawings
              ctx.beginPath();
              ctx.moveTo(lines[0].x, lines[0].y);
              for (let i = 1; i < lines.length; i++) {
                ctx.lineTo(lines[i].x, lines[i].y);
              }
              ctx.closePath();
              ctx.lineWidth = 1;
              ctx.fillStyle = this.gui_states.fillColor;
              ctx.fill();
              // draw layer to master layer
              this.protectedData.ctxes.drawingLayerMasterCtx.drawImage(
                canvas,
                0,
                0,
                this.nrrd_states.changedWidth,
                this.nrrd_states.changedHeight
              );
            }
          }

          this.previousDrawingImage =
            this.protectedData.ctxes.drawingLayerMasterCtx.getImageData(
              0,
              0,
              this.protectedData.canvases.drawingCanvasLayerMaster.width,
              this.protectedData.canvases.drawingCanvasLayerMaster.height
            );
          this.storeAllImages(
            this.nrrd_states.currentIndex,
            this.gui_states.label
          );
          if (this.gui_states.Eraser) {
            const restLabels = this.getRestLabel();
            this.storeEachLayerImage(
              this.nrrd_states.currentIndex,
              restLabels[0]
            );
            this.storeEachLayerImage(
              this.nrrd_states.currentIndex,
              restLabels[1]
            );
          }

          Is_Painting = false;

          /**
           * store undo array
           */
          const currentUndoObj = this.getCurrentUndo();
          const src =
            this.protectedData.canvases.drawingCanvasLayerMaster.toDataURL();
          const image = new Image();
          image.src = src;
          if (currentUndoObj.length > 0) {
            currentUndoObj[0].layers[
              this.gui_states.label as "label1" | "label2" | "label3"
            ].push(image);
          } else {
            const undoObj: undoType = {
              sliceIndex: this.nrrd_states.currentIndex,
              layers: { label1: [], label2: [], label3: [] },
            };
            undoObj.layers[
              this.gui_states.label as "label1" | "label2" | "label3"
            ].push(image);
            this.undoArray.push(undoObj);
          }
          // add wheel after pointer up
          this.protectedData.canvases.drawingCanvas.addEventListener(
            "wheel",
            this.drawingPrameters.handleZoomWheel,
            {
              passive: false,
            }
          );
        } else if (
          this.gui_states.sphere &&
          !this.nrrd_states.enableCursorChoose
        ) {
          // let { ctx, canvas } = this.setCurrentLayer();
          // let mouseX = e.offsetX;
          // let mouseY = e.offsetY;

          // plan B
          // findout all index in the sphere radius range in Axial view
          if (this.nrrd_states.spherePlanB) {
            // clear stroe images
            this.clearStoreImages();
            for (let i = 0; i < this.nrrd_states.sphereRadius; i++) {
              this.drawSphereOnEachViews(i, "x");
              this.drawSphereOnEachViews(i, "y");
              this.drawSphereOnEachViews(i, "z");
            }
          }

          this.protectedData.canvases.drawingCanvas.removeEventListener(
            "wheel",
            this.drawingPrameters.handleSphereWheel,
            true
          );
        }
      } else if (e.button === 2) {
        rightclicked = false;
        this.protectedData.canvases.drawingCanvas.style.cursor = "grab";
        this.protectedData.canvases.drawingCanvas.removeEventListener(
          "pointermove",
          this.drawingPrameters.handleOnPanMouseMove
        );
      } else {
        return;
      }

      if (!this.gui_states.segmentation) {
        this.setIsDrawFalse(100);
      }
    };

    this.protectedData.canvases.drawingCanvas.addEventListener(
      "pointerleave",
      (e: MouseEvent) => {
        Is_Painting = false;
        // (this.sceneIn as copperScene).controls.enabled = true;
        if (leftclicked) {
          leftclicked = false;
          this.protectedData.ctxes.drawingLayerMasterCtx.closePath();
          this.protectedData.canvases.drawingCanvas.removeEventListener(
            "pointermove",
            this.drawingPrameters.handleOnDrawingMouseMove
          );
          this.protectedData.canvases.drawingCanvas.removeEventListener(
            "wheel",
            this.drawingPrameters.handleSphereWheel,
            true
          );
        }
        if (rightclicked) {
          rightclicked = false;
          this.protectedData.canvases.drawingCanvas.style.cursor = "grab";
          this.protectedData.canvases.drawingCanvas.removeEventListener(
            "pointermove",
            this.drawingPrameters.handleOnPanMouseMove
          );
        }

        this.setIsDrawFalse(100);
        if (this.gui_states.segmentation) {
          this.setIsDrawFalse(1000);
        }
      }
    );

    this.start = () => {
      if (this.gui_states.readyToUpdate) {
        this.protectedData.ctxes.drawingCtx.clearRect(
          0,
          0,
          this.nrrd_states.changedWidth,
          this.nrrd_states.changedHeight
        );
        this.protectedData.ctxes.drawingCtx.globalAlpha =
          this.gui_states.globalAlpha;
        if (this.protectedData.Is_Draw) {
          this.protectedData.ctxes.drawingLayerMasterCtx.lineCap = "round";
          this.protectedData.ctxes.drawingLayerMasterCtx.globalAlpha = 1;
          this.protectedData.ctxes.drawingLayerOneCtx.lineCap = "round";
          this.protectedData.ctxes.drawingLayerOneCtx.globalAlpha = 1;
          this.protectedData.ctxes.drawingLayerTwoCtx.lineCap = "round";
          this.protectedData.ctxes.drawingLayerTwoCtx.globalAlpha = 1;
          this.protectedData.ctxes.drawingLayerThreeCtx.lineCap = "round";
          this.protectedData.ctxes.drawingLayerThreeCtx.globalAlpha = 1;
        } else {
          if (this.protectedData.Is_Shift_Pressed) {
            if (
              !this.gui_states.segmentation &&
              !this.gui_states.Eraser &&
              this.nrrd_states.Mouse_Over
            ) {
              this.protectedData.ctxes.drawingCtx.clearRect(
                0,
                0,
                this.nrrd_states.changedWidth,
                this.nrrd_states.changedHeight
              );
              this.protectedData.ctxes.drawingCtx.fillStyle =
                this.gui_states.brushColor;
              this.protectedData.ctxes.drawingCtx.beginPath();
              this.protectedData.ctxes.drawingCtx.arc(
                this.nrrd_states.Mouse_Over_x,
                this.nrrd_states.Mouse_Over_y,
                this.gui_states.brushAndEraserSize / 2 + 1,
                0,
                Math.PI * 2
              );
              this.protectedData.ctxes.drawingCtx.strokeStyle =
                this.gui_states.brushColor;
              this.protectedData.ctxes.drawingCtx.stroke();
            }
          }
          if (this.nrrd_states.enableCursorChoose) {
            this.protectedData.ctxes.drawingCtx.clearRect(
              0,
              0,
              this.nrrd_states.changedWidth,
              this.nrrd_states.changedHeight
            );

            const ex =
              this.nrrd_states.cursorPageX * this.nrrd_states.sizeFoctor;
            const ey =
              this.nrrd_states.cursorPageY * this.nrrd_states.sizeFoctor;

            this.drawLine(
              ex,
              0,
              ex,
              this.protectedData.canvases.drawingCanvas.height
            );
            this.drawLine(
              0,
              ey,
              this.protectedData.canvases.drawingCanvas.width,
              ey
            );
          }
        }
        this.protectedData.ctxes.drawingCtx.drawImage(
          this.protectedData.canvases.drawingCanvasLayerMaster,
          0,
          0
        );
      } else {
        this.redrawDisplayCanvas();
      }
    };

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        this.undoLastPainting();
      }
    });
  }

  private enableCrosshair() {
    this.nrrd_states.isCursorSelect = true;
    switch (this.protectedData.axis) {
      case "x":
        this.cursorPage.x.updated = true;
        this.cursorPage.y.updated = false;
        this.cursorPage.z.updated = false;
        break;
      case "y":
        this.cursorPage.x.updated = false;
        this.cursorPage.y.updated = true;
        this.cursorPage.z.updated = false;
        break;
      case "z":
        this.cursorPage.x.updated = false;
        this.cursorPage.y.updated = false;
        this.cursorPage.z.updated = true;
        break;
    }
  }

  private setUpSphereOrigins(mouseX: number, mouseY: number) {
    const convertCursor = (from: "x" | "y" | "z", to: "x" | "y" | "z") => {
      const convertObj = this.convertCursorPoint(
        from,
        to,
        mouseX,
        mouseY,
        this.nrrd_states.currentIndex
      ) as IConvertObjType;
      return {
        convertCursorNumX: convertObj?.convertCursorNumX,
        convertCursorNumY: convertObj?.convertCursorNumY,
        currentIndex: convertObj?.currentIndex,
      };
    };

    const axisConversions = {
      x: { axisTo1: "y", axisTo2: "z" },
      y: { axisTo1: "z", axisTo2: "x" },
      z: { axisTo1: "x", axisTo2: "y" },
    };

    const { axisTo1, axisTo2 } = axisConversions[this.protectedData.axis] as {
      axisTo1: "x" | "y" | "z";
      axisTo2: "x" | "y" | "z";
    };
    this.nrrd_states.sphereOrigin[axisTo1] = [
      convertCursor(this.protectedData.axis, axisTo1).convertCursorNumX,
      convertCursor(this.protectedData.axis, axisTo1).convertCursorNumY,
      convertCursor(this.protectedData.axis, axisTo1).currentIndex,
    ];
    this.nrrd_states.sphereOrigin[axisTo2] = [
      convertCursor(this.protectedData.axis, axisTo2).convertCursorNumX,
      convertCursor(this.protectedData.axis, axisTo2).convertCursorNumY,
      convertCursor(this.protectedData.axis, axisTo2).currentIndex,
    ];
  }

  private drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    this.protectedData.ctxes.drawingCtx.beginPath();
    this.protectedData.ctxes.drawingCtx.moveTo(x1, y1);
    this.protectedData.ctxes.drawingCtx.lineTo(x2, y2);
    this.protectedData.ctxes.drawingCtx.strokeStyle = this.gui_states.color;
    this.protectedData.ctxes.drawingCtx.stroke();
  };

  // for sphere

  private drawSphereOnEachViews(decay: number, axis: "x" | "y" | "z") {
    // init sphere canvas width and height
    this.setSphereCanvasSize(axis);

    const mouseX = this.nrrd_states.sphereOrigin[axis][0];
    const mouseY = this.nrrd_states.sphereOrigin[axis][1];
    const originIndex = this.nrrd_states.sphereOrigin[axis][2];
    const preIndex = originIndex - decay;
    const nextIndex = originIndex + decay;
    const ctx = this.protectedData.ctxes.drawingSphereCtx;
    const canvas = this.protectedData.canvases.drawingSphereCanvas;
    // if (
    //   preIndex < this.nrrd_states.minIndex ||
    //   nextIndex > this.nrrd_states.maxIndex
    // )
    //   return;
    if (preIndex === nextIndex) {
      this.drawSphereCore(ctx, mouseX, mouseY, this.nrrd_states.sphereRadius);
      this.storeSphereImages(preIndex, axis);
    } else {
      this.drawSphereCore(
        ctx,
        mouseX,
        mouseY,
        this.nrrd_states.sphereRadius - decay
      );
      this.drawImageOnEmptyImage(canvas);
      this.storeSphereImages(preIndex, axis);
      this.storeSphereImages(nextIndex, axis);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private drawSphereCore(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.arc(x, y, radius * this.nrrd_states.sizeFoctor, 0, 2 * Math.PI);
    ctx.fillStyle = this.gui_states.fillColor;
    ctx.fill();
    ctx.closePath();
  }

  private drawSphere(mouseX: number, mouseY: number, radius: number) {
    // clear canvas
    this.protectedData.canvases.drawingSphereCanvas.width =
      this.protectedData.canvases.drawingCanvasLayerMaster.width;
    this.protectedData.canvases.drawingSphereCanvas.height =
      this.protectedData.canvases.drawingCanvasLayerMaster.height;
    const canvas = this.protectedData.canvases.drawingSphereCanvas;
    const ctx = this.protectedData.ctxes.drawingSphereCtx;
    this.protectedData.ctxes.drawingLayerMasterCtx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
    this.drawSphereCore(ctx, mouseX, mouseY, radius);
    this.protectedData.ctxes.drawingLayerMasterCtx.drawImage(
      canvas,
      0,
      0,
      this.nrrd_states.changedWidth,
      this.nrrd_states.changedHeight
    );
  }

  // need to update
  private undoLastPainting() {
    let { ctx, canvas } = this.setCurrentLayer();
    this.protectedData.Is_Draw = true;
    this.protectedData.canvases.drawingCanvasLayerMaster.width =
      this.protectedData.canvases.drawingCanvasLayerMaster.width;
    canvas.width = canvas.width;
    this.protectedData.mainPreSlices.repaint.call(
      this.protectedData.mainPreSlices
    );
    const currentUndoObj = this.getCurrentUndo();
    if (currentUndoObj.length > 0) {
      const undo = currentUndoObj[0];
      const layerUndos =
        undo.layers[this.gui_states.label as "label1" | "label2" | "label3"];
      const layerLen = layerUndos.length;
      // if (layerLen === 0) return;
      layerUndos.pop();

      if (layerLen > 0) {
        // const imageSrc = undo.undos[undo.undos.length - 1];
        const image = layerUndos[layerLen - 1];

        if (!!image) {
          ctx.drawImage(
            image,
            0,
            0,
            this.nrrd_states.changedWidth,
            this.nrrd_states.changedHeight
          );
        }
      }
      if (undo.layers.label1.length > 0) {
        const image = undo.layers.label1[undo.layers.label1.length - 1];

        this.protectedData.ctxes.drawingLayerMasterCtx.drawImage(
          image,
          0,
          0,
          this.nrrd_states.changedWidth,
          this.nrrd_states.changedHeight
        );
      }
      if (undo.layers.label2.length > 0) {
        const image = undo.layers.label2[undo.layers.label2.length - 1];
        this.protectedData.ctxes.drawingLayerMasterCtx.drawImage(
          image,
          0,
          0,
          this.nrrd_states.changedWidth,
          this.nrrd_states.changedHeight
        );
      }
      if (undo.layers.label3.length > 0) {
        const image = undo.layers.label3[undo.layers.label3.length - 1];
        this.protectedData.ctxes.drawingLayerMasterCtx.drawImage(
          image,
          0,
          0,
          this.nrrd_states.changedWidth,
          this.nrrd_states.changedHeight
        );
      }
      this.previousDrawingImage =
        this.protectedData.ctxes.drawingLayerMasterCtx.getImageData(
          0,
          0,
          this.protectedData.canvases.drawingCanvasLayerMaster.width,
          this.protectedData.canvases.drawingCanvasLayerMaster.height
        );
      this.storeAllImages(this.nrrd_states.currentIndex, this.gui_states.label);
      this.setIsDrawFalse(1000);
    }
  }

  private getCurrentUndo() {
    return this.undoArray.filter((item) => {
      return item.sliceIndex === this.nrrd_states.currentIndex;
    });
  }

  // drawing canvas mouse shpere wheel
  private configMouseSphereWheel() {
    const sphereEvent = (e: WheelEvent) => {
      e.preventDefault();

      if (e.deltaY < 0) {
        this.nrrd_states.sphereRadius += 1;
      } else {
        this.nrrd_states.sphereRadius -= 1;
      }
      // limited the radius max and min
      this.nrrd_states.sphereRadius = Math.max(
        1,
        Math.min(this.nrrd_states.sphereRadius, 50)
      );
      console.log(
        this.nrrd_states.sphereOrigin[this.protectedData.axis][0],
        this.nrrd_states.sphereOrigin[this.protectedData.axis][1]
      );

      // get mouse position
      const mouseX = this.nrrd_states.sphereOrigin[this.protectedData.axis][0];
      const mouseY = this.nrrd_states.sphereOrigin[this.protectedData.axis][1];
      this.drawSphere(mouseX, mouseY, this.nrrd_states.sphereRadius);
    };
    return sphereEvent;
  }

  // drawing canvas mouse zoom wheel
  private configMouseZoomWheel(
    controls?: Copper3dTrackballControls | TrackballControls | OrbitControls
  ) {
    let moveDistance = 1;
    const handleZoomWheelMove = (e: WheelEvent) => {
      if (this.protectedData.Is_Shift_Pressed) {
        return;
      }
      e.preventDefault();
      // this.nrrd_states.originWidth;
      const delta = e.detail ? e.detail > 0 : (e as any).wheelDelta < 0;
      this.protectedData.Is_Draw = true;

      const ratioL =
        (e.clientX -
          this.mainAreaContainer.offsetLeft -
          this.protectedData.canvases.drawingCanvas.offsetLeft) /
        this.protectedData.canvases.drawingCanvas.offsetWidth;
      const ratioT =
        (e.clientY -
          this.mainAreaContainer.offsetTop -
          this.protectedData.canvases.drawingCanvas.offsetTop) /
        this.protectedData.canvases.drawingCanvas.offsetHeight;
      const ratioDelta = !delta ? 1 + 0.1 : 1 - 0.1;

      const w =
        this.protectedData.canvases.drawingCanvas.offsetWidth * ratioDelta;
      const h =
        this.protectedData.canvases.drawingCanvas.offsetHeight * ratioDelta;
      const l = Math.round(
        e.clientX - this.mainAreaContainer.offsetLeft - w * ratioL
      );
      const t = Math.round(
        e.clientY - this.mainAreaContainer.offsetTop - h * ratioT
      );

      moveDistance = w / this.nrrd_states.originWidth;

      if (moveDistance > 8) {
        moveDistance = 8;
      } else if (moveDistance < 1) {
        moveDistance = 1;
      } else {
        this.resizePaintArea(moveDistance);
        this.resetPaintArea(l, t);
        controls && (controls.enabled = false);
        this.setIsDrawFalse(1000);
      }
      this.nrrd_states.sizeFoctor = moveDistance;
    };
    return handleZoomWheelMove;
  }

  private useEraser() {
    const clearArc = (x: number, y: number, radius: number) => {
      var calcWidth = radius - this.nrrd_states.stepClear;
      var calcHeight = Math.sqrt(radius * radius - calcWidth * calcWidth);
      var posX = x - calcWidth;
      var posY = y - calcHeight;
      var widthX = 2 * calcWidth;
      var heightY = 2 * calcHeight;

      if (this.nrrd_states.stepClear <= radius) {
        this.protectedData.ctxes.drawingLayerMasterCtx.clearRect(
          posX,
          posY,
          widthX,
          heightY
        );
        this.protectedData.ctxes.drawingLayerOneCtx.clearRect(
          posX,
          posY,
          widthX,
          heightY
        );
        this.protectedData.ctxes.drawingLayerTwoCtx.clearRect(
          posX,
          posY,
          widthX,
          heightY
        );
        this.protectedData.ctxes.drawingLayerThreeCtx.clearRect(
          posX,
          posY,
          widthX,
          heightY
        );
        this.nrrd_states.stepClear += 1;
        clearArc(x, y, radius);
      }
    };
    return clearArc;
  }

  private clearPaint() {
    this.protectedData.Is_Draw = true;
    this.resetLayerCanvas();
    this.originCanvas.width = this.originCanvas.width;
    this.protectedData.mainPreSlices.repaint.call(
      this.protectedData.mainPreSlices
    );
    this.previousDrawingImage =
      this.protectedData.ctxes.emptyCtx.createImageData(1, 1);

    this.storeAllImages(this.nrrd_states.currentIndex, this.gui_states.label);
    const restLabels = this.getRestLabel();
    this.storeEachLayerImage(this.nrrd_states.currentIndex, restLabels[0]);
    this.storeEachLayerImage(this.nrrd_states.currentIndex, restLabels[1]);
    this.setIsDrawFalse(1000);
  }

  private getRestLabel() {
    const labels = this.nrrd_states.labels;
    const restLabel = labels.filter((item) => {
      return item !== this.gui_states.label;
    });
    return restLabel;
  }

  private clearStoreImages() {
    this.protectedData.maskData.paintImages.x.length = 0;
    this.protectedData.maskData.paintImages.y.length = 0;
    this.protectedData.maskData.paintImages.z.length = 0;
    this.protectedData.maskData.paintImagesLabel1.x.length = 0;
    this.protectedData.maskData.paintImagesLabel1.y.length = 0;
    this.protectedData.maskData.paintImagesLabel1.z.length = 0;
    this.protectedData.maskData.paintImagesLabel2.x.length = 0;
    this.protectedData.maskData.paintImagesLabel2.y.length = 0;
    this.protectedData.maskData.paintImagesLabel2.z.length = 0;
    this.protectedData.maskData.paintImagesLabel3.x.length = 0;
    this.protectedData.maskData.paintImagesLabel3.y.length = 0;
    this.protectedData.maskData.paintImagesLabel3.z.length = 0;
    this.initPaintImages(this.nrrd_states.dimensions);
  }

  private paintOnCanvasLayer(x: number, y: number) {
    let { ctx, canvas } = this.setCurrentLayer();

    this.drawLinesOnLayer(ctx, x, y);
    this.drawLinesOnLayer(this.protectedData.ctxes.drawingLayerMasterCtx, x, y);
    // reset drawing start position to current position.
    this.nrrd_states.drawStartPos.x = x;
    this.nrrd_states.drawStartPos.y = y;
    // need to flag the map as needing updating.
    this.protectedData.mainPreSlices.mesh.material.map.needsUpdate = true;
  }

  private drawLinesOnLayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ) {
    ctx.beginPath();
    ctx.moveTo(
      this.nrrd_states.drawStartPos.x,
      this.nrrd_states.drawStartPos.y
    );
    if (this.gui_states.segmentation) {
      ctx.strokeStyle = this.gui_states.color;
      ctx.lineWidth = this.gui_states.lineWidth;
    } else {
      ctx.strokeStyle = this.gui_states.brushColor;
      ctx.lineWidth = this.gui_states.brushAndEraserSize;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();
  }

  private setCurrentLayer() {
    let ctx: CanvasRenderingContext2D;
    let canvas: HTMLCanvasElement;
    switch (this.gui_states.label) {
      case "label1":
        ctx = this.protectedData.ctxes.drawingLayerOneCtx;
        canvas = this.protectedData.canvases.drawingCanvasLayerOne;
        break;
      case "label2":
        ctx = this.protectedData.ctxes.drawingLayerTwoCtx;
        canvas = this.protectedData.canvases.drawingCanvasLayerTwo;
        break;
      case "label3":
        ctx = this.protectedData.ctxes.drawingLayerThreeCtx;
        canvas = this.protectedData.canvases.drawingCanvasLayerThree;
        break;
      default:
        ctx = this.protectedData.ctxes.drawingLayerOneCtx;
        canvas = this.protectedData.canvases.drawingCanvasLayerOne;
        break;
    }
    return { ctx, canvas };
  }

  private updateSlicesContrast(value: number, flag: string) {
    switch (flag) {
      case "lowerThreshold":
        this.protectedData.displaySlices.forEach((slice, index) => {
          slice.volume.lowerThreshold = value;
        });
        break;
      case "upperThreshold":
        this.protectedData.displaySlices.forEach((slice, index) => {
          slice.volume.upperThreshold = value;
        });
        break;
      case "windowLow":
        this.protectedData.displaySlices.forEach((slice, index) => {
          slice.volume.windowLow = value;
        });
        break;
      case "windowHigh":
        this.protectedData.displaySlices.forEach((slice, index) => {
          slice.volume.windowHigh = value;
        });
        break;
    }
    this.repraintCurrentContrastSlice();
  }

  private resetPaintArea(l?: number, t?: number) {
    if (l && t) {
      this.protectedData.canvases.displayCanvas.style.left =
        this.protectedData.canvases.drawingCanvas.style.left = l + "px";
      this.protectedData.canvases.displayCanvas.style.top =
        this.protectedData.canvases.drawingCanvas.style.top = t + "px";
    } else {
      this.mainAreaContainer.style.justifyContent = "center";
      this.mainAreaContainer.style.alignItems = "center";
    }
  }

  private resetLayerCanvas() {
    this.protectedData.canvases.drawingCanvasLayerMaster.width =
      this.protectedData.canvases.drawingCanvasLayerMaster.width;
    this.protectedData.canvases.drawingCanvasLayerOne.width =
      this.protectedData.canvases.drawingCanvasLayerOne.width;
    this.protectedData.canvases.drawingCanvasLayerTwo.width =
      this.protectedData.canvases.drawingCanvasLayerTwo.width;
    this.protectedData.canvases.drawingCanvasLayerThree.width =
      this.protectedData.canvases.drawingCanvasLayerThree.width;
  }

  private redrawDisplayCanvas() {
    this.dragOperator.updateCurrentContrastSlice();
    this.protectedData.canvases.displayCanvas.width =
      this.protectedData.canvases.displayCanvas.width;
    this.protectedData.canvases.displayCanvas.height =
      this.protectedData.canvases.displayCanvas.height;
    this.originCanvas.width = this.originCanvas.width;
    if (this.protectedData.currentShowingSlice) {
      this.protectedData.currentShowingSlice.repaint.call(
        this.protectedData.currentShowingSlice
      );
      this.protectedData.ctxes.displayCtx?.save();

      this.flipDisplayImageByAxis();

      this.protectedData.ctxes.displayCtx?.drawImage(
        this.protectedData.currentShowingSlice.canvas,
        0,
        0,
        this.nrrd_states.changedWidth,
        this.nrrd_states.changedHeight
      );
      this.protectedData.ctxes.displayCtx?.restore();
    }
  }

  redrawMianPreOnDisplayCanvas() {
    this.protectedData.canvases.displayCanvas.width =
      this.protectedData.canvases.displayCanvas.width;
    this.protectedData.canvases.displayCanvas.height =
      this.protectedData.canvases.displayCanvas.height;
    this.originCanvas.width = this.originCanvas.width;
    if (this.protectedData.mainPreSlices) {
      this.protectedData.mainPreSlices.repaint.call(
        this.protectedData.mainPreSlices
      );

      this.flipDisplayImageByAxis();
      this.protectedData.ctxes.displayCtx?.drawImage(
        this.originCanvas,
        0,
        0,
        this.nrrd_states.changedWidth,
        this.nrrd_states.changedHeight
      );
      this.resizePaintArea(this.nrrd_states.sizeFoctor);
    }
  }

  private resizePaintArea(factor: number) {
    /**
     * clear canvas
     */
    this.originCanvas.width = this.originCanvas.width;
    this.protectedData.canvases.displayCanvas.width =
      this.protectedData.canvases.displayCanvas.width;
    this.protectedData.canvases.drawingCanvas.width =
      this.protectedData.canvases.drawingCanvas.width;
    this.resetLayerCanvas();

    this.nrrd_states.changedWidth = this.nrrd_states.originWidth * factor;
    this.nrrd_states.changedHeight = this.nrrd_states.originHeight * factor;

    /**
     * resize canvas
     */
    this.protectedData.canvases.displayCanvas.width =
      this.nrrd_states.changedWidth;
    this.protectedData.canvases.displayCanvas.height =
      this.nrrd_states.changedHeight;
    this.protectedData.canvases.drawingCanvas.width =
      this.nrrd_states.changedWidth;
    this.protectedData.canvases.drawingCanvas.height =
      this.nrrd_states.changedHeight;
    this.protectedData.canvases.drawingCanvasLayerMaster.width =
      this.nrrd_states.changedWidth;
    this.protectedData.canvases.drawingCanvasLayerMaster.height =
      this.nrrd_states.changedHeight;
    this.protectedData.canvases.drawingCanvasLayerOne.width =
      this.nrrd_states.changedWidth;
    this.protectedData.canvases.drawingCanvasLayerOne.height =
      this.nrrd_states.changedHeight;
    this.protectedData.canvases.drawingCanvasLayerTwo.width =
      this.nrrd_states.changedWidth;
    this.protectedData.canvases.drawingCanvasLayerTwo.height =
      this.nrrd_states.changedHeight;
    this.protectedData.canvases.drawingCanvasLayerThree.width =
      this.nrrd_states.changedWidth;
    this.protectedData.canvases.drawingCanvasLayerThree.height =
      this.nrrd_states.changedHeight;

    this.redrawDisplayCanvas();
    this.reloadMaskToLabel(
      this.protectedData.maskData.paintImages,
      this.protectedData.ctxes.drawingLayerMasterCtx
    );
    this.reloadMaskToLabel(
      this.protectedData.maskData.paintImagesLabel1,
      this.protectedData.ctxes.drawingLayerOneCtx
    );
    this.reloadMaskToLabel(
      this.protectedData.maskData.paintImagesLabel2,
      this.protectedData.ctxes.drawingLayerTwoCtx
    );
    // need to check here again: why use ctx two not three. now modify to three
    // this.reloadMaskToLabel(this.protectedData.maskData.paintImagesLabel3, this.protectedData.ctxes.drawingLayerTwoCtx);
    this.reloadMaskToLabel(
      this.protectedData.maskData.paintImagesLabel3,
      this.protectedData.ctxes.drawingLayerThreeCtx
    );
  }

  /**
   * Used to init the mask on each label and reload
   * @param paintImages
   * @param ctx
   */
  private reloadMaskToLabel(
    paintImages: IPaintImages,
    ctx: CanvasRenderingContext2D
  ) {
    let paintedImage;
    switch (this.protectedData.axis) {
      case "x":
        if (paintImages.x.length > 0) {
          paintedImage = this.filterDrawedImage(
            "x",
            this.nrrd_states.currentIndex,
            paintImages
          );
        } else {
          paintedImage = undefined;
        }
        break;
      case "y":
        if (paintImages.y.length > 0) {
          paintedImage = this.filterDrawedImage(
            "y",
            this.nrrd_states.currentIndex,
            paintImages
          );
        } else {
          paintedImage = undefined;
        }

        break;
      case "z":
        if (paintImages.z.length > 0) {
          paintedImage = this.filterDrawedImage(
            "z",
            this.nrrd_states.currentIndex,
            paintImages
          );
        } else {
          paintedImage = undefined;
        }
        break;
    }
    if (paintedImage?.image) {
      // redraw the stored data to empty point 1
      this.setEmptyCanvasSize();
      this.protectedData.ctxes.emptyCtx.putImageData(paintedImage.image, 0, 0);
      ctx?.drawImage(
        this.protectedData.canvases.emptyCanvas,
        0,
        0,
        this.nrrd_states.changedWidth,
        this.nrrd_states.changedHeight
      );
    }
  }

  private flipDisplayImageByAxis() {
    if (this.protectedData.axis === "x") {
      this.protectedData.ctxes.displayCtx?.scale(-1, -1);

      this.protectedData.ctxes.displayCtx?.translate(
        -this.nrrd_states.changedWidth,
        -this.nrrd_states.changedHeight
      );
    } else if (this.protectedData.axis === "z") {
      this.protectedData.ctxes.displayCtx?.scale(1, -1);
      this.protectedData.ctxes.displayCtx?.translate(
        0,
        -this.nrrd_states.changedHeight
      );
    }
  }
  private filterDrawedImage(
    axis: "x" | "y" | "z",
    sliceIndex: number,
    paintedImages: IPaintImages
  ) {
    return paintedImages[axis].filter((item) => {
      return item.index === sliceIndex;
    })[0];
  }

  // Not use this function now!!!
  private verifyCanvasIsEmpty(canvas: any) {
    this.protectedData.canvases.emptyCanvas.width = canvas.width;
    this.protectedData.canvases.emptyCanvas.height = canvas.height;

    const validation =
      canvas.toDataURL() ===
      this.protectedData.canvases.emptyCanvas.toDataURL();

    return validation;
  }

  private clearDictionary(dic: ISkipSlicesDictType) {
    for (var key in dic) {
      delete dic[key];
    }
  }

  private drawImageOnEmptyImage(canvas: HTMLCanvasElement) {
    this.protectedData.ctxes.emptyCtx.drawImage(
      canvas,
      0,
      0,
      this.protectedData.canvases.emptyCanvas.width,
      this.protectedData.canvases.emptyCanvas.height
    );
  }

  private storeSphereImages(index: number, axis: "x" | "y" | "z") {
    this.setEmptyCanvasSize(axis);
    this.drawImageOnEmptyImage(this.protectedData.canvases.drawingSphereCanvas);
    let imageData = this.protectedData.ctxes.emptyCtx.getImageData(
      0,
      0,
      this.protectedData.canvases.emptyCanvas.width,
      this.protectedData.canvases.emptyCanvas.height
    );
    this.storeImageToAxis(
      index,
      this.protectedData.maskData.paintImages,
      imageData,
      axis
    );
  }

  private storeAllImages(index: number, label: string) {
    // const image: HTMLImageElement = new Image();

    // resize the drawing image data
    if (!this.nrrd_states.loadMaskJson && !this.gui_states.sphere) {
      this.setEmptyCanvasSize();
      this.drawImageOnEmptyImage(
        this.protectedData.canvases.drawingCanvasLayerMaster
      );
    }

    let imageData = this.protectedData.ctxes.emptyCtx.getImageData(
      0,
      0,
      this.protectedData.canvases.emptyCanvas.width,
      this.protectedData.canvases.emptyCanvas.height
    );

    // 1.12.23
    switch (this.protectedData.axis) {
      case "x":
        const maskData_x = this.checkSharedPlaceSlice(
          this.nrrd_states.nrrd_x_pixel,
          this.nrrd_states.nrrd_y_pixel,
          imageData
        );

        const marked_a_x = this.sliceArrayV(
          maskData_x,
          this.nrrd_states.nrrd_y_pixel,
          this.nrrd_states.nrrd_z_pixel
        );
        const marked_b_x = this.sliceArrayH(
          maskData_x,
          this.nrrd_states.nrrd_y_pixel,
          this.nrrd_states.nrrd_z_pixel
        );

        // const ratio_a_x =
        //   this.nrrd_states.nrrd_z / this.nrrd_states.dimensions[2];
        // const ratio_b_x =
        //   this.nrrd_states.nrrd_y / this.nrrd_states.dimensions[1];

        const convertXIndex = index;
        // from x the target z will replace the col pixel
        this.replaceVerticalColPixels(
          this.protectedData.maskData.paintImages.z,
          this.nrrd_states.dimensions[2],
          // this.nrrd_states.ratios.z,
          1,
          marked_a_x,
          this.nrrd_states.nrrd_x_pixel,
          convertXIndex
        );
        // from x the target y will replace the col pixel
        this.replaceVerticalColPixels(
          this.protectedData.maskData.paintImages.y,
          this.nrrd_states.dimensions[1],
          // this.nrrd_states.ratios.y,
          1,
          marked_b_x,
          this.nrrd_states.nrrd_x_pixel,
          convertXIndex
        );
        break;
      case "y":
        const maskData_y = this.checkSharedPlaceSlice(
          this.nrrd_states.nrrd_x_pixel,
          this.nrrd_states.nrrd_y_pixel,
          imageData
        );
        const marked_a_y = this.sliceArrayV(
          maskData_y,
          this.nrrd_states.nrrd_z_pixel,
          this.nrrd_states.nrrd_x_pixel
        );
        const marked_b_y = this.sliceArrayH(
          maskData_y,
          this.nrrd_states.nrrd_z_pixel,
          this.nrrd_states.nrrd_x_pixel
        );

        // const ratio_a_y =
        //   this.nrrd_states.nrrd_x / this.nrrd_states.dimensions[0];
        // const ratio_b_y =
        //   this.nrrd_states.nrrd_z / this.nrrd_states.dimensions[2];

        const convertYIndex = index;

        this.replaceHorizontalRowPixels(
          this.protectedData.maskData.paintImages.x,
          this.nrrd_states.dimensions[0],
          // this.nrrd_states.ratios.x,
          1,
          marked_a_y,
          this.nrrd_states.nrrd_z_pixel,
          convertYIndex
        );

        this.replaceHorizontalRowPixels(
          this.protectedData.maskData.paintImages.z,
          this.nrrd_states.dimensions[2],
          // this.nrrd_states.ratios.z,
          1,
          marked_b_y,
          this.nrrd_states.nrrd_x_pixel,
          convertYIndex
        );

        break;
      case "z":
        // for x slices get cols' pixels

        // for y slices get rows' pixels
        // 1. slice z 的 y轴对应了slice y的index，所以我们可以通过slice z 确定在y轴上那些行是有pixels的，我们就可以将它的y坐标（或者是行号）对应到slice y的index，并将该index下的marked image提取出来。
        // 2. 接着我们可以通过当前slice z 的index，来确定marked image 需要替换或重组的 行 pixel array。

        const maskData_z = this.checkSharedPlaceSlice(
          this.nrrd_states.nrrd_x_pixel,
          this.nrrd_states.nrrd_y_pixel,
          imageData
        );

        // 1. get slice z's each row's and col's pixel as a 2d array.
        // 1.1 get the cols' 2d array for slice x
        const marked_a_z = this.sliceArrayV(
          maskData_z,
          this.nrrd_states.nrrd_y_pixel,
          this.nrrd_states.nrrd_x_pixel
        );

        // 1.2 get the rows' 2d array for slice y
        const marked_b_z = this.sliceArrayH(
          maskData_z,
          this.nrrd_states.nrrd_y_pixel,
          this.nrrd_states.nrrd_x_pixel
        );
        // 1.3 get x axis ratio for converting, to match the number slice x with the slice z's x axis pixel number.
        // const ratio_a_z =
        //   this.nrrd_states.nrrd_x / this.nrrd_states.dimensions[0];

        // // 1.4 get y axis ratio for converting
        // const ratio_b_z =
        //   this.nrrd_states.nrrd_y / this.nrrd_states.dimensions[1];
        // 1.5 To identify which row/col data should be replace
        const convertZIndex = index;
        // 2. Mapping coordinates
        // from z the target x will replace the col pixel
        this.replaceVerticalColPixels(
          this.protectedData.maskData.paintImages.x,
          this.nrrd_states.dimensions[0],
          // this.nrrd_states.ratios.x,
          1,
          marked_a_z,
          this.nrrd_states.nrrd_z_pixel,
          convertZIndex
        );

        // from z the target y will replace row pixel
        this.replaceHorizontalRowPixels(
          this.protectedData.maskData.paintImages.y,
          this.nrrd_states.dimensions[1],
          // this.nrrd_states.ratios.y,
          1,
          marked_b_z,
          this.nrrd_states.nrrd_x_pixel,
          convertZIndex
        );
        break;
    }

    this.storeImageToAxis(
      index,
      this.protectedData.maskData.paintImages,
      imageData
    );
    if (!this.nrrd_states.loadMaskJson && !this.gui_states.sphere) {
      this.storeEachLayerImage(index, label);
    }
  }

  private storeImageToAxis(
    index: number,
    paintedImages: IPaintImages,
    imageData: ImageData,
    axis?: "x" | "y" | "z"
  ) {
    let temp: IPaintImage = {
      index,
      image: imageData,
    };

    let drawedImage: IPaintImage;
    switch (!!axis ? axis : this.protectedData.axis) {
      case "x":
        drawedImage = this.filterDrawedImage("x", index, paintedImages);
        drawedImage
          ? (drawedImage.image = imageData)
          : paintedImages.x?.push(temp);
        break;
      case "y":
        drawedImage = this.filterDrawedImage("y", index, paintedImages);
        drawedImage
          ? (drawedImage.image = imageData)
          : paintedImages.y?.push(temp);
        break;
      case "z":
        drawedImage = this.filterDrawedImage("z", index, paintedImages);
        drawedImage
          ? (drawedImage.image = imageData)
          : paintedImages.z?.push(temp);
        break;
    }
  }

  private storeImageToLabel(
    index: number,
    canvas: HTMLCanvasElement,
    paintedImages: IPaintImages
  ) {
    if (!this.nrrd_states.loadMaskJson) {
      this.setEmptyCanvasSize();
      this.drawImageOnEmptyImage(canvas);
    }
    const imageData = this.protectedData.ctxes.emptyCtx.getImageData(
      0,
      0,
      this.protectedData.canvases.emptyCanvas.width,
      this.protectedData.canvases.emptyCanvas.height
    );
    this.storeImageToAxis(index, paintedImages, imageData);
    // this.setEmptyCanvasSize()
    return imageData;
  }

  private storeEachLayerImage(index: number, label: string) {
    if (!this.nrrd_states.loadMaskJson) {
      this.setEmptyCanvasSize();
    }
    let imageData;
    switch (label) {
      case "label1":
        imageData = this.storeImageToLabel(
          index,
          this.protectedData.canvases.drawingCanvasLayerOne,
          this.protectedData.maskData.paintImagesLabel1
        );
        break;
      case "label2":
        imageData = this.storeImageToLabel(
          index,
          this.protectedData.canvases.drawingCanvasLayerTwo,
          this.protectedData.maskData.paintImagesLabel2
        );
        break;
      case "label3":
        imageData = this.storeImageToLabel(
          index,
          this.protectedData.canvases.drawingCanvasLayerThree,
          this.protectedData.maskData.paintImagesLabel3
        );
        break;
    }
    // callback function to return the painted image
    if (!this.nrrd_states.loadMaskJson && this.protectedData.axis == "z") {
      this.nrrd_states.getMask(
        imageData as ImageData,
        this.nrrd_states.currentIndex,
        label,
        this.nrrd_states.nrrd_x_pixel,
        this.nrrd_states.nrrd_y_pixel,
        this.nrrd_states.clearAllFlag
      );
    }
  }

  // slice array to 2d array
  private sliceArrayH(arr: Uint8ClampedArray, row: number, col: number) {
    const arr2D = [];
    for (let i = 0; i < row; i++) {
      const start = i * col * 4;
      const end = (i + 1) * col * 4;
      const temp = arr.slice(start, end);
      arr2D.push(temp);
    }
    return arr2D;
  }

  private sliceArrayV(arr: Uint8ClampedArray, row: number, col: number) {
    const arr2D = [];
    const base = col * 4;
    for (let i = 0; i < col; i++) {
      const temp = [];
      for (let j = 0; j < row; j++) {
        const index = base * j + i * 4;
        temp.push(arr[index]);
        temp.push(arr[index + 1]);
        temp.push(arr[index + 2]);
        temp.push(arr[index + 3]);
      }
      arr2D.push(temp);
    }
    return arr2D;
  }

  /**
   *
   * @param paintImageArray : the target view slice's marked images array
   * @param length : the target view slice's dimention (total slice index num)
   * @param ratio : the target slice image's width/height ratio of its dimention length
   * @param markedArr : current painted image's vertical 2d Array
   * @param targetWidth : the target image width
   * @param convertIndex : Mapping current image's index to target slice image's width/height pixel start point
   */

  private replaceVerticalColPixels(
    paintImageArray: IPaintImage[],
    length: number,
    ratio: number,
    markedArr: number[][] | Uint8ClampedArray[],
    targetWidth: number,
    convertIndex: number
  ) {
    for (let i = 0, len = length; i < len; i++) {
      const index = Math.floor(i * ratio);
      const convertImageArray = paintImageArray[i].image.data;
      const mark_data = markedArr[index];
      const base_a = targetWidth * 4;

      for (let j = 0, len = mark_data.length; j < len; j += 4) {
        const start = (j / 4) * base_a + convertIndex * 4;
        convertImageArray[start] = mark_data[j];
        convertImageArray[start + 1] = mark_data[j + 1];
        convertImageArray[start + 2] = mark_data[j + 2];
        convertImageArray[start + 3] = mark_data[j + 3];
      }
    }
  }

  /**
   *
   * @param paintImageArray : the target view slice's marked images array
   * @param length : the target view slice's dimention (total slice index num)
   * @param ratio : the target slice image's width/height ratio of its dimention length
   * @param markedArr : current painted image's horizontal 2d Array
   * @param targetWidth : the target image width
   * @param convertIndex : Mapping current image's index to target slice image's width/height pixel start point
   */
  private replaceHorizontalRowPixels(
    paintImageArray: IPaintImage[],
    length: number,
    ratio: number,
    markedArr: number[][] | Uint8ClampedArray[],
    targetWidth: number,
    convertIndex: number
  ) {
    for (let i = 0, len = length; i < len; i++) {
      const index = Math.floor(i * ratio);
      const convertImageArray = paintImageArray[i].image.data;
      const mark_data = markedArr[index] as number[];
      const start = targetWidth * convertIndex * 4;
      for (let j = 0, len = mark_data.length; j < len; j++) {
        convertImageArray[start + j] = mark_data[j];
      }
    }
  }

  // set the empty canvas width and height, to reduce duplicate codes
  private setEmptyCanvasSize(axis?: "x" | "y" | "z") {
    switch (!!axis ? axis : this.protectedData.axis) {
      case "x":
        this.protectedData.canvases.emptyCanvas.width =
          this.nrrd_states.nrrd_z_pixel;
        this.protectedData.canvases.emptyCanvas.height =
          this.nrrd_states.nrrd_y_pixel;
        break;
      case "y":
        this.protectedData.canvases.emptyCanvas.width =
          this.nrrd_states.nrrd_x_pixel;
        this.protectedData.canvases.emptyCanvas.height =
          this.nrrd_states.nrrd_z_pixel;
        break;
      case "z":
        this.protectedData.canvases.emptyCanvas.width =
          this.nrrd_states.nrrd_x_pixel;
        this.protectedData.canvases.emptyCanvas.height =
          this.nrrd_states.nrrd_y_pixel;
        break;
    }
  }

  private setSphereCanvasSize(axis?: "x" | "y" | "z") {
    switch (!!axis ? axis : this.protectedData.axis) {
      case "x":
        this.protectedData.canvases.drawingSphereCanvas.width =
          this.nrrd_states.nrrd_z_mm;
        this.protectedData.canvases.drawingSphereCanvas.height =
          this.nrrd_states.nrrd_y_mm;
        break;
      case "y":
        this.protectedData.canvases.drawingSphereCanvas.width =
          this.nrrd_states.nrrd_x_mm;
        this.protectedData.canvases.drawingSphereCanvas.height =
          this.nrrd_states.nrrd_z_mm;
        break;
      case "z":
        this.protectedData.canvases.drawingSphereCanvas.width =
          this.nrrd_states.nrrd_x_mm;
        this.protectedData.canvases.drawingSphereCanvas.height =
          this.nrrd_states.nrrd_y_mm;
        break;
    }
  }

  private checkSharedPlaceSlice(
    width: number,
    height: number,
    imageData: ImageData
  ) {
    let maskData = this.protectedData.ctxes.emptyCtx.createImageData(
      width,
      height
    ).data;

    if (
      this.nrrd_states.sharedPlace.z.includes(this.nrrd_states.currentIndex)
    ) {
      const sharedPlaceArr = this.findSliceInSharedPlace();
      sharedPlaceArr.push(imageData);
      if (sharedPlaceArr.length > 0) {
        for (let i = 0; i < sharedPlaceArr.length; i++) {
          this.replaceArray(maskData, sharedPlaceArr[i].data);
        }
      }
    } else {
      maskData = imageData.data;
    }
    return maskData;
  }

  // replace Array
  private replaceArray(
    mainArr: number[] | Uint8ClampedArray,
    replaceArr: number[] | Uint8ClampedArray
  ) {
    for (let i = 0, len = replaceArr.length; i < len; i++) {
      if (replaceArr[i] === 0 || mainArr[i] !== 0) {
        continue;
      } else {
        mainArr[i] = replaceArr[i];
      }
    }
  }

  private findSliceInSharedPlace() {
    const sharedPlaceImages = [];

    const base = Math.floor(
      this.nrrd_states.currentIndex *
        this.nrrd_states.ratios[this.protectedData.axis]
    );

    for (let i = 1; i <= 3; i++) {
      const index = this.nrrd_states.currentIndex - i;
      if (index < this.nrrd_states.minIndex) {
        break;
      } else {
        const newIndex = Math.floor(
          index * this.nrrd_states.ratios[this.protectedData.axis]
        );
        if (newIndex === base) {
          sharedPlaceImages.push(
            this.protectedData.maskData.paintImages[this.protectedData.axis][
              index
            ].image
          );
        }
      }
    }

    for (let i = 1; i <= 3; i++) {
      const index = this.nrrd_states.currentIndex + i;
      if (index > this.nrrd_states.maxIndex) {
        break;
      } else {
        const newIndex = Math.floor(
          index * this.nrrd_states.ratios[this.protectedData.axis]
        );
        if (newIndex === base) {
          sharedPlaceImages.push(
            this.protectedData.maskData.paintImages[this.protectedData.axis][
              index
            ].image
          );
        }
      }
    }
    return sharedPlaceImages;
  }

  private exportData() {
    let exportDataFormat: exportPaintImagesType = { x: [], y: [], z: [] };

    // exportDataFormat.x = this.restructData(
    //  this.protectedData.maskData.paintImages.x,
    //  this.protectedData.maskData.paintImages.x.length
    // );

    // exportDataFormat.y = this.restructData(
    //  this.protectedData.maskData.paintImages.y,
    //  this.protectedData.maskData.paintImages.y.length
    // );

    // const worker = new Worker(
    //   new URL("./workers/reformatSaveDataWorker.ts", import.meta.url),
    //   {
    //     type: "module",
    //   }
    // );

    window.alert("Export masks, starting!!!");
    const masks = restructData(
      this.protectedData.maskData.paintImages.z,
      this.nrrd_states.nrrd_z_pixel,
      this.nrrd_states.nrrd_x_pixel,
      this.nrrd_states.nrrd_y_pixel
    );
    const blob = convertReformatDataToBlob(masks);
    if (blob) {
      saveFileAsJson(blob, "copper3D_export data_z.json");
      window.alert("Export masks successfully!!!");
    } else {
      window.alert("Export failed!");
    }

    // worker.postMessage({
    //   masksData:this.protectedData.maskData.paintImages.z,
    //   len:this.protectedData.maskData.paintImages.z.length,
    //   width: this.nrrd_states.nrrd_x_pixel,
    //   height: this.nrrd_states.nrrd_y_pixel,
    //   type: "reformat",
    // });

    // worker.onmessage = (ev: MessageEvent) => {
    //   const result = ev.data;
    //   if (result.type === "reformat") {
    //     exportDataFormat.z = result.masks;

    //     worker.postMessage({
    //       masksData: exportDataFormat.z,
    //       type: "saveBlob",
    //     });
    //   } else if (result.type === "saveBlob") {
    //     if (result.data) {
    //       saveFileAsJson(result.data, "copper3D_export data_z.json");
    //       window.alert("Export masks successfully!!!");
    //     } else {
    //       window.alert("Export failed!");
    //     }
    //   }
    // };
  }
}
