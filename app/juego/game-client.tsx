"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BankQuestion, extraQuestions } from "../question-bank";

type Question = {
  id?: string;
  tier?: 1 | 2 | 3 | 4 | 5;
  category: string;
  source: string;
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
};

const rewards = [
  "100", "200", "300", "500", "1.000", "2.000", "4.000", "8.000",
  "16.000", "32.000", "64.000", "125.000", "250.000", "500.000", "1.000.000",
];

const questions: Question[] = [
  {
    category: "Ética empresarial", source: "Programa de integridad",
    question: "Una directora debe decidir sobre la contratación de una empresa en la que trabaja su hermano. ¿Cuál es la actuación más adecuada?",
    answers: ["Participar si el precio es competitivo", "Declarar el conflicto y apartarse de la decisión", "Informarlo después de contratar", "Pedir al hermano que no firme el contrato"],
    correct: 1, explanation: "La transparencia no elimina por sí sola el conflicto: debe declararse oportunamente y gestionarse mediante recusación o controles equivalentes."
  },
  {
    category: "Canales de denuncia", source: "Buenas prácticas de compliance",
    question: "¿Qué característica protege mejor la efectividad de un canal de denuncias?",
    answers: ["Exigir siempre identificación", "Limitarlo a empleados", "Prohibir represalias y permitir confidencialidad", "Enviar cada denuncia al jefe directo"],
    correct: 2, explanation: "La confidencialidad, la independencia y la protección frente a represalias son esenciales para generar confianza en el canal."
  },
  {
    category: "Regalos e invitaciones", source: "Controles anticorrupción",
    question: "Durante una licitación, un proveedor ofrece un viaje de cortesía al responsable de compras. ¿Cuál es el principal riesgo?",
    answers: ["Que el viaje no sea deducible", "Que influya o parezca influir indebidamente en la decisión", "Que el proveedor cambie de aerolínea", "Que el empleado viaje fuera de horario"],
    correct: 1, explanation: "La apariencia de influencia indebida durante una decisión comercial sensible ya representa un riesgo de integridad."
  },
  {
    category: "Protección de datos", source: "Principios internacionales de privacidad",
    question: "¿Qué principio exige recolectar únicamente los datos personales necesarios para una finalidad definida?",
    answers: ["Portabilidad", "Minimización", "Disponibilidad", "Reciprocidad"],
    correct: 1, explanation: "La minimización limita la recolección al volumen y tipo de datos estrictamente necesarios para la finalidad informada."
  },
  {
    category: "Debida diligencia", source: "Gestión de terceros",
    question: "Un intermediario sin experiencia solicita una comisión extraordinaria y pagos en una cuenta de otro país. ¿Qué procede primero?",
    answers: ["Pagar para no perder el negocio", "Dividir el pago", "Suspender y aplicar debida diligencia reforzada", "Solicitar una factura más general"],
    correct: 2, explanation: "La combinación de comisión atípica, falta de capacidad y pago a otra jurisdicción exige detener el proceso y profundizar la revisión."
  },
  {
    category: "Seguridad de la información", source: "Controles de acceso",
    question: "¿Qué medida aplica mejor el principio de menor privilegio?",
    answers: ["Compartir una cuenta por equipo", "Dar acceso total temporal", "Asignar solo permisos necesarios para la función", "Cambiar contraseñas una vez al año"],
    correct: 2, explanation: "Cada persona debe acceder únicamente a la información y funciones indispensables para realizar su trabajo."
  },
  {
    category: "Anticorrupción", source: "OCDE — Integridad empresarial",
    question: "Un agente afirma que un pago de facilitación es habitual en el país. ¿Qué factor resulta determinante para autorizarlo?",
    answers: ["La costumbre local", "El monto reducido", "La política aplicable y su legalidad, no la costumbre", "La aprobación verbal del agente"],
    correct: 2, explanation: "Una práctica habitual no convierte un pago impropio en aceptable; deben aplicarse la ley y los controles internos correspondientes."
  },
  {
    category: "LA/FT", source: "GAFI — Enfoque basado en riesgo",
    question: "¿Cuál de estas situaciones exige normalmente medidas reforzadas y no el rechazo automático del cliente?",
    answers: ["Riesgo superior identificado y gestionable", "Documento de identidad falso", "Coincidencia confirmada en lista de sanciones", "Negativa a revelar al beneficiario final"],
    correct: 0, explanation: "El enfoque basado en riesgo exige medidas proporcionales. Un riesgo alto gestionable requiere controles reforzados, no exclusión automática."
  },
  {
    category: "Beneficiario final", source: "GAFI — Recomendaciones 10 y 24",
    question: "Una sociedad es controlada mediante acuerdos de voto por una persona sin participación accionaria relevante. ¿Quién debe considerarse beneficiario final?",
    answers: ["Solo el accionista mayoritario", "La persona que ejerce el control efectivo", "El representante legal en todos los casos", "La entidad financiera receptora"],
    correct: 1, explanation: "El beneficiario final se determina por propiedad o por otros medios de control; el porcentaje accionario no es el único criterio."
  },
  {
    category: "Personas expuestas políticamente", source: "GAFI — Recomendación 12",
    question: "¿Cuál es una medida adicional esencial al iniciar una relación de alto riesgo con una PEP extranjera?",
    answers: ["Eliminar el monitoreo para evitar discriminación", "Obtener aprobación de la alta gerencia", "Aceptar una declaración verbal de fondos", "Tratarla como cliente de bajo riesgo"],
    correct: 1, explanation: "Además de la debida diligencia ordinaria, se requiere aprobación de alta gerencia, origen de patrimonio y fondos, y monitoreo reforzado."
  },
  {
    category: "Casos integrados", source: "GAFI — Recomendación 20",
    question: "Tras analizar una operación, la entidad mantiene una sospecha razonable. ¿Qué acción preserva mejor el sistema preventivo?",
    answers: ["Advertir al cliente antes de reportar", "Esperar prueba del delito subyacente", "Presentar el reporte sin revelar su existencia al cliente", "Cerrar siempre la cuenta antes del reporte"],
    correct: 2, explanation: "El reporte de operación sospechosa no exige probar el delito y debe protegerse la prohibición de revelación al cliente."
  },
  {
    category: "Activos virtuales", source: "GAFI — Recomendaciones 15 y 16",
    question: "En una transferencia de activos virtuales, ¿qué busca principalmente la llamada regla de viaje?",
    answers: ["Fijar el precio del activo", "Transmitir información del originador y beneficiario", "Garantizar anonimato técnico", "Eliminar la debida diligencia del receptor"],
    correct: 1, explanation: "La transparencia de pagos requiere que información relevante del originador y beneficiario acompañe la transferencia."
  },
  {
    category: "Financiación del terrorismo", source: "ONU — Resolución 2462 / GAFI R.5",
    question: "¿Qué diferencia clave puede existir entre los fondos del terrorismo y el producto del lavado de activos?",
    answers: ["Los fondos terroristas siempre son criptomonedas", "Los fondos terroristas pueden provenir de fuentes lícitas", "El lavado solo usa efectivo", "La financiación del terrorismo no requiere movimiento de fondos"],
    correct: 1, explanation: "La financiación del terrorismo puede utilizar recursos de origen lícito o ilícito; el análisis debe considerar destino y propósito."
  },
  {
    category: "Cooperación internacional", source: "GAFI — Recomendaciones 36 a 40",
    question: "¿Qué principio favorece una cooperación internacional eficaz en investigaciones financieras?",
    answers: ["Rechazar toda solicitud por secreto bancario", "Exigir siempre condena previa", "Ofrecer asistencia amplia, oportuna y con salvaguardas", "Limitar el intercambio a información pública"],
    correct: 2, explanation: "Los estándares promueven asistencia oportuna, intercambio de información y herramientas de cooperación sujetas a garantías legales."
  },
  {
    category: "Reto internacional", source: "GAFI · ONU · OCDE",
    question: "Una PEP controla indirectamente una sociedad que paga a un proveedor de activos virtuales en una jurisdicción sancionada. ¿Cuál es la respuesta más completa?",
    answers: ["Procesar si el monto está fraccionado", "Aplicar solo 50/50 al beneficiario formal", "Detener, verificar control efectivo, sanciones, origen/destino y escalar conforme al riesgo", "Cerrar el expediente sin conservar registros"],
    correct: 2, explanation: "El caso exige integrar beneficiario final, PEP, sanciones, activos virtuales, trazabilidad y escalamiento; ninguna señal debe analizarse aisladamente."
  },
];

