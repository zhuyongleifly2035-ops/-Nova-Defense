/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Trophy, AlertTriangle, RotateCcw, Languages } from 'lucide-react';
import { GameStatus, Point, Rocket, Missile, Explosion, City, Turret } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const EXPLOSION_MAX_RADIUS = 60;
const EXPLOSION_SPEED = 1.5;
const MISSILE_SPEED = 10;
const ROCKET_SPEED_MIN = 0.4;
const ROCKET_SPEED_MAX = 1.2;
const WIN_SCORE = 1000;

const TRANSLATIONS = {
  zh: {
    title: 'Mark新星防御',
    start: '开始游戏',
    win: '胜利！',
    loss: '城市陷落',
    score: '得分',
    ammo: '弹药',
    restart: '再玩一次',
    mission: '拦截所有敌方火箭，保护城市！',
    winMsg: '恭喜！你成功保卫了地球。',
    lossMsg: '防线已被突破。',
    turret: '炮台',
  },
  en: {
    title: 'Mark Nova Defense',
    start: 'Start Game',
    win: 'VICTORY!',
    loss: 'GAME OVER',
    score: 'Score',
    ammo: 'Ammo',
    restart: 'Play Again',
    mission: 'Intercept enemy rockets and protect your cities!',
    winMsg: 'Congratulations! You saved the planet.',
    lossMsg: 'The defense line has fallen.',
    turret: 'Turret',
  }
};

