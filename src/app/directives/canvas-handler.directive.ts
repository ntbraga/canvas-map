import { RoundedRectangle } from './../quad-tree/canvas-object';
import { QuadTree } from 'src/app/quad-tree/quad-tree';
import { ActivatedRoute, Router } from '@angular/router';
import { Directive, Host, Input, ElementRef, OnInit, Output, EventEmitter, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { constrainValue, Coordinates, diagonalPointsToRect, distance, Point, Position, queryValueToNumber, RectType, roundValue } from '../quad-tree/utils';
import { distinctUntilChanged } from 'rxjs';
import { CreateRect } from '../quad-tree/canvas-object';

export type CanvasChanges = {
  scale: number;
  panX: number;
  panY: number;
  unity: number;
}

@Directive({
  selector: '[appCanvasHandler]',
  exportAs: 'canvasHandler'
})
export class CanvasHandlerDirective implements OnInit, OnChanges {
  scale: number = 1;
  panX: number = 0;
  panY: number = 0;
  @Input()
  baseSize: number = 100;

  @Input()
  minZoom: number = 0.1;
  @Input()
  maxZoom: number = 3.0;

  _context: CanvasRenderingContext2D | null;

  @Input() color!: string;
  @Output() changes: EventEmitter<CanvasChanges> = new EventEmitter();

  @Input() quad!: QuadTree;

  @Output()
  selected: EventEmitter<Position> = new EventEmitter();

  @Input() drawFn!: (context: CanvasRenderingContext2D, changes: CanvasChanges) => void;

  @Input()
  minimap!: HTMLCanvasElement;

  isMoving: boolean = false;
  isDown: boolean = false;
  mousePosition!: { x: number, y: number };

  @Input()
  isEditing: boolean = false;

  createObjects: CreateRect[] = [];

  constructor(
    @Host() private el: ElementRef<HTMLCanvasElement>,
    public router: Router,
    public route: ActivatedRoute
  ) {
    this._context = this.canvas.getContext('2d');
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((query) => {
      this.triggerChanges({
        scale: queryValueToNumber(query, 'scale', 1),
        panX: queryValueToNumber(query, 'panX', 0),
        panY: queryValueToNumber(query, 'panY', 0),
      })
    });

    this.changes.pipe(
      distinctUntilChanged(),
    ).subscribe((changes) => {
      this.router.navigate([], { queryParams: { ...changes, unity: undefined } });
      this.requestRender(changes);
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    // if (changes['config'].currentValue) {
    //   this.triggerChanges(this.config);
    // }
  }


  requestRender(changes: CanvasChanges = {
    scale: this.scale,
    panX: this.panX,
    panY: this.panY,
    unity: this.scale * this.baseSize
  }) {
    requestAnimationFrame(() => {
      this.drawToContext(this.context, changes, this.width, this.height);
    });
  }

  drawMinimap(context: CanvasRenderingContext2D, image: ImageData, width: number, height: number) {
    context.clearRect(0, 0, width, height);
    context.putImageData(image, 0, 0, 0, 0, 800, 800);
  }

  drawToContext(context: CanvasRenderingContext2D, changes: CanvasChanges, width: number, height: number) {
    context.clearRect(0, 0, width, height);
    context.beginPath();
    context.fillStyle = this.color || "#242336";
    context.fillRect(0, 0, width, height);
    context.save();
    context.translate(changes.panX, changes.panY);
    context.closePath();
    this.drawFn?.(context, changes);

    this.createObjects.forEach((rect) => {
      rect.render(context, changes.unity)
    });

    context.restore();
  }

  get canvas(): HTMLCanvasElement {
    return this.el.nativeElement;
  }

  get context(): CanvasRenderingContext2D {
    return this._context as CanvasRenderingContext2D;
  }

  get DomRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  get scaledBaseSize() {
    return this.scale * this.baseSize;
  }

  triggerChanges(changes?: Partial<CanvasChanges>) {
    if (changes) {
      this.scale = changes.scale || this.scale;
      this.panX = changes.panX || this.panX;
      this.panY = changes.panY || this.panY;
    }

    this.changes.emit({
      scale: this.scale,
      panX: this.panX,
      panY: this.panY,
      unity: this.scale * this.baseSize
    });
  }

  mouseEventToPosition(event: MouseEvent) {
    const { left: offsetX, top: offsetY } = this.DomRect;
    return { x: event.clientX - offsetX, y: event.clientY - offsetY };
  }

  scaleAt(x: number, y: number, scaleBy: number) {
    const prevScale = this.scale;
    this.scale = constrainValue(roundValue(this.scale + scaleBy), this.minZoom, this.maxZoom);
    if (prevScale !== this.scale) {
      this.panX -= (x - this.panX) / (prevScale) * scaleBy;
      this.panY -= (y - this.panY) / (prevScale) * scaleBy;
    }
  }

  ceilCoords(coords: Coordinates): Coordinates {
    return {
      x: Math.ceil(coords.x),
      y: Math.ceil(coords.y)
    };
  }
  floorCoords(coords: Coordinates): Coordinates {
    return {
      x: Math.floor(coords.x),
      y: Math.floor(coords.y)
    };
  }

  translatePositionToCoordinates(position: Position): Coordinates {
    const xCoordinate = (position.x - this.panX) / this.scaledBaseSize;
    const yCoordinate = (position.y - this.panY) / this.scaledBaseSize;

    return {
      x: xCoordinate,
      y: yCoordinate
    };
  }

  translateCoordinatesToPosition(coord: Coordinates, scale = this.scale): Position {
    const xPosition = (coord.x * (scale * this.baseSize)) + this.panX;
    const yPosition = (coord.y * (scale * this.baseSize)) + this.panY;

    return {
      x: xPosition,
      y: yPosition
    }
  }

  getVisibleRectangle(): RectType {
    const topRight: Coordinates = this.translatePositionToCoordinates({ x: this.width, y: 0 });
    const topLeft: Coordinates = this.translatePositionToCoordinates({ x: 0, y: 0 });
    // const bottomRight: Coordinates = this.translatePositionToCoordinates({ x: this.width, y: this.height });
    const bottomLeft: Coordinates = this.translatePositionToCoordinates({ x: 0, y: this.height });
    const wDist = distance(topRight, topLeft);
    const hDist = distance(topLeft, bottomLeft);

    return {
      x: topLeft.x,
      y: topLeft.y,
      w: wDist,
      h: hDist,
    };
  }

  position(coord: Coordinates) {
    const pos = this.translateCoordinatesToPosition(coord);
    const xCenter = this.width / 2;
    const yCenter = this.height / 2;

    // this.scale = 3;
    this.panX = xCenter * coord.x;
    this.panY = yCenter * coord.y;
  }

  @HostListener('window:keyup', ['$event'])
  onKeyPressed(event: KeyboardEvent) {
    if (this.isEditing) {
      const coords = this.translatePositionToCoordinates(this.mousePosition);
      if (event.key === 'i') {
        const create = new CreateRect('#ffff00', this);
        create.setInitialPosition(this.floorCoords(coords));
        this.createObjects.push(create);
        this.triggerChanges();
      } else if (event.key === 'f') {
        const createRect = this.createObjects[this.createObjects.length - 1];
        if (createRect) {
          const diagonalRect = diagonalPointsToRect(createRect as Point, this.ceilCoords(coords));
          console.log({ diagonalRect });
          createRect.x = diagonalRect.x;
          createRect.y = diagonalRect.y;
          createRect.w = diagonalRect.w;
          createRect.h = diagonalRect.h;
          this.triggerChanges();
        }
      } else if (event.key === 'p') {
        const create = new CreateRect('yellow', this);
        create.setInitialPosition(this.floorCoords(coords));
        create.w = 1;
        create.h = 1;
        this.createObjects.push(create);
        this.triggerChanges();
      }
    }
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.mousePosition = this.mouseEventToPosition(event);
    this.isDown = true;
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.mousePosition = this.mouseEventToPosition(event);
    if (this.isDown && this.isMoving) {
      event.preventDefault();
      event.stopPropagation();
    } else {
      //click
    }
    this.isDown = false;
    this.isMoving = false;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const currentMousePosition = this.mouseEventToPosition(event);
    if (this.isDown) {
      this.isMoving = true;
      const panX = (currentMousePosition.x - this.mousePosition.x);
      const panY = (currentMousePosition.y - this.mousePosition.y);
      this.triggerChanges({
        panX: this.panX + panX,
        panY: this.panY + panY
      });
    } else {
      this.isMoving = false;
    }

    if (this.isEditing && !this.isDown) {
      this.triggerChanges();
    }

    this.mousePosition = currentMousePosition;
  }

  @HostListener('wheel', ['$event'])
  onWheelEvent(event: WheelEvent) {
    const mousePosition = this.mouseEventToPosition(event);
    const { deltaY } = event;
    const zoom = deltaY * 0.01;
    this.scaleAt(mousePosition.x, mousePosition.y, zoom);
    this.triggerChanges();
  }

  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent) {
    this.mousePosition = this.mouseEventToPosition(event);
    const coords = this.translatePositionToCoordinates(this.mousePosition);
    if (this.isEditing) {
      const create = new CreateRect('yellow', this);
      create.setInitialPosition(this.floorCoords(coords));
      create.w = 1;
      create.h = 1;
      this.createObjects.push(create);
      this.triggerChanges();
    } else {
      const element = this.quad.queryPoint(coords);
      element?.toggle();
      this.selected.next(this.mousePosition);
      this.triggerChanges();
    }
  }

}
