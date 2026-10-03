import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TOURS, markSeen } from "../lib/tours";
import { setState, useStore } from "../state/store";

interface Box { x: number; y: number; w: number; h: number }
const PAD = 8, TIP_W = 340;

/** Spotlight walkthrough: dims the screen, cuts out the element a step is about, and explains it. */
export function Tour() {
  const tour = useStore((s) => s.tour);
  const screen = useStore((s) => s.screen);
  const [box, setBox] = useState<Box | null>(null);
  const [tipH, setTipH] = useState(160);
  const tipRef = useRef<HTMLDivElement>(null);
  const def = tour ? TOURS[tour.id] : null;
  const step = def?.steps[tour!.i];

  const close = () => { if (tour) markSeen(tour.id); setState({ tour: null }); };
  const go = (d: number) => {
    if (!tour || !def) return;
    const i = tour.i + d;
    if (i < 0) return;
    if (i >= def.steps.length) { close(); return; }
    setState({ tour: { ...tour, i } });
  };

  // a tour belongs to one screen: leaving it ends the tour
  const tid = tour?.id;
  useEffect(() => {
    if (tid && tid !== "welcome" && tid !== screen) { markSeen(tid); setState({ tour: null }); }
  }, [screen, tid]);

  useLayoutEffect(() => {
    if (!step) return;
    const measure = () => {
      const el = step.selector ? document.querySelector(step.selector) as HTMLElement | null : null;
      if (!el) { setBox(null); return; }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { setBox(null); return; }
      setBox({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
    };
    const el = step.selector ? document.querySelector(step.selector) as HTMLElement | null : null;
    el?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    measure();
    const id = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => { window.clearInterval(id); window.removeEventListener("resize", measure); };
  }, [step]);

  useLayoutEffect(() => { if (tipRef.current) setTipH(tipRef.current.offsetHeight); }, [step, box]);

  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" || e.key === "Enter") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!tour || !def || !step) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = vw / 2 - TIP_W / 2, top = vh / 2 - tipH / 2;
  if (box) {
    const place = step.place ?? "bottom";
    if (place === "bottom") { left = box.x + box.w / 2 - TIP_W / 2; top = box.y + box.h + 14; }
    else if (place === "top") { left = box.x + box.w / 2 - TIP_W / 2; top = box.y - tipH - 14; }
    else if (place === "right") { left = box.x + box.w + 14; top = box.y + 12; }
    else { left = box.x - TIP_W - 14; top = box.y + 12; }
    if (top + tipH > vh - 12) top = Math.max(12, box.y - tipH - 14);   // not enough room below → above
    if (top < 12) top = Math.min(vh - tipH - 12, box.y + box.h + 14);
    left = Math.max(12, Math.min(vw - TIP_W - 12, left));
    top = Math.max(12, Math.min(vh - tipH - 12, top));
  }
  const last = tour.i === def.steps.length - 1;
  return (
    <div className="tour" role="dialog" aria-label="Подсказки">
      <div className="tour-block" onClick={close} />
      {box ? <div className="tour-spot" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} /> : <div className="tour-dim" />}
      <div className="tour-tip" ref={tipRef} style={{ left, top, width: TIP_W }}>
        <div className="tour-count">{tour.i + 1} из {def.steps.length}</div>
        <h4>{step.title}</h4>
        <p>{step.text}</p>
        <div className="tour-nav">
          <button className="btn sm" onClick={close}>Пропустить</button>
          <div className="grow" />
          {tour.i > 0 && <button className="btn sm" onClick={() => go(-1)}>Назад</button>}
          <button className="btn sm primary" onClick={() => go(1)}>{last ? "Понятно" : "Далее"}</button>
        </div>
      </div>
    </div>
  );
}