export default function App() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = TRANSLATIONS[lang];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  
  // Game State Refs (for high-performance game loop)
  const rocketsRef = useRef<Rocket[]>([]);
  const missilesRef = useRef<Missile[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const citiesRef = useRef<City[]>([]);
  const turretsRef = useRef<Turret[]>([]);
  const frameIdRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);

  // Initialize Game
  const initGame = useCallback(() => {
    setScore(0);
    rocketsRef.current = [];
    missilesRef.current = [];
    explosionsRef.current = [];
    
    // 6 Cities
    citiesRef.current = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 100 + i * 120 + (i > 2 ? 80 : 0), // Spread around turrets
      destroyed: false
    }));

    // 3 Turrets
    turretsRef.current = [
      { id: 0, x: 40, ammo: 30, maxAmmo: 30, destroyed: false },
      { id: 1, x: 400, ammo: 60, maxAmmo: 60, destroyed: false },
      { id: 2, x: 760, ammo: 30, maxAmmo: 30, destroyed: false },
    ];

    setStatus(GameStatus.PLAYING);
  }, []);

  const spawnRocket = useCallback(() => {
    const targets = [...citiesRef.current.filter(c => !c.destroyed), ...turretsRef.current.filter(t => !t.destroyed)];
    if (targets.length === 0) return;

    const target = targets[Math.floor(Math.random() * targets.length)];
    const startX = Math.random() * CANVAS_WIDTH;
    
    const newRocket: Rocket = {
      id: Math.random().toString(36).substr(2, 9),
      start: { x: startX, y: 0 },
      current: { x: startX, y: 0 },
      target: { x: 'x' in target ? target.x : target.x, y: CANVAS_HEIGHT - 20 },
      speed: ROCKET_SPEED_MIN + Math.random() * (ROCKET_SPEED_MAX - ROCKET_SPEED_MIN),
      destroyed: false
    };
    rocketsRef.current.push(newRocket);
  }, []);

  const fireMissile = (targetX: number, targetY: number) => {
    if (status !== GameStatus.PLAYING) return;

    // Find nearest turret with ammo
    let bestTurretIndex = -1;
    let minDist = Infinity;

    turretsRef.current.forEach((turret, index) => {
      if (!turret.destroyed && turret.ammo > 0) {
        const dist = Math.abs(turret.x - targetX);
        if (dist < minDist) {
          minDist = dist;
          bestTurretIndex = index;
        }
      }
    });

    if (bestTurretIndex !== -1) {
      const turret = turretsRef.current[bestTurretIndex];
      turret.ammo -= 1;
      
      const newMissile: Missile = {
        id: Math.random().toString(36).substr(2, 9),
        start: { x: turret.x, y: CANVAS_HEIGHT - 30 },
        current: { x: turret.x, y: CANVAS_HEIGHT - 30 },
        target: { x: targetX, y: targetY },
        speed: MISSILE_SPEED,
        reached: false,
        turretIndex: bestTurretIndex
      };
      missilesRef.current.push(newMissile);
    }
  };

  const update = useCallback(() => {
    if (status !== GameStatus.PLAYING) return;

    // Spawn rockets
    const now = Date.now();
    const spawnRate = Math.max(800, 2500 - score); // Slower spawn rate
    if (now - lastSpawnTimeRef.current > spawnRate) {
      spawnRocket();
      lastSpawnTimeRef.current = now;
    }

    // Update Rockets
    rocketsRef.current.forEach(rocket => {
      const dx = rocket.target.x - rocket.start.x;
      const dy = rocket.target.y - rocket.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / dist) * rocket.speed;
      const vy = (dy / dist) * rocket.speed;

      rocket.current.x += vx;
      rocket.current.y += vy;

      // Check if hit target
      if (rocket.current.y >= rocket.target.y) {
        rocket.destroyed = true;
        // Damage city or turret
        citiesRef.current.forEach(city => {
          if (!city.destroyed && Math.abs(city.x - rocket.current.x) < 30) {
            city.destroyed = true;
          }
        });
        turretsRef.current.forEach(turret => {
          if (!turret.destroyed && Math.abs(turret.x - rocket.current.x) < 30) {
            turret.destroyed = true;
          }
        });
        // Create impact explosion
        explosionsRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          pos: { ...rocket.current },
          radius: 0,
          maxRadius: 30,
          growing: true,
          finished: false
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
          maxRadius: EXPLOSION_MAX_RADIUS,
          growing: true,
          finished: false
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

      // Check collision with rockets
      rocketsRef.current.forEach(rocket => {
        if (!rocket.destroyed) {
          const d = Math.sqrt(
            Math.pow(rocket.current.x - exp.pos.x, 2) + 
            Math.pow(rocket.current.y - exp.pos.y, 2)
          );
          if (d < exp.radius) {
            rocket.destroyed = true;
            setScore(s => s + 20);
          }
        }
      });
    });

    // Cleanup
    rocketsRef.current = rocketsRef.current.filter(r => !r.destroyed);
    missilesRef.current = missilesRef.current.filter(m => !m.reached);
    explosionsRef.current = explosionsRef.current.filter(e => !e.finished);

    // Check Win/Loss
    if (score >= WIN_SCORE) {
      setStatus(GameStatus.WON);
    }
    if (turretsRef.current.every(t => t.destroyed)) {
      setStatus(GameStatus.LOST);
    }

  }, [status, score, spawnRocket]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);

    // Draw Cities
    citiesRef.current.forEach(city => {
      if (!city.destroyed) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(city.x - 15, CANVAS_HEIGHT - 35, 30, 15);
        ctx.fillStyle = '#60a5fa';
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
        
        // Barrel
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(turret.x, CANVAS_HEIGHT - 35);
        ctx.lineTo(turret.x, CANVAS_HEIGHT - 45);
        ctx.stroke();

        // Ammo indicator
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

    // Draw Rockets
    rocketsRef.current.forEach(rocket => {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rocket.start.x, rocket.start.y);
      ctx.lineTo(rocket.current.x, rocket.current.y);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(rocket.current.x - 2, rocket.current.y - 2, 4, 4);
    });

    // Draw Missiles
    missilesRef.current.forEach(missile => {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(missile.start.x, missile.start.y);
      ctx.lineTo(missile.current.x, missile.current.y);
      ctx.stroke();

      // Target X
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
      gradient.addColorStop(0.3, '#fbbf24');
      gradient.addColorStop(0.7, '#ef4444');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(exp.pos.x, exp.pos.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    });

  }, []);

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

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    fireMissile(x, y);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{t.score}</span>
            <span className="text-2xl font-mono font-bold text-emerald-400">{score.toString().padStart(4, '0')}</span>
          </div>
          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Languages className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/20 to-blue-500/20 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasClick}
          className="relative bg-black rounded-lg shadow-2xl cursor-crosshair w-full max-w-[800px] aspect-[4/3] touch-none"
        />

        {/* Overlays */}
        <AnimatePresence>
          {status !== GameStatus.PLAYING && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center p-8 max-w-md"
              >
                {status === GameStatus.START && (
                  <>
                    <div className="mb-6 inline-flex p-4 bg-emerald-500/10 rounded-full">
                      <Target className="w-12 h-12 text-emerald-400" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4">{t.title}</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">{t.mission}</p>
                    <button 
                      onClick={initGame}
                      className="group relative px-8 py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all active:scale-95 overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {t.start}
                      </span>
                    </button>
                  </>
                )}

                {status === GameStatus.WON && (
                  <>
                    <div className="mb-6 inline-flex p-4 bg-yellow-500/10 rounded-full">
                      <Trophy className="w-12 h-12 text-yellow-400" />
                    </div>
                    <h2 className="text-4xl font-bold mb-2 text-yellow-400">{t.win}</h2>
                    <p className="text-gray-400 mb-4">{t.winMsg}</p>
                    <div className="text-3xl font-mono font-bold mb-8">{t.score}: {score}</div>
                    <button 
                      onClick={initGame}
                      className="flex items-center gap-2 mx-auto px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95"
                    >
                      <RotateCcw className="w-5 h-5" />
                      {t.restart}
                    </button>
                  </>
                )}

                {status === GameStatus.LOST && (
                  <>
                    <div className="mb-6 inline-flex p-4 bg-red-500/10 rounded-full">
                      <AlertTriangle className="w-12 h-12 text-red-400" />
                    </div>
                    <h2 className="text-4xl font-bold mb-2 text-red-400">{t.loss}</h2>
                    <p className="text-gray-400 mb-4">{t.lossMsg}</p>
                    <div className="text-3xl font-mono font-bold mb-8">{t.score}: {score}</div>
                    <button 
                      onClick={initGame}
                      className="flex items-center gap-2 mx-auto px-8 py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-all active:scale-95"
                    >
                      <RotateCcw className="w-5 h-5" />
                      {t.restart}
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[800px]">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{t.turret} 1</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">30 {t.ammo}</span>
            <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{t.turret} 2</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">60 {t.ammo}</span>
            <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{t.turret} 3</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">30 {t.ammo}</span>
            <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .cursor-crosshair {
          cursor: crosshair;
        }
      `}</style>
    </div>
  );
}
