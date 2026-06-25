"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from "motion/react";
import { php0 } from "@/lib/format";

const FRAME_COUNT = 80;
const frameSrc = (i: number) =>
  `/frames/f_${String(i).padStart(3, "0")}.jpg`;

type SlideDef = {
  start: number;
  end: number;
  kicker?: string;
  title: React.ReactNode;
  body?: string;
};

/* One slide — owns its own transforms so hook order stays stable. */
function Slide({
  progress,
  def,
}: {
  progress: MotionValue<number>;
  def: SlideDef;
}) {
  const { start, end } = def;
  const f = 0.06;
  const opacity = useTransform(
    progress,
    [start - f, start, end, end + f],
    [0, 1, 1, 0],
    { clamp: true },
  );
  const y = useTransform(opacity, [0, 1], [26, 0]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
    >
      {def.kicker && (
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-950/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.25em] text-emerald-300 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {def.kicker}
        </div>
      )}
      <h2 className="font-display max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-tight text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.65)] sm:text-6xl lg:text-7xl">
        {def.title}
      </h2>
      {def.body && (
        <p className="mt-6 max-w-xl text-base text-slate-300 sm:text-lg">
          {def.body}
        </p>
      )}
    </motion.div>
  );
}

export default function ScrollVideo({ grandTotal }: { grandTotal: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const lastFrame = useRef(-1);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });
  // light spring: enough to absorb wheel-step granularity, still 1:1 responsive
  const smooth = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 32,
    restDelta: 0.0008,
  });

  // cover-fit draw of frame `idx` to the canvas
  const draw = (idx: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[idx];
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  };

  // size canvas to viewport (DPR-aware) and redraw current frame
  const resize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    draw(lastFrame.current < 0 ? 0 : lastFrame.current);
  };

  // preload all frames
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    let firstDrawn = false;
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = frameSrc(i);
      if (i === 0) {
        img.onload = () => {
          if (firstDrawn) return;
          firstDrawn = true;
          lastFrame.current = 0;
          draw(0);
        };
      }
      imgs.push(img);
    }
    imagesRef.current = imgs;
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // drive frame index from the smoothed scroll progress
  useMotionValueEvent(smooth, "change", (v) => {
    const idx = Math.min(
      FRAME_COUNT - 1,
      Math.max(0, Math.round(v * (FRAME_COUNT - 1))),
    );
    if (idx !== lastFrame.current) {
      lastFrame.current = idx;
      draw(idx);
    }
  });

  const railScaleX = smooth;

  const slides: SlideDef[] = [
    {
      start: 0.0,
      end: 0.16,
      kicker: "KMC Solutions",
      title: (
        <>
          Real floors. Real desks.
          <br />
          <span className="text-gradient-emerald">Real money.</span>
        </>
      ),
      body: "Thousands of reserved seats across every KMC hub.",
    },
    {
      start: 0.24,
      end: 0.42,
      kicker: "The ERP view",
      title: <>Every seat here is marked reserved.</>,
      body: "Billed. Booked. Accounted for — on paper.",
    },
    {
      start: 0.5,
      end: 0.66,
      kicker: "The reality",
      title: (
        <>
          But reserved{" "}
          <span className="font-serif italic font-normal text-rose-300">
            isn&apos;t
          </span>{" "}
          occupied.
        </>
      ),
      body: "Half these desks sit empty inside paid agreements.",
    },
    {
      start: 0.74,
      end: 1.0,
      kicker: "DeskYield",
      title: (
        <>
          We see the empty ones —{" "}
          <span className="text-gradient-emerald">7 days early.</span>
        </>
      ),
      body: `${php0(grandTotal)} recoverable this week alone.`,
    },
  ];

  return (
    <section ref={wrapRef} className="relative h-[460vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        />

        {/* cinematic scrims */}
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-slate-950/70" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "linear-gradient(rgba(52,211,153,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.18) 1px, transparent 1px)",
            backgroundSize: "60px 60px, 60px 60px",
          }}
        />

        <div className="absolute inset-0">
          {slides.map((s, i) => (
            <Slide key={i} progress={smooth} def={s} />
          ))}
        </div>

        {/* scrub progress rail */}
        <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-3">
          <div className="h-px w-32 overflow-hidden bg-white/15">
            <motion.div
              className="h-full origin-left bg-emerald-400"
              style={{ scaleX: railScaleX }}
            />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
            scroll
          </span>
        </div>
      </div>
    </section>
  );
}
