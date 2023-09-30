import {
  nrrdSliceType,
  mouseMovePositionType,
  exportPaintImageType,
  storeExportPaintImageType,
  exportPaintImagesType,
  loadingBarType,
} from "../../types/types";
import { GUI } from "dat.gui";

import { switchEraserSize, switchPencilIcon } from "../utils";

import { saveFileAsJson } from "../download";
import {
  restructData,
  convertReformatDataToBlob,
} from "../workers/reformatSaveDataWorker";

import { autoFocusDiv, enableDownload } from "./coreTools/divControlTools";
import {
  IDownloadImageConfig,
  IDrawingEvents,
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
  ICursorPage,
} from "./coreTools/coreType";
import DragOperator from "./DragOperator";
import DrawOperator from "./DrawOperator";

export class NrrdTools {
  container: HTMLDivElement;

  // A base conatainer to append displayCanvas and drawingCanvas
  private mainAreaContainer: HTMLDivElement = document.createElement("div");

  private protectedData: IProtected;
  storedPaintImages: IStoredPaintImages | undefined;

  private dragOperator: DragOperator;
  private drawOperator: DrawOperator;

  private paintedImage: IPaintImage | undefined;

  private initState: boolean = true;
  private preTimer: any;

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

  private cursorPage: ICursorPage = {
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
      this.drawOperator.clearPaint();
    },
    clearAll: () => {
      const text = "Are you sure remove annotations on All slice?";
      if (confirm(text) === true) {
        this.nrrd_states.clearAllFlag = true;
        this.drawOperator.clearPaint();
        this.clearStoreImages();
      }
      this.nrrd_states.clearAllFlag = false;
    },
    undo: () => {
      this.drawOperator.undoLastPainting();
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
    // subView: false,
    // subViewScale: 1.0,
    // resetView: () => {
    //   this.sceneIn?.resetView();
    // },
    // exportMarks: () => {
    //   this.exportData();
    // },
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
        originCanvas: null,
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
        emptyCtx: canvases[7].getContext("2d", {
          willReadFrequently: true,
        }) as CanvasRenderingContext2D,
      },
    };

    this.storedPaintImages = {
      label1: this.protectedData.maskData.paintImagesLabel1,
      label2: this.protectedData.maskData.paintImagesLabel2,
      label3: this.protectedData.maskData.paintImagesLabel3,
    };

    this.protectedData.previousDrawingImage =
      this.protectedData.ctxes.emptyCtx.createImageData(1, 1);
    this.init();

    this.dragOperator = new DragOperator(
      this.container,
      this.nrrd_states,
      this.gui_states,
      this.protectedData,
      this.drawingPrameters,
      this.setSyncsliceNum,
      this.setIsDrawFalse,
      this.flipDisplayImageByAxis,
      this.setEmptyCanvasSize,
      this.filterDrawedImage
    );

    this.drawOperator = new DrawOperator(
      this.container,
      this.mainAreaContainer,
      this.nrrd_states,
      this.gui_states,
      this.protectedData,
      this.cursorPage,
      this.drawingPrameters,
      this.dragOperator,
      this.setSyncsliceNum,
      this.setIsDrawFalse,
      this.flipDisplayImageByAxis,
      this.setEmptyCanvasSize,
      this.filterDrawedImage,
      this.clearStoreImages,
      this.redrawDisplayCanvas,
      this.resizePaintArea,
      this.resetPaintArea,
      this.convertCursorPoint,
      this.resetLayerCanvas,
      this.updateOriginAndChangedWH,
      this.reloadMaskToLabel
    );
  }

  drag(opts?: IDragOpts) {
    this.dragOperator.drag(opts);
  }
  draw(gui: GUI, opts?: IDrawOpts) {
    this.drawOperator.draw(gui, opts);
  }
  start() {
    console.log(this.drawOperator.start);

    return this.drawOperator.start;
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

    this.setShowInMainArea();
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
          this.drawOperator.storeEachLayerImage(i, "label1");
        }
        if (masksData["label2"][i].data.length > 0) {
          this.setEmptyCanvasSize();
          imageDataLabel2 = this.loadingMaskByLabel(
            masksData["label2"],
            i,
            imageData
          );
          this.protectedData.ctxes.emptyCtx.putImageData(imageDataLabel2, 0, 0);
          this.drawOperator.storeEachLayerImage(i, "label2");
        }
        if (masksData["label3"][i].data.length > 0) {
          this.setEmptyCanvasSize();
          imageDataLabel3 = this.loadingMaskByLabel(
            masksData["label3"],
            i,
            imageData
          );
          this.protectedData.ctxes.emptyCtx.putImageData(imageDataLabel3, 0, 0);
          this.drawOperator.storeEachLayerImage(i, "label3");
        }
        this.setEmptyCanvasSize();
        this.protectedData.ctxes.emptyCtx.putImageData(imageData, 0, 0);
        this.drawOperator.storeAllImages(i, "default");
      }

      this.nrrd_states.loadMaskJson = false;
      this.gui_states.resetZoom();
      if (loadingBar) {
        loadingBar.loadingContainer.style.display = "none";
      }
    }
  }
  private setShowInMainArea() {
    this.nrrd_states.showContrast = true;
  }

  setEraserUrls(urls: string[]) {
    this.drawOperator.setEraserUrls(urls);
  }
  setPencilIconUrls(urls: string[]) {
    this.drawOperator.setPencilIconUrls(urls);
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
  getMaskData(): IMaskData {
    return this.protectedData.maskData;
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
      this.drawOperator.drawSphere(
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
    this.drawOperator.undoArray.length = 0;
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
    this.protectedData.previousDrawingImage =
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
    this.drawOperator.repraintCurrentContrastSlice();
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

      this.protectedData.canvases.originCanvas =
        this.protectedData.mainPreSlices.canvas;
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
    this.drawOperator.undoArray = [
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
    this.nrrd_states.originWidth =
      this.protectedData.canvases.originCanvas.width;
    this.nrrd_states.originHeight =
      this.protectedData.canvases.originCanvas.height;
    this.nrrd_states.changedWidth =
      this.nrrd_states.originWidth * Number(this.gui_states.mainAreaSize);
    this.nrrd_states.changedHeight =
      this.nrrd_states.originWidth * Number(this.gui_states.mainAreaSize);
    this.resizePaintArea(1);
    this.resetPaintArea();
  }

  private setSyncsliceNum() {
    this.protectedData.displaySlices.forEach((slice, index) => {
      if (index !== 0) {
        slice.index = this.protectedData.mainPreSlices.index;
      }
    });
  }

  appendLoadingbar(loadingbar: HTMLDivElement) {
    this.mainAreaContainer.appendChild(loadingbar);
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
    this.protectedData.canvases.originCanvas.width =
      this.protectedData.canvases.originCanvas.width;
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
    this.protectedData.canvases.originCanvas.width =
      this.protectedData.canvases.originCanvas.width;
    if (this.protectedData.mainPreSlices) {
      this.protectedData.mainPreSlices.repaint.call(
        this.protectedData.mainPreSlices
      );

      this.flipDisplayImageByAxis();
      this.protectedData.ctxes.displayCtx?.drawImage(
        this.protectedData.canvases.originCanvas,
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
    this.protectedData.canvases.originCanvas.width =
      this.protectedData.canvases.originCanvas.width;
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

  private clearDictionary(dic: ISkipSlicesDictType) {
    for (var key in dic) {
      delete dic[key];
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

  private exportData() {
    let exportDataFormat: exportPaintImagesType = { x: [], y: [], z: [] };

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
  }
}
