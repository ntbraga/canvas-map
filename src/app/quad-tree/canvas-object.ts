import { CanvasHandlerDirective } from '../directives/canvas-handler.directive';
import { Coordinates, overlaps, RectType } from './utils';


const roundRect = (context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;

  r = Math.abs(r);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

export abstract class BoundsObject implements RectType {
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private _selected: boolean = false;

  constructor(
    rect: RectType
  ) {
    this.x = rect.x;
    this.y = rect.y;
    this.w = rect.w;
    this.h = rect.h;
  }

  get isSelected() {
    return this._selected;
  }

  select() {
    this._selected = true;
  }

  unselect() {
    this._selected = false;
  }

  toggle() {
    if (this.isSelected) {
      return this.unselect();
    }
    return this.select();
  }

  overlaps(rect: RectType) {
    return overlaps(this, rect);
  }

  contains(point: Coordinates) {
    const contains = point.x >= this.x && point.x <= this.x + this.w && point.y >= this.y && point.y <= this.y + this.h;
    if (!contains) {
      console.log({
        rect: this, point, contains
      })
    }
    return contains;
  }

  abstract render(context: CanvasRenderingContext2D, unity: number): void;

}


export class RoundedRectangle extends BoundsObject {
  padding = 0.3;

  constructor(
    rect: RectType,
    public color: string,
  ) {
    super(rect);

  }

  pad(unity: number) {
    return this.padding * unity;
  }


  render(context: CanvasRenderingContext2D, unity: number): void {
    const pad = this.pad(unity);
    roundRect(context, (this.x * unity) + (pad / 2), (this.y * unity) + (pad / 2), (this.w * unity) - pad, (this.h * unity) - pad, 0.1 * unity);
    context.fillStyle = this.color;
    context.fill();
    this.renderSelection(context, unity);
  }

  renderSelection(context: CanvasRenderingContext2D, unity: number) {
    if (this.isSelected) {
      const pad = this.pad(unity);
      context.beginPath();
      const lineWidth = 0.05 * unity;
      context.lineWidth = lineWidth;
      context.strokeStyle = "purple";
      roundRect(context, (this.x * unity) + (pad / 2), (this.y * unity) + (pad / 2), (this.w * unity) - pad, (this.h * unity) - pad, 0.1 * unity);
      context.stroke();
      context.closePath();
    }
  }
}

export class RoundedRectangleWithImage extends RoundedRectangle {

  constructor(
    rect: RectType,
    private image: CanvasImageSource
  ) {
    super(rect, '');

  }

  override render(context: CanvasRenderingContext2D, unity: number): void {
    // super.render(context, unity);
    const pad = this.padding * unity;
    context.drawImage(this.image, ((this.x * unity) / 2) + (pad / 2), ((this.y * unity) / 2) + (pad / 2), (this.w * unity) - pad, (this.h * unity) - pad)
    this.renderSelection(context, unity);
  }

}

export class CreateRect extends RoundedRectangle {
  constructor(
    color: string,
    private handler: CanvasHandlerDirective
  ) {
    super({
      x: undefined as unknown as number,
      y: undefined as unknown as number,
      w: undefined as unknown as number,
      h: undefined as unknown as number
    }, color);
  }

  setInitialPosition(coords: Coordinates) {
    this.x = coords.x;
    this.y = coords.y;
    this.w = undefined as unknown as number;
    this.h = undefined as unknown as number;
  }

  override render(context: CanvasRenderingContext2D, unity: number): void {
    const pad = this.pad(unity);
    if (this.x !== undefined && this.y !== undefined) {
      context.beginPath();
      context.fillStyle = this.color;
      context.arc((this.x * unity) + (unity / 2), (this.y * unity) + (unity / 2), 3, 0, 2 * Math.PI, true);
      context.fill();
      if (this.w === undefined || this.h === undefined) {
        const rWidth = (this.handler.mousePosition.x - this.handler.panX) - (this.x * unity);
        const rHeight = (this.handler.mousePosition.y - this.handler.panY) - (this.y * unity);

        const w = Math.ceil(rWidth / unity);
        const h = Math.ceil(rHeight / unity);

        console.log({ x: this.x, y: this.y, w, h });

        for (let x = this.x; x < (this.x + w); x++) {
          for (let y = this.y; y < (this.y + h); y++) {
            new RoundedRectangle({
              x, y, w: 1, h: 1
            }, (this.color + '4d')).render(context, unity);
          }
        }

        context.fillStyle = this.color;
        context.font = `${unity * 0.3}px Arial`;
        context.textAlign = "center";
        context.fillText(`${w}x${h}`, (this.x * unity) + (unity / 2) + (rWidth / 2), (this.y * unity) + (unity / 2) + (rHeight / 2))

        context.strokeRect((this.x * unity) + (unity / 2), (this.y * unity) + (unity / 2), rWidth - (unity / 2), rHeight - (unity / 2))
      } else {
        super.render(context, unity);
      }
    }
  }

}
