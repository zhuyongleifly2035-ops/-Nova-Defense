/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Trophy, AlertTriangle, RotateCcw, Languages, Rocket as RocketIcon, Zap, Globe, Flame, Snowflake } from 'lucide-react';
import { GameStatus, Point, Rocket, Missile, Explosion, City, Turret, RocketType, MissileType, Planet, UFO, StarSystem, Plane } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const EXPLOSION_NORMAL_RADIUS = 60;
const EXPLOSION_HEAVY_RADIUS = 120;
const EXPLOSION_SPEED = 1.5;
const MISSILE_SPEED = 10;
const ROCKET_SPEED_MIN = 0.4;
const ROCKET_SPEED_MAX = 1.2;

const PLANET_CONFIGS = {
  [Planet.EARTH]: { bg: '#0a0a0a', ground: '#1a1a1a', city: '#3b82f6', cityTop: '#60a5fa', icon: <Globe className="w-5 h-5" />, name: { zh: '地球', en: 'Earth' } },
  [Planet.MARS]: { bg: '#1a0a05', ground: '#451a03', city: '#ef4444', cityTop: '#f87171', icon: <Flame className="w-5 h-5" />, name: { zh: '火星', en: 'Mars' } },
  [Planet.NEPTUNE]: { bg: '#050a1a', ground: '#1e3a8a', city: '#06b6d4', cityTop: '#22d3ee', icon: <Snowflake className="w-5 h-5" />, name: { zh: '海王星', en: 'Neptune' } },
  [Planet.TRAPPIST_E]: { bg: '#1a051a', ground: '#3b0764', city: '#d946ef', cityTop: '#f0abfc', icon: <Zap className="w-5 h-5" />, name: { zh: 'Trappist-1e', en: 'Trappist-1e' } },
  [Planet.TRAPPIST_F]: { bg: '#051a1a', ground: '#064e3b', city: '#10b981', cityTop: '#34d399', icon: <Shield className="w-5 h-5" />, name: { zh: 'Trappist-1f', en: 'Trappist-1f' } },
  [Planet.KEPLER_186F]: { bg: '#1a1a05', ground: '#422006', city: '#eab308', cityTop: '#fde047', icon: <Target className="w-5 h-5" />, name: { zh: 'Kepler-186f', en: 'Kepler-186f' } },
};

const STAR_SYSTEM_CONFIGS = {
  [StarSystem.SOLAR]: {
    name: { zh: '太阳系', en: 'Solar System' },
    levels: [
      { id: 1, name: { zh: '地球保卫战', en: 'Earth Defense' }, planet: Planet.EARTH, waves: [{ rockets: 15, splitChance: 0.2, ufoCount: 0, rocketSpeedMult: 1 }, { rockets: 20, splitChance: 0.3, ufoCount: 0, rocketSpeedMult: 1.2 }, { rockets: 25, splitChance: 0.4, ufoCount: 1, rocketSpeedMult: 1.4 }] },
      { id: 2, name: { zh: '火星前哨', en: 'Mars Outpost' }, planet: Planet.MARS, waves: [{ rockets: 20, splitChance: 0.3, ufoCount: 1, rocketSpeedMult: 1.1 }, { rockets: 25, splitChance: 0.4, ufoCount: 1, rocketSpeedMult: 1.3 }, { rockets: 30, splitChance: 0.5, ufoCount: 2, rocketSpeedMult: 1.5 }] },
    ]
  },
  [StarSystem.TRAPPIST]: {
    name: { zh: 'Trappist-1 系', en: 'Trappist-1 System' },
    levels: [
      { id: 3, name: { zh: '紫罗兰之星', en: 'Violet Star' }, planet: Planet.TRAPPIST_E, waves: [{ rockets: 25, splitChance: 0.4, ufoCount: 1, rocketSpeedMult: 1.2 }, { rockets: 30, splitChance: 0.5, ufoCount: 2, rocketSpeedMult: 1.4 }, { rockets: 35, splitChance: 0.6, ufoCount: 2, rocketSpeedMult: 1.6 }] },
      { id: 4, name: { zh: '翡翠深渊', en: 'Emerald Abyss' }, planet: Planet.TRAPPIST_F, waves: [{ rockets: 30, splitChance: 0.5, ufoCount: 2, rocketSpeedMult: 1.3 }, { rockets: 35, splitChance: 0.6, ufoCount: 2, rocketSpeedMult: 1.5 }, { rockets: 40, splitChance: 0.7, ufoCount: 3, rocketSpeedMult: 1.7 }] },
    ]
  },
  [StarSystem.KEPLER]: {
    name: { zh: '开普勒系', en: 'Kepler System' },
    levels: [
      { id: 5, name: { zh: '黄金荒漠', en: 'Golden Desert' }, planet: Planet.KEPLER_186F, waves: [{ rockets: 35, splitChance: 0.6, ufoCount: 2, rocketSpeedMult: 1.4 }, { rockets: 40, splitChance: 0.7, ufoCount: 3, rocketSpeedMult: 1.6 }, { rockets: 50, splitChance: 0.8, ufoCount: 4, rocketSpeedMult: 1.8 }] },
      { id: 6, name: { zh: '终极审判', en: 'Final Judgment' }, planet: Planet.NEPTUNE, hasBoss: true, waves: [{ rockets: 40, splitChance: 0.7, ufoCount: 3, rocketSpeedMult: 1.5 }, { rockets: 50, splitChance: 0.8, ufoCount: 4, rocketSpeedMult: 1.7 }, { rockets: 60, splitChance: 0.9, ufoCount: 5, rocketSpeedMult: 2.0 }] },
    ]
  }
};