const fullQuestionBank: BankQuestion[] = [
  ...questions.map((question, index) => ({
    ...question,
    id: `original-${index + 1}`,
    tier: (Math.floor(index / 3) + 1) as 1 | 2 | 3 | 4 | 5,
  })),
  ...extraQuestions,
];

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomizeAnswers(question: BankQuestion): Question {
  const order = shuffled([0, 1, 2, 3]);
  return {
    ...question,
    answers: order.map(index => question.answers[index]),
    correct: order.indexOf(question.correct),
  };
}

function createQuestionSet() {
  let recent: string[] = [];
  try { recent = JSON.parse(localStorage.getItem("compliance-recent-questions") || "[]"); } catch { recent = []; }
  const picked: BankQuestion[] = [];
  for (let tier = 1; tier <= 5; tier++) {
    const tierPool = fullQuestionBank.filter(q => q.tier === tier);
    const unseen = shuffled(tierPool.filter(q => !recent.includes(q.id)));
    const fallback = shuffled(tierPool.filter(q => !unseen.includes(q)));
    picked.push(...[...unseen, ...fallback].slice(0, 3));
  }
  const updatedRecent = [...recent, ...picked.map(q => q.id)].slice(-45);
  localStorage.setItem("compliance-recent-questions", JSON.stringify(updatedRecent));
  return picked.map(randomizeAnswers);
}

