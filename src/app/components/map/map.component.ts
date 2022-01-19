import { Position, Coordinates, RectType, constrainValue } from './../../quad-tree/utils';
import { RoundedRectangle, RoundedRectangleWithImage } from './../../quad-tree/canvas-object';
import { AfterViewInit, Component, ElementRef, Host, HostBinding, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CanvasChanges, CanvasHandlerDirective } from 'src/app/directives/canvas-handler.directive';
import { QuadTree } from 'src/app/quad-tree/quad-tree';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit {
  @ViewChild(CanvasHandlerDirective) canvasHandler!: CanvasHandlerDirective;

  @Input()
  @HostBinding('style.width')
  width!: string;

  @Input()
  @HostBinding('style.height')
  height!: string;

  @Input()
  color!: string;

  quad: QuadTree;
  initialConfig!: CanvasChanges;
  imageExample = new Image();

  editMode = false;

  constructor(
    @Host() private el: ElementRef<HTMLElement>,
    private router: Router,
    public route: ActivatedRoute
  ) {
    this.quad = new QuadTree(400, 400);
    this.imageExample.src = 'https://images.unsplash.com/photo-1568808880686-d7f08f37ddfc?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80';
    this.imageExample.crossOrigin = 'Anonymous'
    this.imageExample.onload = () => {
      this.canvasHandler?.requestRender();
    }
  }

  ngOnInit(): void {
    for (let x = 0; x < this.quad.w; x++) {
      for (let y = 0; y < this.quad.h; y++) {
        this.quad.insert(new RoundedRectangle({
          x, y, w: 1, h: 1
        }, 'green'));
      }
    }
  }

  get containerWidth() {
    return this.el?.nativeElement.clientWidth;
  }

  get containerHeight() {
    return this.el?.nativeElement.clientHeight;
  }

  get scaledBaseSize() {
    return this.canvasHandler.baseSize * this.canvasHandler.scale;
  }

  ngAfterViewInit(): void {
    this.canvasHandler.requestRender();
  }

  onCanvasChanges(event: any) {

  }

  canvasClick(pos: Position) {
    const coords = this.canvasHandler.translatePositionToCoordinates(pos);
  }

  drawGrid(context: CanvasRenderingContext2D, unity: number) {
    const bw = this.quad.w;
    const bh = this.quad.h;
    context.beginPath();
    //Vertical lines
    for (let x = 0; x <= bw; x++) {
      // 0 * 40 x 40
      context.moveTo(x * unity, 0);
      context.lineTo(x * unity, bh * unity);
    }

    //Horizontal lines
    for (let y = 0; y <= bh; y++) {
      context.moveTo(0, y * unity);
      context.lineTo(bw * unity, y * unity);
    }

    context.strokeStyle = "black";
    context.lineWidth = 0.05 * unity;
    context.stroke();
    context.closePath();
  }

  draw = (context: CanvasRenderingContext2D, changes: CanvasChanges) => {
    this.drawGrid(context, changes.unity);

    const visibleRect = this.canvasHandler.getVisibleRectangle();
    const visibleItems = this.quad.query(visibleRect);

    for (const rec of visibleItems) {
      rec.render(context, changes.unity);
    }

    this.quad.render(context, changes.unity);


  }

}
