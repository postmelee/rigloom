export type Point = [number, number, number];
export interface Frame {
  up: string;
  turn: number;
  scale: number;
  floor: boolean;
}
export interface Placement {
  names: string[];
  parents: (number | null)[];
  joints: Point[];
  defaults: Point[];
  matrix: number[][];
  bounds: [Point, Point];
}
export interface PlacementState {
  frame: Frame;
  data: Placement;
}
