"use client";

import { FormEvent, useState } from "react";

const themes = [
  "Ética empresarial", "Anticorrupción y antisoborno", "Lavado de activos y FT",
  "Conflictos de interés", "Protección de datos", "Canales de denuncia",
  "Regalos, viajes e invitaciones", "Competencia justa", "Conducta laboral",
  "Relación con proveedores", "Seguridad de la información", "Casos prácticos",
];

const benefits = [
  { icon: "◇", title: "Aprender bajo presión", text: "Convierte políticas complejas en decisiones memorables, con tensión, tiempo y retroalimentación inmediata." },
  { icon: "◎", title: "Medir conocimiento real", text: "La dificultad se adapta al desempeño y revela quién comprende los criterios, no quién solo memoriza definiciones." },
  { icon: "◆", title: "Activar la cultura ética", text: "Una experiencia participativa que genera conversación y conecta el compliance con situaciones del trabajo diario." },
];

const demoQuestions = [
  {
    category: "ÉTICA EMPRESARIAL",
    source: "Gestión de conflictos de interés",
    question: "Una directora participa en la selección de una empresa donde trabaja su hermano. ¿Cuál es la respuesta de compliance más adecuada?",
    answers: ["Participar si la oferta es competitiva", "Declarar el conflicto y apartarse", "Informarlo después de contratar", "Solicitar una aprobación verbal"],
    correct: 1,
    explanation: "El conflicto debe declararse oportunamente y gestionarse mediante recusación o controles equivalentes.",
  },
  {
    category: "GAFI · BENEFICIARIO FINAL",
    source: "Recomendaciones 10 y 24",
    question: "Una persona controla una sociedad mediante acuerdos de voto, aunque no posee la mayoría de las acciones. ¿Cómo debe tratarse?",
    answers: ["Como representante informal", "Como beneficiario final por control efectivo", "Solo como firmante autorizado", "No requiere identificación"],
    correct: 1,
    explanation: "La titularidad real se determina por propiedad o por otros medios de control; el porcentaje accionario no es el único criterio.",
  },
  {
    category: "ANTISOBORNO INTERNACIONAL",
    source: "OCDE · Debida diligencia de terceros",
    question: "Un intermediario solicita una comisión extraordinaria y el pago en una cuenta de otra jurisdicción. ¿Qué acción protege mejor a la organización?",
    answers: ["Dividir el pago en montos pequeños", "Aceptar si existe factura", "Suspender y aplicar debida diligencia reforzada", "Pedir confidencialidad al intermediario"],
    correct: 2,
    explanation: "La comisión atípica y el pago a otra jurisdicción son señales de alerta que exigen detener y profundizar la revisión.",
  },
];

const pricingPlans = [
  { name: "Free", eyebrow: "PARA EMPEZAR", duration: "Permanente", users: "Hasta 10 usuarios", price: "$0", suffix: "para siempre", description: "Una puerta de entrada para pymes y equipos pequeños.", cta: "CREAR CUENTA GRATIS", featured: false },
  { name: "Mensual", eyebrow: "FLEXIBLE", duration: "30 días", users: "Hasta 100 participantes", price: "$199.000", suffix: "+ IVA", description: "Ideal para una campaña o jornada puntual de formación.", cta: "ELEGIR MENSUAL", featured: false },
  { name: "Trimestral", eyebrow: "ACTIVACIÓN", duration: "90 días", users: "Hasta 100 participantes", price: "$499.000", suffix: "+ IVA", description: "Más tiempo para activar, medir y reforzar conocimientos.", cta: "ELEGIR TRIMESTRAL", featured: false },
  { name: "Semestral", eyebrow: "CONTINUIDAD", duration: "180 días", users: "Hasta 100 participantes", price: "$899.000", suffix: "+ IVA", description: "Para sostener una agenda de compliance durante el semestre.", cta: "ELEGIR SEMESTRAL", featured: false },
  { name: "Anual", eyebrow: "MEJOR VALOR", duration: "365 días", users: "Hasta 100 participantes", price: "$1.490.000", suffix: "+ IVA", description: "La plataforma completa para acompañar todo el año.", cta: "ELEGIR ANUAL", featured: true },
];