const SHOP_ITEMS = [
  { id: 'turret', name: { zh: '修复炮台', en: 'Repair Turret' }, cost: 500, icon: <Shield className="w-4 h-4" /> },
  { id: 'heavy_ammo', name: { zh: '重型弹药 x5', en: 'Heavy Ammo x5' }, cost: 300, icon: <RocketIcon className="w-4 h-4" /> },
  { id: 'plane', name: { zh: '召唤援军飞机', en: 'Summon Support Plane' }, cost: 800, icon: <Zap className="w-4 h-4" /> },
  { id: 'repair_city', name: { zh: '修复所有城市', en: 'Repair All Cities' }, cost: 1000, icon: <Globe className="w-4 h-4" /> },
];

const TRANSLATIONS = {
  zh: {
    title: 'Mark新星防御',
    start: '开始游戏',
    win: '胜利！',
    loss: '城市陷落',
    score: '得分',
    ammo: '重型弹药',
    restart: '再玩一次',
    mission: '拦截敌方火箭和UFO，保护你的星球！',
    winMsg: '恭喜！你成功击退了外星入侵。',
    lossMsg: '防线已被突破。',
    turret: '炮台',
    wave: '波次',
    normalMissile: '普通导弹 (无限)',
    heavyMissile: '重型导弹 (有限)',
    nextWave: '下一波准备中...',
    planet: '当前星球',
    shop: '商城',
    buy: '购买',
    insufficient: '积分不足',
    selectSystem: '选择星系',
    level: '关卡',
    plane: '援军飞机',
    kamikaze: '自杀式攻击！',
    bossAlert: '警告：检测到巨型母舰！',
  },
  en: {
    title: 'Mark Nova Defense',
    start: 'Start Game',
    win: 'VICTORY!',
    loss: 'GAME OVER',
    score: 'Score',
    ammo: 'Heavy Ammo',
    restart: 'Play Again',
    mission: 'Intercept enemy rockets and UFOs to protect your planet!',
    winMsg: 'Congratulations! You repelled the alien invasion.',
    lossMsg: 'The defense line has fallen.',
    turret: 'Turret',
    wave: 'Wave',
    normalMissile: 'Normal Missile (Infinite)',
    heavyMissile: 'Heavy Missile (Limited)',
    nextWave: 'Preparing next wave...',
    planet: 'Current Planet',
    shop: 'Shop',
    buy: 'Buy',
    insufficient: 'Not enough points',
    selectSystem: 'Select Star System',
    level: 'Level',
    plane: 'Support Plane',
    kamikaze: 'Kamikaze Attack!',
    bossAlert: 'WARNING: Giant Mothership Detected!',
  }
};

