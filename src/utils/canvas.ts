export class Canvas {
  private _canvas;
  constructor(selector: string) {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    if (!canvas) {
      throw new Error("Canvas element not found");
    }
    this._canvas = canvas;
  }

  get canvas() {
    return this._canvas;
  }
}

export default new Canvas("#webgl").canvas;