const avatarOptions = [
  { skin: "#8d5524", hair: "#17120f", suit: "#183a66" },
  { skin: "#c68642", hair: "#3a2418", suit: "#552f72" },
  { skin: "#e0ac69", hair: "#6b3b20", suit: "#14574c" },
  { skin: "#f1c27d", hair: "#17120f", suit: "#7a2938" },
  { skin: "#ffdbac", hair: "#b27b34", suit: "#26385e" },
  { skin: "#6f4028", hair: "#0f0c0a", suit: "#4d315e" },
];

type AvatarReaction = "idle" | "thinking" | "nervous" | "happy" | "sad" | "celebrate" | "talking";

function Avatar({ index, small = false, reaction = "idle" }: { index: number; small?: boolean; reaction?: AvatarReaction }) {
  const a = avatarOptions[index];
  return (
    <div className={`avatar reaction-${reaction} ${small ? "avatar-small" : ""}`} style={{ "--skin": a.skin, "--hair": a.hair, "--suit": a.suit } as React.CSSProperties} aria-label={`Avatar: ${reaction}`}>
      <div className="avatar-hair" />
      <div className="avatar-head"><i /><b /><span /></div>
      <div className="avatar-neck" />
      <div className="avatar-arms"><i/><b/></div>
      <div className="avatar-body"><span /></div>
    </div>
  );
}

function syntheticTone(type: "select" | "lock" | "correct" | "wrong" | "lifeline" | "win") {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.value = type === "correct" || type === "win" ? 660 : type === "wrong" ? 140 : type === "lock" ? 240 : type === "lifeline" ? 440 : 330;
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (type === "select" ? .12 : .55));
  osc.start(); osc.stop(ctx.currentTime + (type === "select" ? .12 : .55));
}

