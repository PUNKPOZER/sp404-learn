import { startCourse } from "../state/actions";
import { useStore } from "../state/store";

const GENRES = ["FOOTWORK", "JUNGLE", "BREAKBEAT", "HOUSE", "HIP-HOP", "TECHNO"];
const LESSONS = ["Драм-кит", "Бочка", "Клэп", "Снейр", "Закрытые хэты", "Открытые хэты", "Перкуссия", "Синкопа", "Призрачные удары", "Деление шага",
  "Бас", "Вокальные нарезки", "Вариация паттерна", "Филл", "Брейк", "Аранжировка", "Эффекты", "Финальный трек"];

export function Learn() {
  const course = useStore((s) => s.course);
  return (
    <div className="screen">
      <header className="screen-head"><h1>Обучение</h1></header>
      <div className="genres">{GENRES.map((g) => <button key={g} className={`genre ${g === "FOOTWORK" ? "ready" : ""}`} disabled={g !== "FOOTWORK"} onClick={startCourse}>
        {g}<small>{g === "FOOTWORK" ? "готов" : "скоро"}</small></button>)}</div>
      <section className="panel">
        <h2>FOOTWORK · 160 BPM · авторские учебные паттерны</h2>
        <ol className="lessons">{LESSONS.map((l, i) => <li key={l}><span className="mono">{String(i + 1).padStart(2, "0")}</span> {course?.lessons[i]?.summary ?? l}</li>)}</ol>
        <button className="btn acid big" onClick={startCourse}>Начать курс ▸</button>
      </section>
    </div>
  );
}
