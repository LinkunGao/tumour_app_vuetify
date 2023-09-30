// Not use this function now!!!
function verifyCanvasIsEmpty(canvas: any, protectedData: any) {
  protectedData.canvases.emptyCanvas.width = canvas.width;
  protectedData.canvases.emptyCanvas.height = canvas.height;

  const validation =
    canvas.toDataURL() === protectedData.canvases.emptyCanvas.toDataURL();

  return validation;
}
