export enum GameStatus {
  START = 'START',
  SYSTEM_SELECT = 'SYSTEM_SELECT',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
  WAVE_TRANSITION = 'WAVE_TRANSITION',
  LEVEL_TRANSITION = 'LEVEL_TRANSITION',
  SHOP = 'SHOP',
}

export enum RocketType {
  NORMAL = 'NORMAL',
  SPLIT_PARENT = 'SPLIT_PARENT',
  SPLIT_CHILD = 'SPLIT_CHILD',
  BOSS_SUMMON = 'BOSS_SUMMON',
}

export enum MissileType {
  NORMAL = 'NORMAL',
  HEAVY = 'HEAVY',
}

export enum StarSystem {
  SOLAR = 'SOLAR',
  TRAPPIST = 'TRAPPIST',
  KEPLER = 'KEPLER',
}

export enum Planet {
  EARTH = 'EARTH',
  MARS = 'MARS',
  NEPTUNE = 'NEPTUNE',
  TRAPPIST_E = 'TRAPPIST_E',
  TRAPPIST_F = 'TRAPPIST_F',
  KEPLER_186F = 'KEPLER_186F',
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
  type: RocketType;
}

export interface UFO {
  id: string;
  pos: Point;
  targetX: number;
  speed: number;
  lastShotTime: number;
  health: number;
  maxHealth: number;
  destroyed: boolean;
  isBoss?: boolean;
}

export interface Plane {
  id: string;
  pos: Point;
  targetX: number;
  speed: number;
  lastShotTime: number;
  state: 'FLYING' | 'KAMIKAZE';
  targetUFOId?: string;
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
  type: MissileType;
}

export interface Explosion {
  id: string;
  pos: Point;
  radius: number;
  maxRadius: number;
  growing: boolean;
  finished: boolean;
  damage: number;
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

export interface WaveConfig {
  rockets: number;
  splitChance: number;
  ufoCount: number;
  rocketSpeedMult: number;
}

export interface LevelConfig {
  id: number;
  name: { zh: string; en: string };
  planet: Planet;
  waves: WaveConfig[];
  hasBoss?: boolean;
}