export default function App() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = TRANSLATIONS[lang];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [currentSystem, setCurrentSystem] = useState<StarSystem>(StarSystem.SOLAR);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [currentWaveIndex, setCurrentWaveIndex] = useState(0);
  const [missileType, setMissileType] = useState<MissileType>(MissileType.NORMAL);
  
  const rocketsRef = useRef<Rocket[]>([]);
  const missilesRef = useRef<Missile[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const citiesRef = useRef<City[]>([]);
  const turretsRef = useRef<Turret[]>([]);
  const ufosRef = useRef<UFO[]>([]);
  const planesRef = useRef<Plane[]>([]);
  const frameIdRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const waveRocketsSpawned = useRef(0);
  const waveUfosSpawned = useRef(0);

  const currentLevel = useMemo(() => STAR_SYSTEM_CONFIGS[currentSystem]?.levels[currentLevelIndex] || STAR_SYSTEM_CONFIGS[StarSystem.SOLAR].levels[0], [currentSystem, currentLevelIndex]);
  const currentWave = useMemo(() => currentLevel?.waves[currentWaveIndex] || currentLevel?.waves[0], [currentLevel, currentWaveIndex]);
  const planetStyle = useMemo(() => PLANET_CONFIGS[currentLevel?.planet] || PLANET_CONFIGS[Planet.EARTH], [currentLevel]);

  const isTransitioningRef = useRef(false);

  const initGame = useCallback((system?: StarSystem, levelIdx = 0, waveIdx = 0) => {
    isTransitioningRef.current = false;
    if (system) setCurrentSystem(system);
    setCurrentLevelIndex(levelIdx);
    setCurrentWaveIndex(waveIdx);
    
    if (levelIdx === 0 && waveIdx === 0) setScore(0);
    
    rocketsRef.current = [];
    missilesRef.current = [];
    explosionsRef.current = [];
    ufosRef.current = [];
    planesRef.current = [];
    waveRocketsSpawned.current = 0;
    waveUfosSpawned.current = 0;
    
    if (waveIdx === 0) {
      citiesRef.current = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: 80 + i * 90 + (i > 3 ? 60 : 0),
        destroyed: false
      }));

      turretsRef.current = [
        { id: 0, x: 40, ammo: 15, maxAmmo: 15, destroyed: false },
        { id: 1, x: 400, ammo: 30, maxAmmo: 30, destroyed: false },
        { id: 2, x: 760, ammo: 15, maxAmmo: 15, destroyed: false },
        { id: 3, x: 220, ammo: 15, maxAmmo: 15, destroyed: false },
        { id: 4, x: 580, ammo: 15, maxAmmo: 15, destroyed: false },
      ];
    }

    setStatus(GameStatus.PLAYING);
  }, []);

  const spawnRocket = useCallback((type = RocketType.NORMAL, startPos?: Point, targetPos?: Point) => {
    const targets = [...citiesRef.current.filter(c => !c.destroyed), ...turretsRef.current.filter(t => !t.destroyed)];
    if (targets.length === 0 && !startPos) return;

    // For split children, pick a new random target if none provided
    const target = targetPos || (targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : { x: Math.random() * CANVAS_WIDTH, y: CANVAS_HEIGHT });
    const startX = startPos ? startPos.x : Math.random() * CANVAS_WIDTH;
    const startY = startPos ? startPos.y : 0;
    
    const newRocket: Rocket = {
      id: Math.random().toString(36).substr(2, 9),
      start: { x: startX, y: startY },
      current: { x: startX, y: startY },
      target: { x: 'x' in target ? target.x : target.x, y: CANVAS_HEIGHT - 20 },
      speed: (type === RocketType.SPLIT_CHILD ? 0.6 : 1) * (ROCKET_SPEED_MIN + Math.random() * (ROCKET_SPEED_MAX - ROCKET_SPEED_MIN)) * (currentWave?.rocketSpeedMult || 1),
      destroyed: false,
      type
    };
    rocketsRef.current.push(newRocket);
  }, [currentWave]);

  const spawnUFO = useCallback((isBoss = false) => {
    const newUFO: UFO = {
      id: Math.random().toString(36).substr(2, 9),
      pos: { x: -100, y: isBoss ? 100 : 50 + Math.random() * 100 },
      targetX: CANVAS_WIDTH + 100,
      speed: isBoss ? 0.5 : 1,
      lastShotTime: Date.now(),
      health: isBoss ? 2000 : 300,
      maxHealth: isBoss ? 2000 : 300,
      destroyed: false,
      isBoss
    };
    ufosRef.current.push(newUFO);
  }, []);

  const spawnPlane = useCallback(() => {
    const newPlane: Plane = {
      id: Math.random().toString(36).substr(2, 9),
      pos: { x: -50, y: 400 },
      targetX: CANVAS_WIDTH + 50,
      speed: 2,
      lastShotTime: Date.now(),
      state: 'FLYING',
      destroyed: false
    };
    planesRef.current.push(newPlane);
  }, []);

  const fireMissile = (targetX: number, targetY: number) => {
    if (status !== GameStatus.PLAYING) return;

    let bestTurretIndex = -1;
    let minDist = Infinity;

    turretsRef.current.forEach((turret, index) => {
      if (!turret.destroyed) {
        if (missileType === MissileType.HEAVY && turret.ammo <= 0) return;
        const dist = Math.abs(turret.x - targetX);
        if (dist < minDist) {
          minDist = dist;
          bestTurretIndex = index;
        }
      }
    });

    if (bestTurretIndex !== -1) {
      const turret = turretsRef.current[bestTurretIndex];
      if (missileType === MissileType.HEAVY) turret.ammo -= 1;
      
      const newMissile: Missile = {
        id: Math.random().toString(36).substr(2, 9),
        start: { x: turret.x, y: CANVAS_HEIGHT - 30 },
        current: { x: turret.x, y: CANVAS_HEIGHT - 30 },
        target: { x: targetX, y: targetY },
        speed: MISSILE_SPEED,
        reached: false,
        turretIndex: bestTurretIndex,
        type: missileType
      };
      missilesRef.current.push(newMissile);
    }
  };

  const update = useCallback(() => {
    if (status !== GameStatus.PLAYING) return;

    const config = currentWave;
    if (!config) return;
    const now = Date.now();

    // Spawn Logic
    if (waveRocketsSpawned.current < config.rockets) {
      const spawnRate = Math.max(800, 2500 - score / 10);
      if (now - lastSpawnTimeRef.current > spawnRate) {
        const isSplit = Math.random() < config.splitChance;
        spawnRocket(isSplit ? RocketType.SPLIT_PARENT : RocketType.NORMAL);
        waveRocketsSpawned.current++;
        lastSpawnTimeRef.current = now;
      }
    }

    if (waveUfosSpawned.current < config.ufoCount && ufosRef.current.length === 0 && waveRocketsSpawned.current > 5) {
      spawnUFO();
      waveUfosSpawned.current++;
    }

    // Update Planes
    planesRef.current.forEach(plane => {
      plane.pos.x += plane.speed;
      if (plane.pos.x > plane.targetX) plane.destroyed = true;

      if (plane.state === 'FLYING') {
        // Fire at UFOs
        if (now - plane.lastShotTime > 2000) {
          const targetUFO = ufosRef.current.find(u => !u.destroyed);
          if (targetUFO) {
            const newMissile: Missile = {
              id: Math.random().toString(36).substr(2, 9),
              start: { ...plane.pos },
              current: { ...plane.pos },
              target: { ...targetUFO.pos },
              speed: MISSILE_SPEED,
              reached: false,
              turretIndex: -1,
              type: MissileType.NORMAL
            };
            missilesRef.current.push(newMissile);
            plane.lastShotTime = now;
          }
        }
        // Check for Kamikaze
        const nearestUFO = ufosRef.current.find(u => !u.destroyed && Math.abs(u.pos.x - plane.pos.x) < 100);
        if (nearestUFO) {
          plane.state = 'KAMIKAZE';
          plane.targetUFOId = nearestUFO.id;
        }
      } else if (plane.state === 'KAMIKAZE') {
        const targetUFO = ufosRef.current.find(u => u.id === plane.targetUFOId && !u.destroyed);
        if (targetUFO) {
          const dx = targetUFO.pos.x - plane.pos.x;
          const dy = targetUFO.pos.y - plane.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          plane.pos.x += (dx / dist) * plane.speed * 2;
          plane.pos.y += (dy / dist) * plane.speed * 2;

          if (dist < 10) {
            plane.destroyed = true;
            targetUFO.health -= 500;
            explosionsRef.current.push({
              id: Math.random().toString(36).substr(2, 9),
              pos: { ...plane.pos },
              radius: 0,
              maxRadius: 150,
              growing: true,
              finished: false,
              damage: 500
            });
          }
        } else {
          plane.state = 'FLYING';
        }
      }
    });

    // Update UFOs
    ufosRef.current.forEach(ufo => {
      ufo.pos.x += ufo.speed;
      if (ufo.pos.x > ufo.targetX) ufo.destroyed = true;

      const shootInterval = ufo.isBoss ? 2000 : 10000;
      if (now - ufo.lastShotTime > shootInterval) {
        if (ufo.isBoss) {
          // Boss summons small UFOs or many rockets
          if (Math.random() < 0.3) {
            spawnUFO(false);
          } else {
            for (let i = 0; i < 3; i++) spawnRocket(RocketType.BOSS_SUMMON, { x: ufo.pos.x, y: ufo.pos.y });
          }
        } else {
          spawnRocket(RocketType.NORMAL, { x: ufo.pos.x, y: ufo.pos.y });
        }
        ufo.lastShotTime = now;
      }
    });

    // Update Rockets
    rocketsRef.current.forEach(rocket => {
      const dx = rocket.target.x - rocket.start.x;
      const dy = rocket.target.y - rocket.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / dist) * rocket.speed;
      const vy = (dy / dist) * rocket.speed;

      rocket.current.x += vx;
      rocket.current.y += vy;

      if (rocket.current.y >= rocket.target.y) {
        rocket.destroyed = true;
        citiesRef.current.forEach(city => {
          if (!city.destroyed && Math.abs(city.x - rocket.current.x) < 30) city.destroyed = true;
        });
        turretsRef.current.forEach(turret => {
          if (!turret.destroyed && Math.abs(turret.x - rocket.current.x) < 30) turret.destroyed = true;
        });
        explosionsRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          pos: { ...rocket.current },
          radius: 0,
          maxRadius: 30,
          growing: true,
          finished: false,
          damage: 10
        });
      }
    });

    // Update Missiles
    missilesRef.current.forEach(missile => {
      const dx = missile.target.x - missile.start.x;
      const dy = missile.target.y - missile.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / dist) * missile.speed;
      const vy = (dy / dist) * missile.speed;

      missile.current.x += vx;
      missile.current.y += vy;

      const distToTarget = Math.sqrt(
        Math.pow(missile.target.x - missile.current.x, 2) + 
        Math.pow(missile.target.y - missile.current.y, 2)
      );

      if (distToTarget < missile.speed) {
        missile.reached = true;
        explosionsRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          pos: { ...missile.target },
          radius: 0,
          maxRadius: missile.type === MissileType.HEAVY ? EXPLOSION_HEAVY_RADIUS : EXPLOSION_NORMAL_RADIUS,
          growing: true,
          finished: false,
          damage: missile.type === MissileType.HEAVY ? 100 : 20
        });
      }
    });

    // Update Explosions
    explosionsRef.current.forEach(exp => {
      if (exp.growing) {
        exp.radius += EXPLOSION_SPEED;
        if (exp.radius >= exp.maxRadius) exp.growing = false;
      } else {
        exp.radius -= EXPLOSION_SPEED * 0.5;
        if (exp.radius <= 0) exp.finished = true;
      }

      // Hit Rockets
      rocketsRef.current.forEach(rocket => {
        if (!rocket.destroyed) {
          const d = Math.sqrt(Math.pow(rocket.current.x - exp.pos.x, 2) + Math.pow(rocket.current.y - exp.pos.y, 2));
          if (d < exp.radius) {
            rocket.destroyed = true;
            setScore(s => s + 20);
            
            // Split Logic
            if (rocket.type === RocketType.SPLIT_PARENT) {
              for (let i = 0; i < 5; i++) {
                spawnRocket(RocketType.SPLIT_CHILD, { x: rocket.current.x, y: rocket.current.y });
              }
            }
          }
        }
      });

      // Hit UFOs
      ufosRef.current.forEach(ufo => {
        if (!ufo.destroyed) {
          const d = Math.sqrt(Math.pow(ufo.pos.x - exp.pos.x, 2) + Math.pow(ufo.pos.y - exp.pos.y, 2));
          if (d < exp.radius + 20) {
            ufo.health -= exp.damage;
            if (ufo.health <= 0) {
              ufo.destroyed = true;
              setScore(s => s + 500);
            }
          }
        }
      });
    });

    // Cleanup
    rocketsRef.current = rocketsRef.current.filter(r => !r.destroyed);
    missilesRef.current = missilesRef.current.filter(m => !m.reached);
    explosionsRef.current = explosionsRef.current.filter(e => !e.finished);
    ufosRef.current = ufosRef.current.filter(u => !u.destroyed);

    // Wave Transition
    if (!isTransitioningRef.current && waveRocketsSpawned.current >= (currentWave?.rockets || 0) && rocketsRef.current.length === 0 && ufosRef.current.length === 0) {
      isTransitioningRef.current = true;
      if (currentWaveIndex < currentLevel.waves.length - 1) {
        setStatus(GameStatus.WAVE_TRANSITION);
        setTimeout(() => initGame(currentSystem, currentLevelIndex, currentWaveIndex + 1), 3000);
      } else {
        // Level Transition
        if (currentLevelIndex < STAR_SYSTEM_CONFIGS[currentSystem].levels.length - 1) {
          setStatus(GameStatus.LEVEL_TRANSITION);
          setTimeout(() => initGame(currentSystem, currentLevelIndex + 1, 0), 3000);
        } else {
          setStatus(GameStatus.WON);
        }
      }
    }

    if (turretsRef.current.length > 0 && turretsRef.current.every(t => t.destroyed) && citiesRef.current.every(c => c.destroyed)) {
      setStatus(GameStatus.LOST);
    }

  }, [status, score, currentWave, spawnRocket, spawnUFO, initGame, missileType]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with Planet BG
    ctx.fillStyle = planetStyle.bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Ground
    ctx.fillStyle = planetStyle.ground;
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);

    // Draw Cities
    citiesRef.current.forEach(city => {
      if (!city.destroyed) {
        ctx.fillStyle = planetStyle.city;
        ctx.fillRect(city.x - 15, CANVAS_HEIGHT - 35, 30, 15);
        ctx.fillStyle = planetStyle.cityTop;
        ctx.fillRect(city.x - 10, CANVAS_HEIGHT - 45, 20, 10);
      } else {
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(city.x - 15, CANVAS_HEIGHT - 25, 30, 5);
      }
    });

    // Draw Turrets
    turretsRef.current.forEach(turret => {
      if (!turret.destroyed) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(turret.x, CANVAS_HEIGHT - 20, 25, Math.PI, 0);
        ctx.fill();
        
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(turret.x, CANVAS_HEIGHT - 35);
        ctx.lineTo(turret.x, CANVAS_HEIGHT - 45);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(turret.ammo.toString(), turret.x, CANVAS_HEIGHT - 5);
      } else {
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.arc(turret.x, CANVAS_HEIGHT - 20, 20, Math.PI, 0);
        ctx.fill();
      }
    });

    // Draw Planes
    planesRef.current.forEach(plane => {
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.moveTo(plane.pos.x + 20, plane.pos.y);
      ctx.lineTo(plane.pos.x - 10, plane.pos.y - 10);
      ctx.lineTo(plane.pos.x - 10, plane.pos.y + 10);
      ctx.closePath();
      ctx.fill();
      if (plane.state === 'KAMIKAZE') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw UFOs
    ufosRef.current.forEach(ufo => {
      const size = ufo.isBoss ? 120 : 30;
      ctx.fillStyle = ufo.isBoss ? '#4c1d95' : '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(ufo.pos.x, ufo.pos.y, size, size / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ufo.isBoss ? '#7c3aed' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(ufo.pos.x, ufo.pos.y - size / 6, size / 2.5, Math.PI, 0);
      ctx.fill();

      // Health Bar
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(ufo.pos.x - size * 0.6, ufo.pos.y - size * 0.8, size * 1.2, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(ufo.pos.x - size * 0.6, ufo.pos.y - size * 0.8, size * 1.2 * (ufo.health / ufo.maxHealth), 4);
    });

    // Draw Rockets
    rocketsRef.current.forEach(rocket => {
      ctx.strokeStyle = rocket.type === RocketType.SPLIT_PARENT ? '#fbbf24' : rocket.type === RocketType.SPLIT_CHILD ? '#f87171' : '#ef4444';
      ctx.lineWidth = rocket.type === RocketType.SPLIT_PARENT ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(rocket.start.x, rocket.start.y);
      ctx.lineTo(rocket.current.x, rocket.current.y);
      ctx.stroke();

      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(rocket.current.x - 2, rocket.current.y - 2, 4, 4);
    });

    // Draw Missiles
    missilesRef.current.forEach(missile => {
      ctx.strokeStyle = missile.type === MissileType.HEAVY ? '#10b981' : '#fff';
      ctx.lineWidth = missile.type === MissileType.HEAVY ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(missile.start.x, missile.start.y);
      ctx.lineTo(missile.current.x, missile.current.y);
      ctx.stroke();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      const tx = missile.target.x;
      const ty = missile.target.y;
      ctx.beginPath();
      ctx.moveTo(tx - 5, ty - 5); ctx.lineTo(tx + 5, ty + 5);
      ctx.moveTo(tx + 5, ty - 5); ctx.lineTo(tx - 5, ty + 5);
      ctx.stroke();
    });

    // Draw Explosions
    explosionsRef.current.forEach(exp => {
      const gradient = ctx.createRadialGradient(exp.pos.x, exp.pos.y, 0, exp.pos.x, exp.pos.y, exp.radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.3, exp.maxRadius > 80 ? '#10b981' : '#fbbf24');
      gradient.addColorStop(0.7, exp.maxRadius > 80 ? '#065f46' : '#ef4444');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(exp.pos.x, exp.pos.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [planetStyle]);

  useEffect(() => {
    const loop = () => {
      update();
      draw();
      frameIdRef.current = requestAnimationFrame(loop);
    };
    frameIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [update, draw]);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (status !== GameStatus.PLAYING) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    fireMissile((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  };

  const handleShopBuy = (itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || score < item.cost) return;

    let success = false;
    switch (itemId) {
      case 'turret':
        const destroyedTurret = turretsRef.current.find(t => t.destroyed);
        if (destroyedTurret) {
          destroyedTurret.destroyed = false;
          destroyedTurret.ammo = destroyedTurret.maxAmmo;
          success = true;
        }
        break;
      case 'heavy_ammo':
        turretsRef.current.forEach(t => {
          if (!t.destroyed) t.ammo = Math.min(t.maxAmmo, t.ammo + 5);
        });
        success = true;
        break;
      case 'plane':
        spawnPlane();
        success = true;
        break;
      case 'repair_city':
        citiesRef.current.forEach(c => c.destroyed = false);
        success = true;
        break;
    }

    if (success) {
      setScore(s => s - item.cost);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              {planetStyle.icon}
              {t.planet}: {planetStyle.name[lang]}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setStatus(s => s === GameStatus.SHOP ? GameStatus.PLAYING : GameStatus.SHOP)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 transition-all"
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold uppercase tracking-widest">{t.shop}</span>
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{t.wave}</span>
            <span className="text-xl font-mono font-bold text-blue-400">{currentWaveIndex + 1} / 3</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{t.score}</span>
            <span className="text-2xl font-mono font-bold text-emerald-400">{score.toString().padStart(5, '0')}</span>
          </div>
          <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Languages className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasClick}
          className="relative bg-black rounded-lg shadow-2xl cursor-crosshair w-full max-w-[800px] aspect-[4/3] touch-none border border-white/10"
        />

        {/* Overlays */}
        <AnimatePresence>
          {status !== GameStatus.PLAYING && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center p-8 max-w-md w-full">
                {status === GameStatus.START && (
                  <>
                    <div className="mb-6 inline-flex p-4 bg-emerald-500/10 rounded-full"><Target className="w-12 h-12 text-emerald-400" /></div>
                    <h2 className="text-4xl font-bold mb-4">{t.title}</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">{t.mission}</p>
                    <button onClick={() => setStatus(GameStatus.SYSTEM_SELECT)} className="px-8 py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all active:scale-95">{t.start}</button>
                  </>
                )}
                {status === GameStatus.SYSTEM_SELECT && (
                  <div className="grid grid-cols-1 gap-4">
                    <h2 className="text-2xl font-bold mb-4">{t.selectSystem}</h2>
                    {Object.entries(STAR_SYSTEM_CONFIGS).map(([key, system]) => (
                      <button 
                        key={key}
                        onClick={() => initGame(key as StarSystem, 0, 0)}
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between group transition-all"
                      >
                        <span className="text-lg font-bold">{system.name[lang]}</span>
                        <Target className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
                {status === GameStatus.SHOP && (
                  <div className="w-full">
                    <h2 className="text-3xl font-bold mb-6 flex items-center justify-center gap-3">
                      <Zap className="w-8 h-8 text-yellow-400" />
                      {t.shop}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 mb-8">
                      {SHOP_ITEMS.map(item => (
                        <button 
                          key={item.id}
                          onClick={() => handleShopBuy(item.id)}
                          disabled={score < item.cost}
                          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${score >= item.cost ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-lg">{item.icon}</div>
                            <span className="font-bold">{item.name[lang]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-mono font-bold">{item.cost}</span>
                            <span className="text-[10px] uppercase text-gray-500">{t.score}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setStatus(GameStatus.PLAYING)} className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all">{t.restart}</button>
                  </div>
                )}
                {status === GameStatus.WAVE_TRANSITION && (
                  <div className="flex flex-col items-center">
                    <RocketIcon className="w-16 h-16 text-blue-400 mb-4 animate-bounce" />
                    <h2 className="text-4xl font-bold mb-2">{t.wave} {currentWaveIndex + 1} 完成</h2>
                    <p className="text-blue-400 font-bold tracking-widest animate-pulse">{t.nextWave}</p>
                  </div>
                )}
                {status === GameStatus.LEVEL_TRANSITION && (
                  <div className="flex flex-col items-center">
                    <Globe className="w-16 h-16 text-emerald-400 mb-4 animate-pulse" />
                    <h2 className="text-4xl font-bold mb-2">{currentLevel.name[lang]} {t.win}</h2>
                    <p className="text-emerald-400 font-bold tracking-widest animate-pulse">前往下一个星球...</p>
                  </div>
                )}
                {status === GameStatus.WON && (
                  <>
                    <div className="mb-6 inline-flex p-4 bg-yellow-500/10 rounded-full"><Trophy className="w-12 h-12 text-yellow-400" /></div>
                    <h2 className="text-4xl font-bold mb-2 text-yellow-400">{t.win}</h2>
                    <p className="text-gray-400 mb-8">{t.winMsg}</p>
                    <button onClick={() => setStatus(GameStatus.SYSTEM_SELECT)} className="flex items-center gap-2 mx-auto px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95"><RotateCcw className="w-5 h-5" />{t.restart}</button>
                  </>
                )}
                {status === GameStatus.LOST && (
                  <>
                    <div className="mb-6 inline-flex p-4 bg-red-500/10 rounded-full"><AlertTriangle className="w-12 h-12 text-red-400" /></div>
                    <h2 className="text-4xl font-bold mb-2 text-red-400">{t.loss}</h2>
                    <p className="text-gray-400 mb-8">{t.lossMsg}</p>
                    <button onClick={() => setStatus(GameStatus.SYSTEM_SELECT)} className="flex items-center gap-2 mx-auto px-8 py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-all active:scale-95"><RotateCcw className="w-5 h-5" />{t.restart}</button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls & Ammo */}
      <div className="mt-6 w-full max-w-[800px] flex flex-col md:flex-row gap-6">
        <div className="flex-1 grid grid-cols-2 gap-4">
          <button 
            onClick={() => setMissileType(MissileType.NORMAL)}
            className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${missileType === MissileType.NORMAL ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            <div className={`p-2 rounded-lg ${missileType === MissileType.NORMAL ? 'bg-emerald-500' : 'bg-gray-700'}`}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Type 1</div>
              <div className="text-sm font-bold">{t.normalMissile}</div>
            </div>
          </button>
          <button 
            onClick={() => setMissileType(MissileType.HEAVY)}
            className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${missileType === MissileType.HEAVY ? 'bg-blue-500/20 border-blue-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            <div className={`p-2 rounded-lg ${missileType === MissileType.HEAVY ? 'bg-blue-500' : 'bg-gray-700'}`}>
              <RocketIcon className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Type 2</div>
              <div className="text-sm font-bold">{t.heavyMissile}</div>
            </div>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {turretsRef.current.map((turret, i) => (
            <div key={i} className={`p-3 rounded-xl border flex flex-col items-center min-w-[70px] ${turret.destroyed ? 'bg-red-500/10 border-red-500/20 opacity-50' : 'bg-white/5 border-white/10'}`}>
              <div className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mb-1">T{i+1}</div>
              <div className={`text-lg font-mono font-bold ${turret.destroyed ? 'text-red-400' : 'text-blue-400'}`}>
                {turret.destroyed ? 'X' : turret.ammo}
              </div>
              {!turret.destroyed && (
                <div className="w-full h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${(turret.ammo / turret.maxAmmo) * 100}%` }}></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .cursor-crosshair {
          cursor: crosshair;
        }
        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .boss-alert {
          animation: pulse-red 1s infinite;
        }
      `}</style>
    </div>
  );
}
