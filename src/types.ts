export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
}

export interface Point {
  x: number;
  y: number;
}

export interface Rocket {
  id: string;
  start: Point;
  current: Point;
  target: Point;
  speed: number;
  destroyed: boolean;
}

export interface Missile {
  id: string;
  start: Point;
  current: Point;
  target: Point;
  speed: number;
  reached: boolean;
  turretIndex: number;
}

export interface Explosion {
  id: string;
  pos: Point;
  radius: number;
  maxRadius: number;
  growing: boolean;
  finished: boolean;
}

export interface City {
  id: number;
  x: number;
  destroyed: boolean;
}

export interface Turret {
  id: number;
  x: number;
  ammo: number;
  maxAmmo: number;
  destroyed: boolean;
}
