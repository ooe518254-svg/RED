import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { claimMiningReward } from '../lib/supabase';
import {
  Pickaxe,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface MiningScreenProps {
  user: User;
  onBalanceUpdated: (newBalance: number) => void;
}

const CYCLE_DURATION_SECONDS = 300; // 5 minutes

export const MiningScreen: React.FC<MiningScreenProps> = ({ user, onBalanceUpdated }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mining progress state (in seconds)
  const storageKey = `red_mining_seconds_${user.username}`;
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? Math.min(CYCLE_DURATION_SECONDS, parseFloat(saved) || 0) : 0;
    } catch {
      return 0;
    }
  });

  const [gameState, setGameState] = useState<'ready' | 'running' | 'gameover'>('ready');
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(`red_dino_highscore_${user.username}`) || '0', 10);
    } catch {
      return 0;
    }
  });
  const [isClaiming, setIsClaiming] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);

  // Ref tracking for canvas animation loop
  const gameStateRef = useRef<'ready' | 'running' | 'gameover'>('ready');
  gameStateRef.current = gameState;

  const elapsedSecondsRef = useRef<number>(elapsedSeconds);
  elapsedSecondsRef.current = elapsedSeconds;

  // Game variables
  const runnerRef = useRef({
    x: 40,
    y: 0,
    width: 28,
    height: 32,
    vy: 0,
    isGrounded: true,
    legFrame: 0,
  });

  const obstaclesRef = useRef<Array<{ x: number; y: number; width: number; height: number; type: number }>>([]);
  const groundOffsetRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const nextObstacleSpawnRef = useRef<number>(140);
  const scoreCounterRef = useRef<number>(0);

  // Persist mining seconds
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(elapsedSeconds));
    } catch (e) {
      console.warn('Could not save mining seconds', e);
    }
  }, [elapsedSeconds, storageKey]);

  // Jump handler
  const triggerJump = useCallback(() => {
    if (gameStateRef.current === 'ready' || gameStateRef.current === 'gameover') {
      startGame();
      return;
    }

    const runner = runnerRef.current;
    if (runner.isGrounded) {
      runner.vy = -10.5;
      runner.isGrounded = false;
    }
  }, []);

  // Keyboard controls (Space / ArrowUp)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        triggerJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerJump]);

  // Game loop
  const startGame = () => {
    obstaclesRef.current = [];
    runnerRef.current.y = 0;
    runnerRef.current.vy = 0;
    runnerRef.current.isGrounded = true;
    nextObstacleSpawnRef.current = 100;
    scoreCounterRef.current = 0;
    setCurrentScore(0);
    setGameState('running');
    gameStateRef.current = 'running';
    lastTimeRef.current = performance.now();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timerAccumulator = 0;

    const render = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      const width = canvas.width;
      const height = canvas.height;
      const groundY = height - 28;

      // Clear background with dark retro gradient
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Starfield / background grid dots
      ctx.fillStyle = '#1e293b';
      for (let i = 15; i < width; i += 40) {
        ctx.fillRect(i, 20 + ((i * 7) % (groundY - 40)), 2, 2);
      }

      // If playing, accumulate mining time
      if (gameStateRef.current === 'running') {
        timerAccumulator += dt;
        if (timerAccumulator >= 1.0) {
          const added = Math.floor(timerAccumulator);
          timerAccumulator -= added;
          setElapsedSeconds((prev) => {
            const updated = prev + added;
            return Math.min(CYCLE_DURATION_SECONDS, updated);
          });
        }

        // Score
        scoreCounterRef.current += dt * 10;
        setCurrentScore(Math.floor(scoreCounterRef.current));
      }

      // Ground Line
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, groundY, width, 2);

      // Moving ground particles
      if (gameStateRef.current === 'running') {
        groundOffsetRef.current = (groundOffsetRef.current + 220 * dt) % width;
      }
      ctx.fillStyle = '#475569';
      for (let gx = 0; gx < width; gx += 24) {
        const px = (gx - groundOffsetRef.current + width) % width;
        ctx.fillRect(px, groundY + 5, 4, 2);
        ctx.fillRect((px + 12) % width, groundY + 12, 6, 2);
      }

      const runner = runnerRef.current;

      // Update Runner physics
      if (gameStateRef.current === 'running') {
        runner.vy += 26 * dt; // gravity
        runner.y += runner.vy;

        if (runner.y >= 0) {
          runner.y = 0;
          runner.vy = 0;
          runner.isGrounded = true;
        }

        // Running leg animation
        runner.legFrame = (runner.legFrame + dt * 12) % 2;

        // Obstacles spawn & movement
        nextObstacleSpawnRef.current -= dt * 60;
        if (nextObstacleSpawnRef.current <= 0) {
          const obstacleType = Math.random() > 0.4 ? 1 : 2;
          const obsHeight = obstacleType === 1 ? 24 : 34;
          const obsWidth = obstacleType === 1 ? 16 : 22;
          obstaclesRef.current.push({
            x: width + 20,
            y: groundY - obsHeight,
            width: obsWidth,
            height: obsHeight,
            type: obstacleType,
          });
          nextObstacleSpawnRef.current = 75 + Math.random() * 80;
        }

        const gameSpeed = 220 + Math.min(scoreCounterRef.current * 0.4, 140);
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obs = obstaclesRef.current[i];
          obs.x -= gameSpeed * dt;

          // Remove off-screen
          if (obs.x + obs.width < -10) {
            obstaclesRef.current.splice(i, 1);
            continue;
          }

          // AABB Collision Detection with small padding
          const runnerBox = {
            left: runner.x + 3,
            right: runner.x + runner.width - 3,
            top: groundY - runner.height + runner.y + 3,
            bottom: groundY + runner.y,
          };

          const obsBox = {
            left: obs.x + 2,
            right: obs.x + obs.width - 2,
            top: obs.y + 2,
            bottom: obs.y + obs.height,
          };

          if (
            runnerBox.right > obsBox.left &&
            runnerBox.left < obsBox.right &&
            runnerBox.bottom > obsBox.top &&
            runnerBox.top < obsBox.bottom
          ) {
            // Collision!
            setGameState('gameover');
            gameStateRef.current = 'gameover';
            setHighScore((prev) => {
              const newHigh = Math.max(prev, Math.floor(scoreCounterRef.current));
              try {
                localStorage.setItem(`red_dino_highscore_${user.username}`, String(newHigh));
              } catch {}
              return newHigh;
            });
          }
        }
      }

      // Draw Obstacles (Pixel Spikes / Obstacle Blocks)
      obstaclesRef.current.forEach((obs) => {
        ctx.fillStyle = '#f43f5e'; // rose-500
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Pixel detail on obstacles
        ctx.fillStyle = '#fda4af';
        ctx.fillRect(obs.x + 2, obs.y + 2, obs.width - 4, 3);
        ctx.fillStyle = '#9f1239';
        ctx.fillRect(obs.x + obs.width - 4, obs.y + 4, 3, obs.height - 4);
      });

      // Draw Runner: "Red Block" character with pixel eye, ruby core & running legs
      const rx = runner.x;
      const ry = groundY - runner.height + runner.y;

      // Glow aura
      ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
      ctx.fillRect(rx - 3, ry - 3, runner.width + 6, runner.height + 6);

      // Main block body
      ctx.fillStyle = '#e11d48'; // rose-600
      ctx.fillRect(rx, ry, runner.width, runner.height - 6);

      // Highlight bevel
      ctx.fillStyle = '#fb7185'; // rose-400
      ctx.fillRect(rx, ry, runner.width, 4);
      ctx.fillRect(rx, ry, 4, runner.height - 6);

      // Pixel eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx + runner.width - 9, ry + 7, 5, 5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(rx + runner.width - 6, ry + 8, 3, 3);

      // Center RTC ruby pixel core
      ctx.fillStyle = '#ffe4e6';
      ctx.fillRect(rx + 8, ry + 13, 6, 6);

      // Running legs (alternating pixel legs)
      ctx.fillStyle = '#be123c';
      if (runner.isGrounded) {
        if (Math.floor(runner.legFrame) === 0) {
          ctx.fillRect(rx + 4, ry + runner.height - 6, 6, 6);
          ctx.fillRect(rx + runner.width - 10, ry + runner.height - 9, 6, 5);
        } else {
          ctx.fillRect(rx + 4, ry + runner.height - 9, 6, 5);
          ctx.fillRect(rx + runner.width - 10, ry + runner.height - 6, 6, 6);
        }
      } else {
        // Tucked jumping legs
        ctx.fillRect(rx + 4, ry + runner.height - 8, 6, 4);
        ctx.fillRect(rx + runner.width - 10, ry + runner.height - 8, 6, 4);
      }

      // Ready overlay
      if (gameStateRef.current === 'ready') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TAP OR PRESS SPACE TO START MINING', width / 2, height / 2 - 6);

        ctx.fillStyle = '#f43f5e';
        ctx.font = '11px monospace';
        ctx.fillText('Jump over obstacles to keep mining active', width / 2, height / 2 + 16);
      }

      // Game Over overlay
      if (gameStateRef.current === 'gameover') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#fb7185';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OBSTACLE HIT!', width / 2, height / 2 - 10);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText('Tap to restart (Timer is preserved!)', width / 2, height / 2 + 12);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [user.username]);

  // Dynamic canvas sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = Math.floor(rect.width);
        canvasRef.current.height = 180;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Claim Reward (+1 RTC)
  const handleClaim = async () => {
    if (elapsedSeconds < CYCLE_DURATION_SECONDS || isClaiming) return;

    setIsClaiming(true);
    try {
      const result = await claimMiningReward(user.username);
      onBalanceUpdated(result.newBalance);
      setRewardClaimed(true);
      setCycleCount((c) => c + 1);

      // Reset mining timer for next cycle
      setElapsedSeconds(0);
      try {
        localStorage.setItem(storageKey, '0');
      } catch {}

      setTimeout(() => {
        setRewardClaimed(false);
      }, 4000);
    } catch (err) {
      console.error('Failed to claim mining reward:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  const progressPercent = Math.min(100, Math.floor((elapsedSeconds / CYCLE_DURATION_SECONDS) * 100));
  const remainingSeconds = Math.max(0, CYCLE_DURATION_SECONDS - elapsedSeconds);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isCycleComplete = elapsedSeconds >= CYCLE_DURATION_SECONDS;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 space-y-6 pb-24">
      {/* MINING STATUS & CYCLE PROGRESS CARD */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pickaxe className="w-4 h-4 text-rose-500 animate-bounce" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              RTC Proof-of-Play Mining
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-rose-400">
            Reward: +1 RTC
          </span>
        </div>

        {/* Progress Bar & Time */}
        <div className="space-y-2 mt-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Cumulative Playtime:
            </span>
            <span className="text-white font-bold">
              {formatTime(elapsedSeconds)} / {formatTime(CYCLE_DURATION_SECONDS)} ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 rounded-full transition-all duration-300 shadow-sm shadow-rose-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400">
            <span>{isCycleComplete ? 'Cycle completed!' : `${formatTime(remainingSeconds)} remaining`}</span>
            <span>Target: 5 Min Cumulative</span>
          </div>
        </div>

        {/* Claim Button */}
        <div className="mt-4">
          {isCycleComplete ? (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
            >
              {isClaiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Supabase Ledger...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Claim +1 RTC Mining Reward</span>
                </>
              )}
            </button>
          ) : (
            <div className="py-2.5 px-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs text-slate-400">
              Keep playing to complete the 5-minute cycle. Hitting obstacles will not lose your progress.
            </div>
          )}

          {rewardClaimed && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>+1 RTC added to your balance & synced to Supabase!</span>
            </div>
          )}
        </div>
      </div>

      {/* 2D CANVAS RETRO GAME */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-mono">
              Score: <span className="text-white font-bold">{currentScore}</span>
            </span>
            <span className="text-slate-400 font-mono flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              Best: <span className="text-white font-bold">{highScore}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startGame}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Run</span>
            </button>
          </div>
        </div>

        {/* Canvas container */}
        <div
          ref={containerRef}
          onClick={triggerJump}
          className="relative w-full rounded-xl overflow-hidden border border-slate-800 cursor-pointer select-none touch-none active:brightness-105 transition-all"
        >
          <canvas ref={canvasRef} className="block w-full h-[180px]" />
        </div>

        {/* Mobile-friendly large Jump Control Button */}
        <button
          type="button"
          onClick={triggerJump}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-md shadow-rose-950/30 active:scale-[0.97] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider select-none"
        >
          <Zap className="w-4 h-4" />
          <span>TAP / CLICK HERE TO JUMP</span>
        </button>
      </div>
    </div>
  );
};
