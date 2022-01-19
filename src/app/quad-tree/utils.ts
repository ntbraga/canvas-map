export type Position = { x: number, y: number };
export type Point = Position;
export type Coordinates = Position;

export type RectType = Position & {
  w: number, h: number;
};

export const constrainValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
export const roundValue = (value: number, places = 2) => {
  return parseFloat(value.toFixed(places));
};

export const queryValueToNumber = (query: any, key: string, defaultValue?: number): number => {
  return isNaN(query[key]) ? defaultValue as number : parseFloat(query[key]);
}

export const determineInitialRectPoint = (p1: Point, p2: Point): Point => {
  if (p1.x < p2.x && p1.y < p2.y) return p1;
  return p2;
}

export const determineFinalRectPoint = (p1: Point, p2: Point): Point => {
  if (p1.x < p2.x && p1.y < p2.y) return p2;
  return p1;
}

export const overlaps = (a: RectType, b: RectType) => {
  return (a.x < (b.x + b.w)) &&
    ((a.x + a.w) > b.x) &&
    (a.y < (b.y + b.h)) &&
    ((a.y + a.h) > b.y);
}

export const distance = (p1: Point, p2: Point) => {
  const wDx = p1.x - p2.x;
  const wDy = p1.y - p2.y;
  return Math.sqrt(wDx * wDx + wDy * wDy);
}

export const diagonalPointsToRect = (p1: Point, p2: Point): RectType => {
  const initialPoint = determineInitialRectPoint(p1, p2);
  const finalPoint = determineFinalRectPoint(p1, p2);

  console.log({ initialPoint, finalPoint, p1, p2 });

  const topLeft = initialPoint;
  const bottomRight = finalPoint;
  const bottomLeft = { x: initialPoint.x, y: finalPoint.y };

  return { ...topLeft, w: distance(bottomLeft, bottomRight), h: distance(topLeft, bottomLeft) }
}
