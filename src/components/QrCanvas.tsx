import { useEffect, useRef } from "react";
import type { Scene } from "../lib/render";
import { BRAND_ACCENT, accentFromLogo } from "../lib/accent";

/**
 * Живое превью кода: canvas-рендер сцены с эффектом курсора.
 *
 * Механика повторяет Aave Glass: по коду ездит «краска» — мягкое пятно,
 * которое уменьшает радиус модуля до нуля в центре и оставляет шлейф
 * цвета акцента. Цвет берётся из логотипа, без логотипа — фирменный.
 * По клику на логотип код получает волну: она расходится от центра,
 * приподнимает и гасит точки на гребне, а сам логотип проворачивается.
 */

/** Сколько живёт свечение под курсором, мс. */
const GLOW_DECAY = 120;
/** Сколько живёт цветной шлейф, мс. */
const COLOR_DECAY = 1500;
/** Радиус влияния курсора как доля стороны кода. */
const INFLUENCE = 0.085;
/** Без логотипа пятно меньше: с лого дырку «съедает» плашка, и масштаб кажется иным. */
const INFLUENCE_NO_LOGO = 0.06;
/** Насколько сжимается маркер под курсором. */
const EYE_SCALE = 0.92;
/** Максимальный наклон к курсору, градусы. */
const TILT_MAX = 4.5;

/** Волна от логотипа: длительность и размах. */
const WAVE_MS = 1640;
/** Пружина проворота логотипа: жёсткость, демпфирование, масса. */
const SPRING_STIFFNESS = 10;
const SPRING_DAMPING = 5.2;
const SPRING_MASS = 1;
/** Сколько цвет маркеров держится после прохода волны, мс. */
const EYE_COLOR_HOLD = 380;
/** За сколько этот цвет потом гаснет, мс. */
const EYE_COLOR_FADE = 650;
/** Насколько логотип сжимается под курсором. */
const LOGO_HOVER_SCALE = 0.955;

