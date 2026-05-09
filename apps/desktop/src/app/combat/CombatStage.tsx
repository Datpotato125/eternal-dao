import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { COLORS } from '../constants/theme';

export interface CombatStageRef {
  animateAttack: (attacker: 'player' | 'enemy', damage: number) => Promise<void>;
}

interface Props {
  playerName: string;
  enemyName: string;
}

const W = 660;
const H = 240;
const PX = 130;  // player x
const EX = 530;  // enemy x
const FY = 112;  // fighter y

function hex(s: string): number {
  return parseInt(s.replace('#', ''), 16);
}

const CombatStage = forwardRef<CombatStageRef, Props>(({ playerName, enemyName }, ref) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const appRef        = useRef<Application | null>(null);
  const playerOrbRef  = useRef<Container | null>(null);
  const enemyOrbRef   = useRef<Container | null>(null);
  const tickRef       = useRef(0);

  useEffect(() => {
    const app = new Application();
    let active = true;

    app.init({
      width: W, height: H,
      background: hex(COLORS.bg),
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (!active) { app.destroy(true); return; }
      appRef.current = app;
      if (containerRef.current) containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
      buildScene(app);
    });

    return () => {
      active = false;
      appRef.current?.destroy(true);
      appRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildScene(app: Application) {
    // Arena ellipse floor
    const arena = new Graphics();
    arena.ellipse(W / 2, FY + 12, 250, 50);
    arena.stroke({ color: hex(COLORS.border), width: 1, alpha: 0.35 });
    app.stage.addChild(arena);

    // Ambient Qi particles
    const particles = new Container();
    for (let i = 0; i < 38; i++) {
      const p = new Graphics() as Graphics & { _vx: number };
      p.circle(0, 0, Math.random() * 1.6 + 0.4);
      p.fill({ color: hex(COLORS.gold), alpha: 0.12 });
      p.x = Math.random() * W;
      p.y = Math.random() * H;
      p._vx = (Math.random() - 0.5) * 0.25;
      particles.addChild(p);
    }
    app.stage.addChild(particles);

    // Fighter orbs
    const pOrb = buildOrb(hex(COLORS.jade), hex(COLORS.jadeLight));
    pOrb.x = PX; pOrb.y = FY;
    app.stage.addChild(pOrb);
    playerOrbRef.current = pOrb;

    const eOrb = buildOrb(hex(COLORS.red), hex(COLORS.redLight));
    eOrb.x = EX; eOrb.y = FY;
    app.stage.addChild(eOrb);
    enemyOrbRef.current = eOrb;

    // Name labels
    for (const [name, x] of [[playerName, PX], [enemyName, EX]] as [string, number][]) {
      const lbl = new Text({ text: name, style: { fill: COLORS.textMuted, fontSize: 11 } });
      lbl.anchor.set(0.5, 0);
      lbl.x = x; lbl.y = FY + 48;
      app.stage.addChild(lbl);
    }

    // VS
    const vs = new Text({ text: 'VS', style: { fill: COLORS.gold, fontSize: 17, fontWeight: '900', letterSpacing: 4 } });
    vs.anchor.set(0.5);
    vs.x = W / 2; vs.y = FY;
    app.stage.addChild(vs);

    // Ticker: pulse auras + drift particles
    app.ticker.add(() => {
      tickRef.current++;
      const t = tickRef.current;
      const pulse = 1 + Math.sin(t * 0.048) * 0.1;

      // Pulse outer aura (first child of each orb container)
      if (playerOrbRef.current?.children[0]) playerOrbRef.current.children[0].scale.set(pulse);
      if (enemyOrbRef.current?.children[0])  enemyOrbRef.current.children[0].scale.set(pulse);

      // Drift particles
      particles.children.forEach((c: unknown) => {
        const p = c as Graphics & { _vx: number };
        p.y -= 0.22;
        p.x += p._vx;
        p.alpha = 0.04 + Math.abs(Math.sin(t * 0.018 + p.x * 0.05)) * 0.1;
        if (p.y < 0)    p.y = H;
        if (p.x < 0)    p.x = W;
        if (p.x > W)    p.x = 0;
      });
    });
  }

  function buildOrb(color: number, light: number): Container {
    const c = new Container();

    // 0: outer aura (pulsed by ticker)
    const aura = new Graphics();
    aura.circle(0, 0, 46);
    aura.fill({ color, alpha: 0.11 });
    c.addChild(aura);

    // 1: ring
    const ring = new Graphics();
    ring.circle(0, 0, 34);
    ring.stroke({ color, width: 2, alpha: 0.5 });
    c.addChild(ring);

    // 2: inner glow
    const glow = new Graphics();
    glow.circle(0, 0, 25);
    glow.fill({ color, alpha: 0.32 });
    c.addChild(glow);

    // 3: core
    const core = new Graphics();
    core.circle(0, 0, 17);
    core.fill({ color: light, alpha: 0.95 });
    c.addChild(core);

    // 4: symbol
    const sym = new Text({ text: '☯', style: { fill: '#ffffff', fontSize: 13 } });
    sym.anchor.set(0.5);
    sym.alpha = 0.75;
    c.addChild(sym);

    return c;
  }

  useImperativeHandle(ref, () => ({
    animateAttack: (attacker, damage) => new Promise<void>((resolve) => {
      const app = appRef.current;
      if (!app || damage <= 0) { resolve(); return; }

      const fromX  = attacker === 'player' ? PX : EX;
      const toX    = attacker === 'player' ? EX : PX;
      const pColor = attacker === 'player' ? hex(COLORS.jade) : hex(COLORS.red);
      const tColor = attacker === 'player' ? COLORS.jadeLight : COLORS.redLight;
      const target = attacker === 'player' ? enemyOrbRef.current : playerOrbRef.current;

      // Projectile
      const proj = new Graphics();
      proj.circle(0, 0, 7);
      proj.fill({ color: pColor, alpha: 0.92 });
      proj.x = fromX; proj.y = FY;
      app.stage.addChild(proj);

      let frame = 0;
      const TRAVEL = 16;

      const onTravel = () => {
        if (!appRef.current) { resolve(); return; }
        frame++;
        const progress = frame / TRAVEL;
        proj.x = fromX + (toX - fromX) * progress;
        proj.y = FY - Math.sin(progress * Math.PI) * 20; // arc
        proj.scale.set(1 - progress * 0.35);

        if (frame < TRAVEL) return;
        app.ticker.remove(onTravel);
        app.stage.removeChild(proj);
        proj.destroy();

        // Impact flash
        const flash = new Graphics();
        flash.circle(0, 0, 28);
        flash.fill({ color: 0xffffff, alpha: 0.6 });
        flash.x = toX; flash.y = FY;
        app.stage.addChild(flash);

        let ff = 0;
        const onFlash = () => {
          ff++;
          flash.alpha = Math.max(0, 0.6 - ff * 0.09);
          if (ff < 7) return;
          app.ticker.remove(onFlash);
          app.stage.removeChild(flash);
          flash.destroy();
        };
        app.ticker.add(onFlash);

        // Shake target orb
        if (target) {
          const origX = target.x;
          let sf = 0;
          const onShake = () => {
            sf++;
            target.x = origX + Math.sin(sf * 2.5) * (6 - sf);
            if (sf >= 6) { app.ticker.remove(onShake); target.x = origX; }
          };
          app.ticker.add(onShake);
        }

        // Floating damage number
        const dmg = new Text({
          text: `-${damage}`,
          style: { fill: tColor, fontSize: 20, fontWeight: '900' },
        });
        dmg.anchor.set(0.5);
        dmg.x = toX + (Math.random() - 0.5) * 24;
        dmg.y = FY - 28;
        app.stage.addChild(dmg);

        let df = 0;
        const onFloat = () => {
          if (!appRef.current) { resolve(); return; }
          df++;
          dmg.y  -= 1.6;
          dmg.alpha = Math.max(0, 1 - df / 26);
          if (df < 26) return;
          app.ticker.remove(onFloat);
          app.stage.removeChild(dmg);
          dmg.destroy();
          resolve();
        };
        app.ticker.add(onFloat);
      };

      app.ticker.add(onTravel);
    }),
  }), []);

  return (
    <div
      ref={containerRef}
      style={{ width: W, height: H, borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}
    />
  );
});

CombatStage.displayName = 'CombatStage';
export default CombatStage;
