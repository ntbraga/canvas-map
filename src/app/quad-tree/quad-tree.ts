import { EventEmitter } from '@angular/core';
import { BoundsObject } from './canvas-object';
import { Coordinates, Position, RectType } from './utils';

enum NodeIndex {
  TOP_LEFT = 0,
  TOP_RIGHT = 1,
  BOTTOM_LEFT = 2,
  BOTTOM_RIGHT = 3,
}

export type NodeChanges<E = unknown> = RectType & {
  event?: E;
}

export class BoundsNode<B extends BoundsObject = BoundsObject> extends BoundsObject {
  children: B[] = [];

  nodes: BoundsNode<B>[] = [];


  constructor(
    rect: RectType,
    public maxChildren: number = 10,
    public depth: number,
    public onChanges: EventEmitter<NodeChanges>,
  ) {
    super(rect);
  }

  get divided(): boolean {
    return !!(this.nodes.length);
  }

  get size(): number {
    return this.children.length + this.nodes.map((node) => node.size).reduce((pv, cv) => pv + cv, 0);
  }

  get content(): B[] {
    return this.children.concat(this.nodes.map((node) => node.content).reduce((pv, cv) => [...pv, ...cv], []));
  }

  emitChanges(event: any) {
    this.onChanges.emit({
      x: this.x,
      y: this.y,
      w: this.w,
      h: this.h,
      event
    });
  }

  get topRight(): BoundsNode<B> | undefined {
    return this.nodes[NodeIndex.TOP_RIGHT];
  }

  get topLeft(): BoundsNode<B> | undefined {
    return this.nodes[NodeIndex.TOP_LEFT];
  }

  get bottomRight(): BoundsNode<B> | undefined {
    return this.nodes[NodeIndex.BOTTOM_RIGHT];
  }

  get bottomLeft(): BoundsNode<B> | undefined {
    return this.nodes[NodeIndex.BOTTOM_LEFT];
  }

  insert(item: B): boolean {
    if (this.overlaps(item)) {
      if (this.children.length < this.maxChildren && !this.divided) {
        for (const rect of this.children) {
          if (rect.overlaps(item)) {
            return false;
          }
        }
        this.children.push(item);
        return true;
      } else {
        if (!this.divided) {
          this.subdivide();

          for (const child of this.children) {
            this.insert(child);
          }

          this.children.length = 0;
        }

        return this.topRight?.insert(item) ||
          this.topLeft?.insert(item) || this.bottomRight?.insert(item) || this.bottomLeft?.insert(item) || false;
      }
    }
    return false;
  }

  subdivide() {
    const topRight = { x: this.x + Math.ceil(this.w / 2), y: this.y, w: Math.floor(this.w / 2), h: Math.ceil(this.h / 2) };
    this.nodes[NodeIndex.TOP_RIGHT] = new BoundsNode(topRight, this.maxChildren, this.depth + 1, this.onChanges);

    const topLeft = { x: this.x, y: this.y, w: Math.ceil(this.w / 2), h: Math.ceil(this.h / 2) };
    this.nodes[NodeIndex.TOP_LEFT] = new BoundsNode(topLeft, this.maxChildren, this.depth + 1, this.onChanges);

    const bottomRight = { x: this.x + Math.ceil(this.w / 2), y: this.y + Math.ceil(this.h / 2), w: Math.floor(this.w / 2), h: Math.floor(this.h / 2) };
    this.nodes[NodeIndex.BOTTOM_RIGHT] = new BoundsNode(bottomRight, this.maxChildren, this.depth + 1, this.onChanges);

    const bottomLeft = { x: this.x, y: this.y + Math.ceil(this.h / 2), w: Math.ceil(this.w / 2), h: Math.floor(this.h / 2) };
    this.nodes[NodeIndex.BOTTOM_LEFT] = new BoundsNode(bottomLeft, this.maxChildren, this.depth + 1, this.onChanges);
  }

  findPointIndex(point: Coordinates): NodeIndex {
    const left = (point.x > this.x + this.w / 2) ? false : true;
    const top = (point.y > this.y + this.h / 2) ? false : true;
    if (left) {
      if (!top) {
        return NodeIndex.BOTTOM_LEFT;
      }
    } else {
      if (top) {
        return NodeIndex.TOP_RIGHT;
      } else {
        return NodeIndex.BOTTOM_RIGHT;
      }
    }

    return NodeIndex.TOP_LEFT;
  }

  query(range: RectType): B[] {
    if (this.overlaps(range)) {
      if (this.divided) {
        return this
          .nodes
          .map((node) => node.query(range))
          .reduce((pv, cv) => [...pv, ...cv], []);
      } else {
        return this.children.filter((rect) => rect.overlaps(range));
      }
    }
    return [];
  }

  queryPoint(point: Coordinates): B | undefined {
    if (!this.contains(point)) {
      return undefined;
    }

    if (!this.divided) {
      return this.children.find((rect) => rect.contains(point))
    } else {
      const pointIndex = this.findPointIndex(point);
      const content = this.nodes[pointIndex].content;
      return content.find((rect) => rect.contains(point));
    }
  }

  override render(context: CanvasRenderingContext2D, unity: number): void {
    // if (this.divided) {
    //   this.topRight?.render(context, unity);
    //   this.topLeft?.render(context, unity);
    //   this.bottomRight?.render(context, unity);
    //   this.bottomLeft?.render(context, unity);
    // }

    // context.strokeStyle = 'red';
    // context.strokeRect((this.x * unity), (this.y * unity), (this.w * unity), (this.h * unity));


  }

}

export class QuadTree<B extends BoundsObject = BoundsObject> {
  root: BoundsNode<B>;
  onChanges: EventEmitter<NodeChanges> = new EventEmitter();

  constructor(
    public w: number,
    public h: number,
  ) {
    this.root = new BoundsNode({ x: 0, y: 0, w, h }, 100, 0, this.onChanges);
  }

  insert(item: B) {
    return this.root.insert(item);
  }

  queryPoint(coords: Coordinates): B | undefined {
    return this.root.queryPoint(coords);
  }

  query(range: RectType): B[] {
    return this.root.query(range);
  }

  get size() {
    return this.root.size;
  }

  render(context: CanvasRenderingContext2D, unity: number): void {
    this.root.render(context, unity);
  }

}