const planFeatures = [
  ["Juegos ilimitados", "—", "✓", "✓", "✓", "✓"],
  ["Ranking", "—", "✓", "✓", "✓", "✓"],
  ["Certificados", "—", "✓", "✓", "✓", "✓"],
  ["Reportes", "—", "Básico", "Completo", "Completo", "Avanzado"],
  ["Nuevas preguntas", "—", "—", "✓", "✓", "✓"],
  ["Personalización", "—", "—", "✓", "✓", "✓"],
  ["Soporte prioritario", "—", "—", "—", "✓", "✓"],
];

export default function MarketingHome() {
  const [lead, setLead] = useState({ name: "", company: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [demoIndex, setDemoIndex] = useState(0);
  const [demoSelected, setDemoSelected] = useState<number | null>(null);
  const [demoResult, setDemoResult] = useState<"correct" | "wrong" | null>(null);
  const [demoLocked, setDemoLocked] = useState(false);
  const [demoScore, setDemoScore] = useState(0);
  const [demoFinished, setDemoFinished] = useState(false);
  const [subscriber, setSubscriber] = useState({ name: "", email: "", company: "" });
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const demoQuestion = demoQuestions[demoIndex];

  async function submitLead(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
      if (!response.ok) throw new Error("No fue posible enviar");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  function confirmDemoAnswer() {
    if (demoSelected === null || demoLocked) return;
    setDemoLocked(true);
    window.setTimeout(() => {
      const correct = demoSelected === demoQuestion.correct;
      setDemoResult(correct ? "correct" : "wrong");
      if (correct) setDemoScore(score => score + 1);
    }, 1300);
  }

  function nextDemoQuestion() {
    if (demoIndex === demoQuestions.length - 1) {
      setDemoFinished(true);
      return;
    }
    setDemoIndex(index => index + 1);
    setDemoSelected(null);
    setDemoResult(null);
    setDemoLocked(false);
  }

  async function subscribeToDemo(event: FormEvent) {
    event.preventDefault();
    setSubscribeStatus("sending");
    try {
      const response = await fetch("/api/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...subscriber, score: demoScore }) });
      if (!response.ok) throw new Error("No fue posible suscribir");
      setSubscribeStatus("sent");
    } catch {
      setSubscribeStatus("error");
    }
  }

  return <main className="marketing-page">
    <nav className="marketing-nav">
      <a className="marketing-brand" href="#inicio" aria-label="Cumplimiento, inicio"><span>C</span><div><b>CUMPLIMIENTO</b><small>EXPERIENCIAS QUE TRANSFORMAN</small></div></a>
      <div className="nav-links"><a href="#demo">Demo</a><a href="#experiencia">Experiencia</a><a href="#contenidos">Contenidos</a><a href="#precios">Planes</a></div>
      <div className="nav-account"><a href="/login">INGRESAR</a><a className="nav-cta" href="#demo">PROBAR AHORA</a></div>
    </nav>

    <section className="marketing-hero" id="inicio">
      <div className="hero-glow hero-glow-a"/><div className="hero-glow hero-glow-b"/>
      <div className="hero-copy">
        <p className="marketing-kicker"><i/> FORMACIÓN EN COMPLIANCE QUE SÍ SE RECUERDA</p>
        <h1>Convierte el cumplimiento en una <em>experiencia inolvidable.</em></h1>
        <p className="hero-lead">Un game show corporativo de alta tensión que evalúa, forma y compromete a tus equipos con los desafíos reales de la ética y el compliance internacional.</p>
        <div className="hero-actions"><a className="marketing-primary" href="#demo">PROBAR 3 PREGUNTAS <span>→</span></a><a className="marketing-secondary" href="#como-funciona"><span>▶</span> VER CÓMO FUNCIONA</a></div>
        <div className="trust-line"><span>Contenido basado en</span><b>GAFI</b><b>ONU</b><b>OCDE</b><b>ISO 37301</b></div>
      </div>
      <div className="hero-product" aria-label="Vista previa del juego">
        <div className="product-frame">
          <div className="product-live"><i/> EXPERIENCIA EN VIVO <b>12:48</b></div>
          <div className="product-stage"><div className="product-score"><small>PREGUNTA 12 DE 15</small><b>250.000</b><span>PUNTOS</span></div></div>
          <div className="product-question">¿Qué medida exige GAFI para identificar al beneficiario final?</div>
          <div className="product-answers"><span>A · Declaración verbal</span><span className="active">B · Control efectivo</span><span>C · Registro tributario</span><span>D · Domicilio social</span></div>
        </div>
        <div className="floating-stat stat-one"><b>+87%</b><span>PARTICIPACIÓN</span></div>
        <div className="floating-stat stat-two"><b>15</b><span>NIVELES ADAPTATIVOS</span></div>
      </div>
    </section>

    <section className="logo-strip"><span>Diseñado para</span><b>ÁREAS DE COMPLIANCE</b><b>UNIVERSIDADES</b><b>CONSULTORAS</b><b>EVENTOS CORPORATIVOS</b></section>

    <section className="landing-demo" id="demo">
      <div className="demo-heading"><p>PRUÉBALO ANTES DE DECIDIR</p><h2>Tres preguntas. Cero registro inicial.</h2><span>Entra en situación y descubre cómo se siente aprender compliance dentro del juego.</span></div>
      <div className="demo-console">
        <div className="demo-stage-panel">
          <div className="demo-stage-live"><i/> DEMO EN VIVO</div>
          <div className="demo-emblem"><b>{demoFinished ? demoScore : demoIndex + 1}</b><small>{demoFinished ? "ACIERTOS" : "DE 3"}</small></div>
          <div className="demo-progress">{demoQuestions.map((_,index)=><span key={index} className={`${index < demoIndex || demoFinished ? "passed" : ""} ${index === demoIndex && !demoFinished ? "active" : ""}`}>{index+1}</span>)}</div>
          <p>{demoFinished ? "Has completado la experiencia abierta" : "La dificultad aumenta en cada pregunta"}</p>
        </div>
        {!demoFinished ? <div className="demo-quiz" aria-live="polite">
          <header><span>PREGUNTA {demoIndex+1} DE 3</span><b>{demoQuestion.category}</b></header>
          <div className="demo-question"><small>{demoQuestion.source}</small><h3>{demoQuestion.question}</h3></div>
          <div className="demo-options">{demoQuestion.answers.map((answer,index)=>{
            const state = demoResult ? (index === demoQuestion.correct ? "correct" : index === demoSelected ? "wrong" : "") : index === demoSelected ? "selected" : "";
            return <button key={answer} disabled={demoLocked} className={state} onClick={()=>setDemoSelected(index)}><b>{"ABCD"[index]}</b><span>{answer}</span></button>;
          })}</div>
          {demoLocked && !demoResult && <div className="demo-suspense"><i/><i/><i/> Verificando respuesta…</div>}
          {demoResult && <div className={`demo-feedback ${demoResult}`}><b>{demoResult === "correct" ? "RESPUESTA CORRECTA" : "RESPUESTA INCORRECTA"}</b><span>{demoQuestion.explanation}</span></div>}
          {!demoResult ? <button className={`demo-confirm ${demoSelected !== null ? "ready" : ""}`} disabled={demoSelected === null || demoLocked} onClick={confirmDemoAnswer}>{demoLocked ? "RESPUESTA DEFINITIVA…" : demoSelected === null ? "SELECCIONA UNA OPCIÓN" : `ENVIAR RESPUESTA ${"ABCD"[demoSelected]}`}</button> : <button className="demo-confirm ready" onClick={nextDemoQuestion}>{demoIndex < 2 ? "SIGUIENTE PREGUNTA →" : "VER MI RESULTADO →"}</button>}
        </div> : <div className="demo-gate">
          {subscribeStatus === "sent" ? <div className="demo-unlocked"><span>◆</span><p>EXPERIENCIA DESBLOQUEADA</p><h3>Tu siguiente reto tiene 15 niveles.</h3><b>Resultado del demo: {demoScore} de 3</b><a href="/juego">ENTRAR AL JUEGO COMPLETO →</a></div> : <>
            <p>HAS COMPLETADO EL DEMO</p><h3>Obtuviste {demoScore} de 3 respuestas correctas.</h3><span>Suscríbete para acceder al reto completo, recibir novedades y conocer soluciones para tu organización.</span>
            <form onSubmit={subscribeToDemo}><label>Nombre<input required value={subscriber.name} onChange={event=>setSubscriber({...subscriber,name:event.target.value})} placeholder="Tu nombre"/></label><label>Correo electrónico<input required type="email" value={subscriber.email} onChange={event=>setSubscriber({...subscriber,email:event.target.value})} placeholder="nombre@empresa.com"/></label><label>Empresa <small>(opcional)</small><input value={subscriber.company} onChange={event=>setSubscriber({...subscriber,company:event.target.value})} placeholder="Organización"/></label><button disabled={subscribeStatus === "sending"}>{subscribeStatus === "sending" ? "SUSCRIBIENDO…" : "SUSCRIBIRME Y CONTINUAR →"}</button>{subscribeStatus === "error" && <b>No fue posible completar la suscripción. Inténtalo nuevamente.</b>}<small>Podrás darte de baja cuando quieras.</small></form>
          </>}
        </div>}
      </div>
    </section>

    <section className="marketing-section experience-section" id="experiencia">
      <div className="section-heading"><p>UNA EXPERIENCIA, TRES RESULTADOS</p><h2>Más que capacitación.<br/><em>Una prueba de criterio.</em></h2><span>La emoción del concurso convierte cada decisión en un momento de aprendizaje que permanece.</span></div>
      <div className="benefit-grid">{benefits.map((item, index)=><article key={item.title}><span className="benefit-number">0{index+1}</span><i>{item.icon}</i><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
    </section>

    <section className="marketing-section content-section" id="contenidos">
      <div className="content-intro"><p>CONTENIDO DE ALTO NIVEL</p><h2>Del dilema cotidiano al estándar internacional.</h2><span>Un banco amplio de preguntas que aumenta su dificultad y combina regulación, ética y toma de decisiones.</span><div className="international-badges"><b>40</b><span>RECOMENDACIONES<br/>DEL GAFI</span><b>12</b><span>ÁREAS CLAVE<br/>DE COMPLIANCE</span></div></div>
      <div className="theme-list">{themes.map((theme,index)=><div key={theme}><span>{String(index+1).padStart(2,"0")}</span><b>{theme}</b><i>↗</i></div>)}</div>
    </section>

    <section className="marketing-section how-section" id="como-funciona">
      <div className="section-heading"><p>IMPLEMENTACIÓN SIMPLE</p><h2>Tu experiencia lista en tres pasos.</h2></div>
      <div className="steps"><article><b>1</b><div><small>CONFIGURAMOS</small><h3>Alineamos el reto</h3><p>Adaptamos identidad, temas, dificultad y casos a tus objetivos.</p></div></article><article><b>2</b><div><small>ACTIVAMOS</small><h3>Tu equipo entra al escenario</h3><p>Participación individual, grupal, presencial o completamente en línea.</p></div></article><article><b>3</b><div><small>MEDIMOS</small><h3>Convertimos respuestas en información</h3><p>Resultados útiles para reforzar contenidos y orientar el plan de formación.</p></div></article></div>
    </section>

    <section className="pricing-section" id="precios">
      <div className="section-heading"><p>PRECIOS DE LANZAMIENTO</p><h2>Un plan para cada etapa de tu cultura de cumplimiento.</h2><span>Empieza gratis, valida la experiencia y escala cuando quieras incluir a toda tu organización.</span></div>
      <div className="pricing-grid">{pricingPlans.map(plan=><article key={plan.name} className={plan.featured ? "featured" : ""}>{plan.featured && <span className="pricing-badge">RECOMENDADO</span>}<small>{plan.eyebrow}</small><h3>{plan.name}</h3><div className="price"><b>{plan.price}</b><span>{plan.suffix}</span></div><p>{plan.description}</p><ul><li>◆ {plan.duration}</li><li>◆ {plan.users}</li>{plan.name === "Free" && <li>◆ 10 preguntas</li>}</ul><a href="/panel">{plan.cta} →</a></article>)}</div>
      <div className="pricing-comparison">
        <div className="comparison-heading"><p>BENEFICIOS QUE CRECEN CONTIGO</p><h3>No pagas solo por tiempo. Cada plan amplía lo que puedes lograr.</h3></div>
        <div className="comparison-scroll"><table><thead><tr><th>Funcionalidad</th><th>Free</th><th>Mensual</th><th>Trimestral</th><th>Semestral</th><th>Anual</th></tr></thead><tbody>{planFeatures.map(row=><tr key={row[0]}>{row.map((cell,index)=><td key={`${row[0]}-${index}`} className={cell === "✓" ? "included" : cell === "—" ? "excluded" : ""}>{cell}</td>)}</tr>)}</tbody></table></div>
      </div>
      <div className="enterprise-scale"><div><small>PARA ORGANIZACIONES MÁS GRANDES</small><h3>El precio escala con tu alcance.</h3><p>Todos los planes pagos incluyen hasta 100 participantes. Para audiencias mayores aplicamos un factor sencillo y predecible.</p></div><div className="scale-items"><span><b>101–300</b><i>1,8 × precio base</i></span><span><b>301–500</b><i>2,5 × precio base</i></span><span><b>Más de 500</b><i>Cotización personalizada</i></span></div><a href="#contacto">SOLICITAR COTIZACIÓN →</a></div>
      <p className="pricing-note">Precios expresados en pesos colombianos. Los valores de lanzamiento no incluyen IVA.</p>
    </section>

    <section className="marketing-section solution-section" id="soluciones">
      <div className="solution-copy"><p>UNA EXPERIENCIA QUE SE ADAPTA</p><h2>Haz del compliance el evento que todos quieren vivir.</h2><span>Desde una activación interna hasta un programa regional, configuramos el reto para tu audiencia y tus riesgos.</span><ul><li>Personalización visual con tu marca</li><li>Banco de preguntas por industria y jurisdicción</li><li>Modalidad individual, equipos o evento en vivo</li><li>Registro de participantes y resultados</li></ul><a className="marketing-primary" href="#contacto">CONVERSEMOS SOBRE TU RETO <span>→</span></a></div>
      <div className="solution-card"><small>FORMATO DESTACADO</small><h3>Experiencia corporativa</h3><p>Una activación completa para jornadas de ética, semanas de cumplimiento, inducciones y encuentros de liderazgo.</p><div><span><b>15</b> retos progresivos</span><span><b>3</b> comodines</span><span><b>1</b> gran final</span></div><a href="#demo">Probar las tres preguntas →</a></div>
    </section>

    <section className="contact-section" id="contacto">
      <div><p>¿LISTOS PARA ENTRAR AL ESCENARIO?</p><h2>Diseñemos una experiencia para tu organización.</h2><span>Cuéntanos sobre tu equipo y te contactaremos para preparar una demostración personalizada.</span></div>
      {status === "sent" ? <div className="lead-success"><b>✓ Solicitud recibida</b><p>Gracias. Ya tenemos tus datos para preparar la conversación.</p></div> : <form onSubmit={submitLead} className="lead-form">
        <label>Nombre completo<input required value={lead.name} onChange={e=>setLead({...lead,name:e.target.value})} placeholder="Tu nombre"/></label>
        <label>Empresa<input required value={lead.company} onChange={e=>setLead({...lead,company:e.target.value})} placeholder="Organización"/></label>
        <label>Correo corporativo<input required type="email" value={lead.email} onChange={e=>setLead({...lead,email:e.target.value})} placeholder="nombre@empresa.com"/></label>
        <label>Teléfono<input required type="tel" value={lead.phone} onChange={e=>setLead({...lead,phone:e.target.value})} placeholder="+57 300 000 0000"/></label>
        <button type="submit" disabled={status==="sending"}>{status==="sending" ? "ENVIANDO…" : "SOLICITAR DEMOSTRACIÓN →"}</button>
        {status === "error" && <p className="form-error">No pudimos enviar la solicitud. Inténtalo nuevamente.</p>}
        <small>Al enviar aceptas ser contactado en relación con esta experiencia.</small>
      </form>}
    </section>

    <footer className="marketing-footer"><a className="marketing-brand" href="#inicio"><span>C</span><div><b>CUMPLIMIENTO</b><small>EXPERIENCIAS QUE TRANSFORMAN</small></div></a><p>Formación inmersiva para decisiones responsables.</p><div><a href="#experiencia">Experiencia</a><a href="#precios">Planes</a><a href="#demo">Probar el demo</a></div><small>© 2026 Cumplimiento. Todos los derechos reservados.</small></footer>
  </main>;
}