type Module = { x: number; y: number; path: Path2D };
type Eye = { cx: number; cy: number; path: Path2D; device: Path2D };

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const c = hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const to = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${to(r1 + (r2 - r1) * t)}${to(g1 + (g2 - g1) * t)}${to(b1 + (b2 - b1) * t)}`;
}

export default function QrCanvas({ scene, label }: { scene: Scene; label?: string }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // при reduced motion не наклоняем код и не крутим логотип
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // ---------- сцена ----------
    const modules: Module[] = scene.modules.map((m) => ({ x: m.x, y: m.y, path: new Path2D(m.d) }));
    const eyes: Eye[] = scene.eyes.map((e) => ({
      cx: e.cx,
      cy: e.cy,
      path: new Path2D(e.d),
      device: new Path2D(),
    }));
    const glyphs = (scene.caption?.layout?.glyphs ?? []).map((g) => ({
      x: g.x,
      path: new Path2D(g.d),
    }));
    const caption = scene.caption;

    // центр кода — от него расходится волна и крутится логотип
    const centerX = scene.total / 2;
    const centerY = scene.total / 2;

    // ---------- слои «краски» ----------
    const paintW = 200;
    const paintH = Math.max(24, Math.round((paintW * scene.vbH) / scene.total));
    const makeLayer = () => {
      const c = document.createElement("canvas");
      c.width = paintW;
      c.height = paintH;
      return c;
    };
    const glow = makeLayer();
    const tint = makeLayer();
    const glowCtx = glow.getContext("2d", { willReadFrequently: true });
    const tintCtx = tint.getContext("2d", { willReadFrequently: true });
    if (!glowCtx || !tintCtx) return;

    const blob = document.createElement("canvas");
    blob.width = blob.height = 128;
    const blobCtx = blob.getContext("2d");
    if (blobCtx) {
      const g = blobCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,0.72)");
      g.addColorStop(0.72, "rgba(255,255,255,0.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      blobCtx.fillStyle = g;
      blobCtx.fillRect(0, 0, 128, 128);
    }

    // ---------- состояние ----------
    let accent = BRAND_ACCENT;
    let alive = true;
    accentFromLogo(scene.logo?.dataUrl ?? null).then((value) => {
      if (!alive) return;
      accent = value;
      start();
    });

    const logoImage = scene.logo ? new Image() : null;
    let logoReady = false;
    if (logoImage && scene.logo) {
      logoImage.onload = () => {
        logoReady = true;
        start();
      };
      logoImage.src = scene.logo.dataUrl;
    }

    let cssW = 0;
    let cssH = 0;
    let k = 1;
    let dpr = 1;
    let allModules: Path2D | null = null;
    let logoPlate: Path2D | null = null;
    let gradient: CanvasGradient | string = scene.fill.color1;

    let inside = false;
    let px = 0;
    let py = 0;
    let lastPaint = -1e9;
    let waveAt = -1e9;
    // пружина проворота: угол в радианах и скорость
    let flipAngle = 0;
    let flipVel = 0;
    let flipTarget = 0;
    const eyeScale = [1, 1, 1];
    const eyeTint = [0, 0, 0];
    // цвет маркеров от волны живёт дольше самой волны: сначала держится,
    // затем плавно гаснет
    const eyeWave = [0, 0, 0];
    const eyePeakAt = [-1e9, -1e9, -1e9];
    let frameWave: ReturnType<typeof waveAt0> | null = null;
    let logoScale = 1;
    let logoHover = false;
    let tiltX = 0;
    let tiltY = 0;
    let raf: number | null = null;
    let last = 0;

    const rgbaCache = new Map<string, string>();
    const accentRgba = (alpha: number) => {
      const key = alpha.toFixed(3);
      let value = rgbaCache.get(key);
      if (!value) {
        value = hexToRgba(accent, alpha);
        rgbaCache.set(key, value);
      }
      return value;
    };

    // ---------- размеры и градиенты ----------
    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      cssW = rect.width;
      cssH = (rect.width * scene.vbH) / scene.total;
      k = cssW / scene.total;

      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = "100%";
      canvas.style.height = `${cssH}px`;

      const matrix = new DOMMatrix([k, 0, 0, k, 0, 0]);
      allModules = new Path2D();
      for (const m of modules) allModules.addPath(m.path, matrix);
      for (const e of eyes) {
        e.device = new Path2D();
        e.device.addPath(e.path, matrix);
      }
      if (scene.logo) {
        logoPlate = new Path2D();
        logoPlate.addPath(new Path2D(scene.logo.plateD), matrix);
      }

      if (scene.fill.mode === "solid") {
        gradient = scene.fill.color1;
      } else if (scene.fill.kind === "radial") {
        const g = ctx.createRadialGradient(
          (scene.total / 2) * k,
          (scene.total / 2) * k,
          0,
          (scene.total / 2) * k,
          (scene.total / 2) * k,
          0.75 * scene.total * k
        );
        g.addColorStop(0, scene.fill.color1);
        g.addColorStop(1, scene.fill.color2);
        gradient = g;
      } else {
        const coords: Record<string, [number, number, number, number]> = {
          vertical: [0, 0, 0, 1],
          horizontal: [0, 0, 1, 0],
          diagonal: [0, 0, 1, 1],
          diagonalRev: [1, 0, 0, 1],
        };
        const [x1, y1, x2, y2] = coords[scene.fill.kind] ?? coords.diagonal;
        const g = ctx.createLinearGradient(
          x1 * scene.total * k,
          y1 * scene.total * k,
          x2 * scene.total * k,
          y2 * scene.total * k
        );
        g.addColorStop(0, scene.fill.color1);
        g.addColorStop(1, scene.fill.color2);
        gradient = g;
      }
      draw(performance.now());
    };

    /** Цвет градиента в точке — для «плоской» отрисовки точки под курсором. */
    const gradientAt = (ux: number, uy: number): string => {
      if (scene.fill.mode === "solid") return scene.fill.color1;
      const u = ux / scene.total;
      const v = uy / scene.total;
      let t = 0;
      if (scene.fill.kind === "radial") {
        const dx = u - 0.5;
        const dy = v - 0.5;
        t = Math.min(1, Math.hypot(dx, dy) / 0.75);
      } else {
        const coords: Record<string, [number, number, number, number]> = {
          vertical: [0, 0, 0, 1],
          horizontal: [0, 0, 1, 0],
          diagonal: [0, 0, 1, 1],
          diagonalRev: [1, 0, 0, 1],
        };
        const [x1, y1, x2, y2] = coords[scene.fill.kind] ?? coords.diagonal;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = dx * dx + dy * dy || 1;
        t = Math.max(0, Math.min(1, ((u - x1) * dx + (v - y1) * dy) / len));
      }
      return mixHex(scene.fill.color1, scene.fill.color2, t);
    };

    // ---------- волна ----------
    type Wave = { active: boolean; radius: number; band: number; amp: number; fade: number };
    const waveAt0 = (now: number): Wave => {
      const t = (now - waveAt) / WAVE_MS;
      if (t < 0 || t >= 1) return { active: false, radius: 0, band: 1, amp: 0, fade: 0 };
      return {
        active: true,
        // ровная скорость: волна проходит код за всё время и доходит до углов
        radius: scene.total * (0.16 + 0.66 * t),
        band: scene.total * (0.055 + 0.045 * t),
        amp: scene.total * 0.078 * (1 - t) * Math.min(1, t * 7),
        fade: Math.pow(1 - t, 1.4),
      };
    };

    // ---------- отрисовка ----------
    const draw = (now: number) => {
      if (!cssW) return;
      const glowData = glowCtx.getImageData(0, 0, paintW, paintH).data;
      const tintData = tintCtx.getImageData(0, 0, paintW, paintH).data;
      const sample = (data: Uint8ClampedArray, ux: number, uy: number) => {
        const x = Math.floor((ux / scene.total) * paintW);
        const y = Math.floor((uy / scene.vbH) * paintH);
        if (x < 0 || y < 0 || x >= paintW || y >= paintH) return 0;
        return data[(y * paintW + x) * 4 + 3] / 255;
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      if (!scene.bg.transparent) {
        ctx.fillStyle = scene.bg.color;
        ctx.fillRect(0, 0, cssW, cssH);
      }

      const wave = frameWave ?? waveAt0(now);

      // модули: пока нет ни краски, ни волны — один путь с градиентом,
      // иначе каждая точка считается отдельно
      let touched = false;
      const scales = new Float32Array(modules.length);
      const tints = new Float32Array(modules.length);
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        const g = sample(glowData, m.x, m.y);
        const c = sample(tintData, m.x, m.y);
        scales[i] = Math.max(0, 1 - Math.pow(g, 1.6));
        tints[i] = c;
        if (g > 0.005) touched = true;
      }

      if (!touched && !wave.active && allModules) {
        ctx.fillStyle = gradient;
        ctx.fill(allModules);
      } else {
        for (let i = 0; i < modules.length; i++) {
          const m = modules[i];
          let s = scales[i];
          let tintValue = tints[i];
          let ox = 0;
          let oy = 0;

          if (wave.active) {
            const dx = m.x - centerX;
            const dy = m.y - centerY;
            const dist = Math.hypot(dx, dy) || 1;
            const phase = (dist - wave.radius) / wave.band;
            const w = Math.exp(-phase * phase);
            // за гребнем точки слегка раздуваются — это читается как толщина стекла
            const bulge = Math.exp(-(((phase - 0.75) / 0.55) ** 2));
            if (w > 0.01 || bulge > 0.01) {
              s *= (1 - 0.8 * w * wave.fade) * (1 + 0.38 * bulge * wave.fade);
              tintValue = Math.max(tintValue, Math.max(w, bulge * 0.7) * wave.fade);
              ox = (dx / dist) * wave.amp * (w - bulge * 0.35) * wave.fade;
              oy = (dy / dist) * wave.amp * (w - bulge * 0.35) * wave.fade;
            }
          }

          if (s < 0.02) continue;
          ctx.setTransform(
            dpr * k * s,
            0,
            0,
            dpr * k * s,
            dpr * k * (m.x + ox) * (1 - s),
            dpr * k * (m.y + oy) * (1 - s)
          );
          const base = gradientAt(m.x, m.y);
          ctx.fillStyle =
            tintValue > 0.02 ? mixHex(base, accent, Math.min(1, tintValue)) : base;
          ctx.fill(m.path);
        }
      }

      // маркеры: сжимаются под курсором, перекрашиваются и ловят волну
      for (let i = 0; i < eyes.length; i++) {
        const eye = eyes[i];
        let s = eyeScale[i];
        let tintValue = Math.max(eyeTint[i], eyeWave[i]);
        let ox = 0;
        let oy = 0;

        if (wave.active) {
          const dx = eye.cx - centerX;
          const dy = eye.cy - centerY;
          const dist = Math.hypot(dx, dy) || 1;
          const phase = (dist - wave.radius) / wave.band;
          const w = Math.exp(-phase * phase);
          if (w > 0.01) {
            s *= 1 - 0.12 * w * wave.fade;
            ox = (dx / dist) * wave.amp * w;
            oy = (dy / dist) * wave.amp * w;
          }
        }

        ctx.setTransform(
          dpr * s,
          0,
          0,
          dpr * s,
          dpr * (eye.cx * k + ox * k) * (1 - s),
          dpr * (eye.cy * k + oy * k) * (1 - s)
        );
        // маркер загорается чистым цветом логотипа, а не примесью к тёмному
        const glow = Math.min(1, tintValue * 2);
        ctx.fillStyle = glow > 0.02 ? mixHex(gradientAt(eye.cx, eye.cy), accent, glow) : gradient;
        ctx.fill(eye.device);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // логотип: сжимается под курсором, по клику проворачивается вокруг оси Y
      if (scene.logo && logoPlate) {
        const lg = scene.logo;
        const angle = reduceMotion ? 0 : flipAngle;
        // покачивание и всплытие — от угловой скорости: на разгоне сильнее
        const wobble = reduceMotion
          ? 0
          : Math.max(-0.16, Math.min(0.16, flipVel * 0.012));
        const pop = reduceMotion ? 1 : 1 + Math.min(0.09, Math.abs(flipVel) * 0.005);
        const sx = logoScale * Math.cos(angle) * pop;
        const sy = logoScale * pop;
        const cxPx = centerX * k;
        const cyPx = centerY * k;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(cxPx, cyPx);
        ctx.rotate(wobble);
        ctx.scale(sx, sy);
        ctx.translate(-cxPx, -cyPx);
        ctx.fillStyle = scene.bg.transparent ? "#ffffff" : scene.bg.color;
        ctx.fill(logoPlate);

        if (logoImage && logoReady) {
          ctx.save();
          ctx.clip(logoPlate);
          const iw = logoImage.naturalWidth || 1;
          const ih = logoImage.naturalHeight || 1;
          const scale = Math.min(lg.imgSize / iw, lg.imgSize / ih);
          const dw = iw * scale;
          const dh = ih * scale;
          ctx.drawImage(
            logoImage,
            (lg.imgX + (lg.imgSize - dw) / 2) * k,
            (lg.imgY + (lg.imgSize - dh) / 2) * k,
            dw * k,
            dh * k
          );
          ctx.restore();
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // подпись
      if (caption) {
        ctx.fillStyle = caption.color;
        if (caption.layout) {
          for (const glyph of glyphs) {
            ctx.save();
            ctx.translate(
              (caption.layout.startX + glyph.x * caption.layout.scale) * k,
              caption.layout.baseline * k
            );
            ctx.scale(caption.layout.scale * k, caption.layout.scale * k);
            ctx.fill(glyph.path);
            ctx.restore();
          }
        } else {
          ctx.font = `500 ${caption.fontUnits * k}px ${caption.font}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(caption.text, (scene.total / 2) * k, caption.baseline * k);
        }
      }
    };

    // ---------- «краска» под курсором ----------
    const paint = (dt: number, now: number) => {
      const fade = (c: CanvasRenderingContext2D, tau: number) => {
        c.globalCompositeOperation = "destination-out";
        c.fillStyle = `rgba(0,0,0,${1 - Math.exp(-dt / tau)})`;
        c.fillRect(0, 0, paintW, paintH);
        c.globalCompositeOperation = "source-over";
      };
      fade(glowCtx, GLOW_DECAY);
      fade(tintCtx, COLOR_DECAY);

      if (!inside) return;

      lastPaint = now;
      const unit = paintW / scene.total;
      const influence = scene.logo ? INFLUENCE : INFLUENCE_NO_LOGO;
      const radius = influence * scene.total * unit;
      const sx = (px / scene.total) * paintW;
      const sy = (py / scene.vbH) * paintH;

      glowCtx.globalCompositeOperation = "lighter";
      glowCtx.drawImage(blob, sx - radius, sy - radius, radius * 2, radius * 2);
      glowCtx.globalCompositeOperation = "source-over";

      const tintRadius = radius * 1.85;
      const g = tintCtx.createRadialGradient(sx, sy, 0, sx, sy, tintRadius);
      g.addColorStop(0, accentRgba(1));
      g.addColorStop(0.35, accentRgba(0.85));
      g.addColorStop(0.7, accentRgba(0.35));
      g.addColorStop(1, accentRgba(0));
      tintCtx.globalCompositeOperation = "lighter";
      tintCtx.fillStyle = g;
      tintCtx.beginPath();
      tintCtx.arc(sx, sy, tintRadius, 0, Math.PI * 2);
      tintCtx.fill();
      tintCtx.globalCompositeOperation = "source-over";
    };

    // ---------- кадр ----------
    const tick = (now: number) => {
      raf = null;
      const dt = Math.min(48, last ? now - last : 16);
      last = now;

      paint(dt, now);

      const smooth = 1 - Math.exp(-dt / 90);
      let moving = false;

      // маркеры
      const hoveredEye = inside
        ? eyes.findIndex((e) => Math.abs(px - e.cx) < 3.6 && Math.abs(py - e.cy) < 3.6)
        : -1;
      for (let i = 0; i < eyes.length; i++) {
        const target = hoveredEye === i ? EYE_SCALE : 1;
        const next = eyeScale[i] + (target - eyeScale[i]) * smooth;
        if (Math.abs(next - eyeScale[i]) > 0.0005) moving = true;
        eyeScale[i] = next;

        const tintTarget = hoveredEye === i ? 1 : 0;
        const nextTint = eyeTint[i] + (tintTarget - eyeTint[i]) * smooth;
        if (Math.abs(nextTint - eyeTint[i]) > 0.001) moving = true;
        eyeTint[i] = nextTint;
      }

      // пружина проворота: считаем маленькими шагами, чтобы не разошлась
      if (!reduceMotion && (Math.abs(flipAngle - flipTarget) > 1e-4 || Math.abs(flipVel) > 1e-3)) {
        const step = Math.min(dt, 48) / 1000;
        const parts = Math.max(1, Math.ceil(step / 0.006));
        const h = step / parts;
        for (let i = 0; i < parts; i++) {
          const accel =
            (-SPRING_STIFFNESS * (flipAngle - flipTarget) - SPRING_DAMPING * flipVel) / SPRING_MASS;
          flipVel += accel * h;
          flipAngle += flipVel * h;
        }
        moving = true;
        if (Math.abs(flipAngle - flipTarget) < 0.002 && Math.abs(flipVel) < 0.02) {
          flipAngle = 0;
          flipTarget = 0;
          flipVel = 0;
        }
      }

      // цвет маркеров от волны: подхватываем гребень и держим после него
      const waveNow = waveAt0(now);
      frameWave = waveNow;
      for (let i = 0; i < eyes.length; i++) {
        const eye = eyes[i];
        let crest = 0;
        if (waveNow.active) {
          const dx = eye.cx - centerX;
          const dy = eye.cy - centerY;
          const dist = Math.hypot(dx, dy) || 1;
          const phase = (dist - waveNow.radius) / waveNow.band;
          crest = Math.exp(-phase * phase) * waveNow.fade;
        }
        if (crest >= eyeWave[i]) {
          eyeWave[i] = crest;
          eyePeakAt[i] = now;
        } else if (now - eyePeakAt[i] > EYE_COLOR_HOLD) {
          eyeWave[i] = Math.max(crest, eyeWave[i] - dt / EYE_COLOR_FADE);
        }
      }

      // логотип под курсором
      if (scene.logo) {
        const half = (scene.logo.imgSize + scene.logo.imgSize * 0.3) / 2;
        logoHover =
          inside &&
          Math.abs(px - centerX) <= half &&
          Math.abs(py - centerY) <= half;
        canvas.style.cursor = logoHover ? "pointer" : "default";
        const targetLogo = logoHover && !reduceMotion ? LOGO_HOVER_SCALE : 1;
        const nextLogo = logoScale + (targetLogo - logoScale) * smooth;
        if (Math.abs(nextLogo - logoScale) > 0.0003) moving = true;
        logoScale = nextLogo;
      }

      // наклон
      targetTiltY = inside && !reduceMotion ? -((px / scene.total) - 0.5) * 2 * TILT_MAX : 0;
      targetTiltX = inside && !reduceMotion ? ((py / scene.vbH) - 0.5) * 2 * TILT_MAX : 0;
      const ts = 1 - Math.exp(-dt / 120);
      tiltY += (targetTiltY - tiltY) * ts;
      tiltX += (targetTiltX - tiltX) * ts;
      if (Math.abs(targetTiltY - tiltY) > 0.01 || Math.abs(targetTiltX - tiltX) > 0.01) {
        moving = true;
      }
      canvas.style.transform = `perspective(900px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(
        2
      )}deg)`;

      draw(now);

      const fresh = now - lastPaint < 4200;
      const waveAlive = now - waveAt < WAVE_MS;
      const eyesFading = eyeWave.some((v) => v > 0.01);
      if (inside || fresh || moving || waveAlive || eyesFading) {
        raf = requestAnimationFrame(tick);
      } else {
        last = 0;
      }
    };

    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };

    // ---------- указатель ----------
    const toUnits = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * scene.total,
        y: ((event.clientY - rect.top) / rect.height) * scene.vbH,
      };
    };

    const onEnter = (event: PointerEvent) => {
      inside = true;
      const p = toUnits(event);
      px = p.x;
      py = p.y;
      start();
    };
    const onMove = (event: PointerEvent) => {
      inside = true;
      const p = toUnits(event);
      px = p.x;
      py = p.y;
      start();
    };
    const onLeave = () => {
      inside = false;
      start();
    };
    const onDown = (event: PointerEvent) => {
      const p = toUnits(event);
      px = p.x;
      py = p.y;
      // нажимать можно только по самому логотипу
      if (!scene.logo) return;
      const half = (scene.logo.imgSize + scene.logo.imgSize * 0.3) / 2;
      if (Math.abs(p.x - centerX) > half || Math.abs(p.y - centerY) > half) return;
      waveAt = performance.now();
      // каждый клик добавляет ещё два оборота — пружина их докрутит
      if (!reduceMotion) flipTarget += Math.PI * 4;
      start();
    };

    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);

    let targetTiltX = 0;
    let targetTiltY = 0;

    const observer = new ResizeObserver(layout);
    observer.observe(wrap);
    layout();
    start();

    return () => {
      alive = false;
      observer.disconnect();
      canvas.removeEventListener("pointerenter", onEnter);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scene]);

  return (
    <div ref={wrapRef} className="qr-canvas">
      <canvas ref={canvasRef} className="qr-canvas__surface" role="img" aria-label={label} />
    </div>
  );
}