export default function GameClient({ organizationId }: { organizationId: string }) {
  const [screen, setScreen] = useState<"welcome" | "register" | "avatar" | "game" | "end">("welcome");
  const [gameQuestions, setGameQuestions] = useState<Question[]>(questions);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [avatar, setAvatar] = useState(2);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [lifelines, setLifelines] = useState({ fifty: true, audience: true, expert: true });
  const [hidden, setHidden] = useState<number[]>([]);
  const [audience, setAudience] = useState<number[] | null>(null);
  const [expert, setExpert] = useState<string | null>(null);
  const [winnings, setWinnings] = useState("0");
  const [endTitle, setEndTitle] = useState("");
  const [mastery, setMastery] = useState(0);
  const [adaptiveExtreme, setAdaptiveExtreme] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [celebration, setCelebration] = useState<"milestone" | "grand" | null>(null);
  const [celebrationAmount, setCelebrationAmount] = useState("1.000");
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const cueRef = useRef<HTMLAudioElement | null>(null);
  const crowdRef = useRef<HTMLAudioElement | null>(null);
  const questionStartedAt = useRef(Date.now());
  const lifelineUsedOnQuestion = useRef(false);
  const q = gameQuestions[current];

  const level = useMemo(() => current < 3 ? "INTERMEDIO" : current < 6 ? "AVANZADO" : current < 9 ? "ESPECIALISTA" : current < 12 ? "EXPERTO" : "EXPERTO INTERNACIONAL", [current]);
  const playerReaction: AvatarReaction = result === "correct" ? "celebrate" : result === "wrong" ? "sad" : locked ? "nervous" : selected !== null ? "thinking" : "idle";
  const hostReaction: AvatarReaction = result === "correct" ? "happy" : result === "wrong" ? "talking" : locked ? "thinking" : "idle";
  const playerLine = result === "correct" ? "¡La tenía!" : result === "wrong" ? "Debí analizarlo mejor…" : locked ? "¿Será la definitiva?" : selected !== null ? "Estoy pensando…" : "Vamos por el millón.";
  const hostLine = result === "correct" ? "¡Respuesta correcta!" : result === "wrong" ? "Revisemos la explicación." : locked ? "Respuesta definitiva…" : "Analiza cada detalle.";
  const crowdReaction = result === "correct" ? "crowd-cheer" : result === "wrong" ? "crowd-silent" : locked ? "crowd-wait" : "crowd-idle";

  function musicVolume(questionIndex: number) {
    if (questionIndex === 14) return .34;
    if (questionIndex >= 10) return .38;
    if (questionIndex >= 5) return .50;
    return .46;
  }

  function cue(name: string, fallback: "select" | "lock" | "correct" | "wrong" | "lifeline" | "win") {
    cueRef.current?.pause();
    const audio = new Audio(`/audio/${name}.mp3`);
    cueRef.current = audio;
    const volumes: Record<string, number> = {
      intro: .22, "enter-stage": .55, "select-answer": .24,
      "final-answer": .60, correct: .55, wrong: .38,
      lifeline: .55, "million-win": .28, "game-over": .45,
    };
    audio.volume = volumes[name] ?? .5;
    audio.onerror = () => syntheticTone(fallback);
    void audio.play().catch(() => syntheticTone(fallback));
  }

  function startMusic(questionIndex: number) {
    if (musicRef.current) {
      musicRef.current.onpause = null;
      musicRef.current.pause();
    }
    setMusicPlaying(false);
    if (!musicEnabled) return;
    const file = questionIndex === 14 ? "music-final" : questionIndex >= 10 ? "music-11-14" : questionIndex >= 5 ? "music-6-10" : "music-1-5";
    const audio = new Audio(`/audio/${file}.mp3`);
    musicRef.current = audio;
    audio.loop = true;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = musicVolume(questionIndex);
    audio.onerror = () => { audio.pause(); };
    audio.onplaying = () => { if (musicRef.current === audio) setMusicPlaying(true); };
    audio.onpause = () => { if (musicRef.current === audio) setMusicPlaying(false); };
    audio.load();
    void audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
  }

  function toggleMusic() {
    if (musicPlaying) {
      stopMusic();
      setMusicEnabled(false);
      return;
    }
    setMusicEnabled(true);
    const file = current === 14 ? "music-final" : current >= 10 ? "music-11-14" : current >= 5 ? "music-6-10" : "music-1-5";
    const audio = new Audio(`/audio/${file}.mp3`);
    audio.loop = true;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = musicVolume(current);
    musicRef.current = audio;
    audio.onplaying = () => { if (musicRef.current === audio) setMusicPlaying(true); };
    audio.onpause = () => { if (musicRef.current === audio) setMusicPlaying(false); };
    audio.load();
    void audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
  }

  function stopMusic() {
    if (musicRef.current) {
      musicRef.current.onpause = null;
      musicRef.current.pause();
    }
    musicRef.current = null;
    setMusicPlaying(false);
  }

  useEffect(() => () => {
    musicRef.current?.pause();
    cueRef.current?.pause();
    crowdRef.current?.pause();
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") !== "celebraciones") return;
    let grandTimer = 0;
    const showSequence = () => {
      setCelebrationAmount("1.000");
      setCelebration("milestone");
      grandTimer = window.setTimeout(() => {
        setCelebrationAmount("1.000.000");
        setCelebration("grand");
        cue("million-win", "win");
      }, 4200);
    };
    showSequence();
    const loopTimer = window.setInterval(showSequence, 11000);
    return () => { window.clearTimeout(grandTimer); window.clearInterval(loopTimer); };
  }, []);

  function audienceCheer() {
    crowdRef.current?.pause();
    const audio = new Audio("/audio/audience-cheer.mp3");
    crowdRef.current = audio;
    audio.volume = .16;
    void audio.play().catch(() => undefined);
  }

  async function register(e: FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch("/api/participants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, organizationId }) });
      if (response.ok) {
        const data = await response.json() as { id: string };
        setParticipantId(data.id);
      }
    } catch { /* La experiencia puede continuar si la red está temporalmente fuera. */ }
    setScreen("avatar");
  }

  function useFifty() {
    if (!lifelines.fifty || locked) return;
    lifelineUsedOnQuestion.current = true;
    const wrong = q.answers.map((_, i) => i).filter(i => i !== q.correct);
    setHidden(wrong.slice(0, 2)); setLifelines(v => ({ ...v, fifty: false })); cue("lifeline", "lifeline");
  }

  function useAudience() {
    if (!lifelines.audience || locked) return;
    lifelineUsedOnQuestion.current = true;
    const strength = Math.max(43, 79 - current * 2);
    const rest = 100 - strength;
    const poll = [Math.floor(rest * .25), Math.floor(rest * .35), Math.floor(rest * .4), 0];
    poll[q.correct] = strength;
    const delta = 100 - poll.reduce((a, b) => a + b, 0);
    poll[(q.correct + 1) % 4] += delta;
    setAudience(poll); setLifelines(v => ({ ...v, audience: false })); cue("lifeline", "lifeline");
  }

  function useExpert() {
    if (!lifelines.expert || locked) return;
    lifelineUsedOnQuestion.current = true;
    setExpert(`Mi análisis apunta a la opción ${"ABCD"[q.correct]}. Revisa especialmente el principio de ${q.category.toLowerCase()}.`);
    setLifelines(v => ({ ...v, expert: false })); cue("lifeline", "lifeline");
  }

  function confirm() {
    if (selected === null || locked) return;
    setLocked(true);
    if (musicRef.current) musicRef.current.volume = Math.max(.06, musicVolume(current) * .42);
    cue("final-answer", "lock");
    window.setTimeout(() => {
      const ok = selected === q.correct;
      if (musicRef.current) musicRef.current.volume = musicVolume(current);
      setResult(ok ? "correct" : "wrong");
      if (ok && current === 14) cue("million-win", "win");
      else cue(ok ? "correct" : "wrong", ok ? "correct" : "wrong");
      if (ok) audienceCheer();
      if (ok) {
        setWinnings(rewards[current]);
        if (current === 4 || current === 9) {
          setCelebrationAmount(rewards[current]);
          setCelebration("milestone");
          window.setTimeout(() => setCelebration(null), 3600);
        } else if (current === 14) {
          setCelebrationAmount("1.000.000");
          setCelebration("grand");
          window.setTimeout(() => setCelebration(null), 6500);
        }
        const seconds = (Date.now() - questionStartedAt.current) / 1000;
        const gained = 10 + (lifelineUsedOnQuestion.current ? 0 : 5) + (seconds <= 35 ? 5 : 0);
        const projected = mastery + gained;
        setMastery(projected);
        if (current >= 6 && projected >= 95 && !adaptiveExtreme) activateExtremeMode();
      }
    }, 5000);
  }

  function activateExtremeMode() {
    const usedIds = new Set(gameQuestions.map(question => question.id));
    const extreme = shuffled(fullQuestionBank.filter(question => question.tier === 5 && !usedIds.has(question.id))).slice(0, 6).map(randomizeAnswers);
    setGameQuestions(previous => previous.map((question, index) => index >= 9 ? (extreme[index - 9] || question) : question));
    setAdaptiveExtreme(true);
    cue("lifeline", "lifeline");
  }

  function next() {
    if (result === "wrong") {
      const safe = current < 5 ? "0" : current < 10 ? "1.000" : "32.000";
      finish(`La respuesta no era correcta. Conservas ${safe} puntos.`, safe); return;
    }
    if (current === 14) { finish("¡Dominaste el reto internacional de compliance!", "1.000.000"); return; }
    const following = current + 1;
    setCurrent(following); setSelected(null); setLocked(false); setResult(null); setHidden([]); setAudience(null); setExpert(null);
    questionStartedAt.current = Date.now(); lifelineUsedOnQuestion.current = false;
    startMusic(following);
  }

  function finish(title: string, amount = winnings) {
    stopMusic();
    if (amount === "1.000.000") cue("million-win", "win"); else cue("game-over", "wrong");
    setEndTitle(title); setWinnings(amount); setScreen("end");
    if (participantId) {
      const winningsPoints = Number(amount.replace(/\./g, ""));
      const masteryPercent = Math.min(100, Math.round(mastery / 2.2));
      fetch(`/api/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winningsPoints, level, masteryPercent }),
      }).catch(() => undefined);
    }
  }

  function restart() {
    setGameQuestions(createQuestionSet());
    setCurrent(0); setSelected(null); setLocked(false); setResult(null); setHidden([]); setAudience(null); setExpert(null);
    setCelebration(null);
    setLifelines({ fifty: true, audience: true, expert: true }); setWinnings("0"); setMastery(0); setAdaptiveExtreme(false);
    questionStartedAt.current = Date.now(); lifelineUsedOnQuestion.current = false; setScreen("game"); startMusic(0);
  }

  return (
    <main className={`stage-shell ${screen === "game" ? "game-active" : ""}`}>
      <div className="light light-one" /><div className="light light-two" />
      <div className="top-brand"><span className="brand-mark">C</span><div><b>CUMPLIMIENTO</b><small>EL RETO INTERNACIONAL</small></div></div>
      {screen !== "welcome" && screen !== "end" && <button className={`music-toggle ${musicPlaying ? "is-on" : ""}`} onClick={toggleMusic} aria-label={musicPlaying ? "Silenciar música" : "Activar música"} title={musicPlaying ? "Silenciar música" : "Activar música"}>
        <span>{musicPlaying ? "♫" : "♪"}</span>{musicPlaying ? "MÚSICA ACTIVA" : "ACTIVAR MÚSICA"}
      </button>}
      {celebration && <div className={`celebration celebration-${celebration}`} role="status" aria-live="assertive">
        <div className="celebration-rays" />
        <div className="confetti" aria-hidden="true">{Array.from({length:48},(_,i)=><i key={i} style={{"--i":i,"--x":`${(i * 37) % 100}%`,"--delay":`${(i % 12) * .08}s`,"--color":["#ffd45f","#35bfff","#ffffff","#7dffc2","#ff5f83"][i%5]} as React.CSSProperties}/>)}</div>
        <div className="celebration-card">
          <span>{celebration === "grand" ? "◆" : "★"}</span>
          <small>{celebration === "grand" ? "MÁXIMO NIVEL ALCANZADO" : "NIVEL SEGURO SUPERADO"}</small>
          <b>{celebration === "grand" ? "¡UN MILLÓN DE PUNTOS!" : `¡${celebrationAmount} PUNTOS ASEGURADOS!`}</b>
          <p>{celebration === "grand" ? "Dominaste el reto internacional de compliance" : "Tu conocimiento te lleva al siguiente nivel"}</p>
        </div>
      </div>}

      {screen === "welcome" && <section className="welcome panel">
        <div className="seal"><span>15</span><small>RETOS</small></div>
        <p className="eyebrow">ÉTICA · GAFI · ONU · OCDE</p>
        <h1>¿Hasta dónde llega<br/><em>tu conocimiento?</em></h1>
        <p className="lead">Entra al escenario, toma decisiones bajo presión y demuestra que dominas el compliance internacional.</p>
        <button className="primary" onClick={() => { startMusic(0); setScreen("register"); window.setTimeout(() => cue("intro", "select"), 180); }}>ENTRAR AL JUEGO <span>›</span></button>
        <p className="fine">15 preguntas · 3 comodines · 1 millón de puntos</p>
      </section>}

      {screen === "register" && <section className="register panel">
        <p className="eyebrow">ANTES DE ENTRAR AL ESCENARIO</p><h2>Identifica tu participación</h2>
        <form onSubmit={register}>
          <label>Nombre completo<input required value={profile.name} onChange={e => setProfile({...profile, name:e.target.value})} placeholder="¿Cómo te llamas?" /></label>
          <label>Correo electrónico<input required type="email" value={profile.email} onChange={e => setProfile({...profile, email:e.target.value})} placeholder="nombre@empresa.com" /></label>
          <label>Teléfono<input required type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone:e.target.value})} placeholder="+57 300 000 0000" /></label>
          <label className="consent"><input required type="checkbox" /> <span>Acepto el tratamiento de mis datos para registrar mi participación y resultado.</span></label>
          <button className="primary" type="submit">CONTINUAR <span>›</span></button>
        </form>
      </section>}

      {screen === "avatar" && <section className="avatar-screen panel">
        <p className="eyebrow">TU LUGAR EN EL JUEGO</p><h2>Elige tu avatar</h2><p className="muted">Este personaje te representará durante todo el desafío.</p>
        <div className="avatar-preview"><Avatar index={avatar} /><b>{profile.name || "Participante"}</b><span>ESPECIALISTA EN COMPLIANCE</span></div>
        <div className="avatar-grid">{avatarOptions.map((option, i) => <button key={i} onClick={() => setAvatar(i)} className={avatar === i ? "chosen" : ""} style={{ background: option.suit }} aria-label={`Avatar ${i + 1}`} aria-pressed={avatar === i} />)}</div>
        <button className="primary" onClick={() => { setGameQuestions(createQuestionSet()); setMastery(0); setAdaptiveExtreme(false); questionStartedAt.current = Date.now(); lifelineUsedOnQuestion.current = false; startMusic(0); setScreen("game"); window.setTimeout(() => cue("enter-stage", "select"), 180); }}>OCUPAR MI LUGAR <span>›</span></button>
      </section>}

      {screen === "game" && <section className="game-layout">
        <div className="game-main">
          <div className="studio-scene">
            <div className="studio-beam beam-a"/><div className="studio-beam beam-b"/>
            <div className={`studio-audience ${crowdReaction}`} aria-label="Público del estudio">
              {Array.from({length:30},(_,i)=><span key={i} style={{"--delay":`${(i%8)*.07}s`,"--tone":["#8d5524","#c68642","#e0ac69","#f1c27d","#ffdbac","#6f4028"][i%6]} as React.CSSProperties}/>) }
            </div>
            <div className="studio-person contestant">
              <div className="reaction-bubble" aria-live="polite">{playerLine}</div>
              <div className="chair"/><div className="avatar-stage-scale"><Avatar index={avatar} reaction={playerReaction} /></div>
              <div className="person-tag"><i/><div><b>{profile.name}</b><small>{level}</small></div></div>
            </div>
            <div className="studio-center">
              <div className="studio-emblem"><span>15</span><small>RETOS</small></div>
              <div className="studio-floor"><i/><i/><i/></div>
            </div>
            <div className="studio-person host">
              <div className="reaction-bubble host-bubble" aria-live="polite">{hostLine}</div>
              <div className="chair"/><div className="avatar-stage-scale"><Avatar index={3} reaction={hostReaction} /></div>
              <div className="person-tag"><div><b>AURA</b><small>PRESENTADORA VIRTUAL</small></div></div>
            </div>
            <div className="studio-status">
              <span><small>ACUMULADO</small><b>{winnings} PUNTOS</b></span>
              <span className="studio-mastery"><small>ÍNDICE DE DOMINIO</small><i><b style={{width:`${Math.min(100, Math.round(mastery / 2.2))}%`}}/></i><strong>{Math.min(100, Math.round(mastery / 2.2))}%</strong></span>
            </div>
          </div>
          <div className="question-dock">
          <header className="question-meta"><span>PREGUNTA {current + 1} DE 15</span><b>{level}</b><span>{q.category.toUpperCase()}</span></header>
          <div className="lifelines" aria-label="Comodines disponibles">
            <span className="lifelines-title">COMODINES</span>
            <button disabled={!lifelines.fifty || locked} onClick={useFifty}><b>50:50</b><span>Dos opciones</span></button>
            <button disabled={!lifelines.audience || locked} onClick={useAudience}><b>▥</b><span>Audiencia</span></button>
            <button disabled={!lifelines.expert || locked} onClick={useExpert}><b>◎</b><span>Experto</span></button>
          </div>
          {adaptiveExtreme && current >= 9 && <div className="extreme-banner"><span>◆</span><div><b>MODO EXPERTO INTERNACIONAL ACTIVADO</b><small>Tu desempeño elevó la dificultad al máximo</small></div><span>◆</span></div>}
          <div className="question-box"><small>{q.source}</small><h2>{q.question}</h2></div>
          <div className="answers">{q.answers.map((answer, i) => {
            const state = result ? (i === q.correct ? "correct" : i === selected ? "wrong" : "") : selected === i ? "selected" : "";
            return <button key={answer} disabled={hidden.includes(i) || locked} className={state + (hidden.includes(i) ? " hidden" : "")} onClick={() => {setSelected(i); cue("select-answer", "select")}}><b>{"ABCD"[i]}</b><span>{hidden.includes(i) ? "—" : answer}</span></button>
          })}</div>
          {locked && !result && <div className="suspense-reveal" role="status" aria-live="assertive">
            <span>RESPUESTA DEFINITIVA</span>
            <div><i/><i/><i/><i/><i/></div>
            <small>Verificando tu decisión…</small>
          </div>}
          {audience && <div className="helper-card"><b>Votación del público</b><div className="poll">{audience.map((n,i)=><span key={i}><i style={{height:`${n}%`}}/><small>{"ABCD"[i]} · {n}%</small></span>)}</div></div>}
          {expert && <div className="helper-card expert"><b>Experto internacional</b><p>“{expert}”</p></div>}
          {result && <div className={`explanation ${result}`}><b>{result === "correct" ? "RESPUESTA CORRECTA" : "RESPUESTA INCORRECTA"}</b><p>{q.explanation}</p></div>}
          <div className="game-actions">
            {!result && <button className="walk" onClick={() => finish("Decidiste retirarte con tu premio asegurado.")}>RETIRARME</button>}
            {!result && <button className={`confirm ${selected !== null ? "ready" : ""}`} disabled={selected === null || locked} onClick={confirm}>{locked ? "VERIFICANDO…" : selected === null ? "SELECCIONA UNA RESPUESTA" : `ENVIAR RESPUESTA ${"ABCD"[selected]}`}</button>}
            {result && <button className="confirm" onClick={next}>{result === "correct" && current < 14 ? "SIGUIENTE PREGUNTA" : "VER RESULTADO"}</button>}
          </div>
          </div>
        </div>

        <aside className="ladder"><h3>ESCALERA DE PUNTOS</h3>{[...rewards].reverse().map((reward, reverseIndex) => {
          const i = 14 - reverseIndex; return <div key={reward} className={`${i === current ? "active" : ""} ${i === 4 || i === 9 || i === 14 ? "safe" : ""} ${i < current ? "passed" : ""}`}><span>{i+1}</span><b>{reward}</b>{(i === 4 || i === 9) && <small>◆</small>}</div>
        })}<p>◆ NIVEL SEGURO</p></aside>
      </section>}

      {screen === "end" && <section className={`end panel ${winnings === "1.000.000" ? "win" : "lose"}`}>
        <p className="eyebrow">PARTIDA FINALIZADA</p><h2>{endTitle}</h2><Avatar index={avatar} /><h3>{profile.name}</h3>
        <div className="final-score">
          <i className="accent-bar" />
          <small>RESULTADO FINAL</small>
          <b>{winnings}</b>
          <span>PUNTOS</span>
          <div className="score-bar"><i style={{ width: `${Math.min(100, Math.round(mastery / 2.2))}%` }} /></div>
          <div className="end-stats"><span>{level}</span><span>Índice de dominio: {Math.min(100, Math.round(mastery / 2.2))}%</span></div>
        </div>
        <button className="primary" onClick={restart}>JUGAR DE NUEVO <span>↻</span></button>
      </section>}
      <footer>Experiencia educativa de compliance · Contenido basado en estándares internacionales</footer>
    </main>
  );
}
