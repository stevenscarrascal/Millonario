"use client";

import { useState } from "react";
import { logout } from "../login/actions";
import { createClient } from "../../lib/supabase/client";

type Tab = "overview" | "participants" | "experiences" | "reports" | "certificates" | "plan" | "settings";
type DashboardProps = {
  fullName: string;
  email: string;
  role: string;
  organizationName: string;
  plan: string;
  planCode: string;
  status: string;
  participantLimit: number;
  expiresAt: string | null;
  isActive: boolean;
};

const menu: { id: Tab; icon: string; label: string }[] = [
  { id:"overview", icon:"◇", label:"Resumen" },
  { id:"participants", icon:"◎", label:"Participantes" },
  { id:"experiences", icon:"◆", label:"Juegos y contenidos" },
  { id:"reports", icon:"▥", label:"Reportes" },
  { id:"certificates", icon:"▣", label:"Certificados" },
  { id:"plan", icon:"★", label:"Mi plan" },
  { id:"settings", icon:"⚙", label:"Configuración" },
];

const availablePlans = [
  { code:"free", name:"Free", price:"$0", tax:"para siempre", duration:"Permanente", limit:10 },
  { code:"monthly", name:"Mensual", price:"$199.000", tax:"+ IVA", duration:"30 días", limit:100 },
  { code:"quarterly", name:"Trimestral", price:"$499.000", tax:"+ IVA", duration:"90 días", limit:100 },
  { code:"semiannual", name:"Semestral", price:"$899.000", tax:"+ IVA", duration:"180 días", limit:100 },
  { code:"annual", name:"Anual", price:"$1.490.000", tax:"+ IVA", duration:"365 días", limit:100 },
] as const;

function formatExpiry(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-CO", { dateStyle:"medium" }).format(new Date(value)) : "Sin vencimiento";
}

export default function DashboardClient(props: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState({ name:props.plan, code:props.planCode, status:props.status, limit:props.participantLimit, expiresAt:props.expiresAt, isActive:props.isActive });
  const [activatingPlan, setActivatingPlan] = useState<string | null>(null);
  const [planMessage, setPlanMessage] = useState<{ kind:"success" | "error"; text:string } | null>(null);
  const usedParticipants = 0;
  const usage = Math.round((usedParticipants / currentPlan.limit) * 100);
  const firstName = props.fullName.split(" ")[0] || "administrador";
  const expiry = formatExpiry(currentPlan.expiresAt);

  function go(tab: Tab) { setActiveTab(tab); setInviteOpen(false); window.scrollTo({ top:0, behavior:"smooth" }); }

  async function activatePlan(code: string) {
    const selected = availablePlans.find(plan=>plan.code === code);
    if (!selected || activatingPlan) return;
    setActivatingPlan(code);
    setPlanMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("activate_preview_plan", { requested_plan:code });
    if (error) {
      setPlanMessage({ kind:"error", text:"No pudimos activar el plan. Revisa tu sesión e inténtalo de nuevo." });
      setActivatingPlan(null);
      return;
    }
    const result = data as { status?:string; participant_limit?:number; expires_at?:string | null } | null;
    setCurrentPlan({ name:selected.name, code:selected.code, status:result?.status || "active", limit:result?.participant_limit || selected.limit, expiresAt:result?.expires_at ?? null, isActive:true });
    setPlanMessage({ kind:"success", text:`Plan ${selected.name} activado. No se realizó ningún cobro.` });
    setActivatingPlan(null);
  }

  return <main className="dashboard-page">
    <aside className="dashboard-sidebar">
      <a className="dashboard-brand" href="/"><span>C</span><div><b>CUMPLIMIENTO</b><small>PANEL EMPRESARIAL</small></div></a>
      <nav>{menu.map(item=><button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={()=>go(item.id)}><i>{item.icon}</i>{item.label}</button>)}</nav>
      <div className="sidebar-plan"><small>PLAN ACTUAL</small><b>{currentPlan.name}</b><span>{currentPlan.limit} participantes</span><button onClick={()=>go("plan")}>Administrar plan →</button></div>
      <form action={logout}><button>CERRAR SESIÓN</button></form>
    </aside>

    <section className="dashboard-content">
      <header><div><p>{menu.find(item=>item.id===activeTab)?.label.toUpperCase()}</p><h1>{activeTab === "overview" ? `Hola, ${firstName}.` : menu.find(item=>item.id===activeTab)?.label}</h1><span>{props.organizationName} · {activeTab === "overview" ? "Todo lo que necesitas para activar tu cultura de cumplimiento." : "Panel de gestión empresarial"}</span></div><div className="dashboard-user"><span>{(props.fullName || props.email || "A").slice(0,1).toUpperCase()}</span><div><b>{props.fullName}</b><small>{props.role === "owner" ? "PROPIETARIO" : "ADMINISTRADOR"}</small></div></div></header>
      {!currentPlan.isActive && <div className="plan-warning"><b>Tu plan no está activo.</b><span>Renueva para activar juegos, certificados y reportes.</span><button onClick={()=>go("plan")}>VER PLANES →</button></div>}

      {activeTab === "overview" && <>
        <div className="dashboard-actions"><a className="launch-game" href={currentPlan.isActive ? "/juego" : "/#precios"}><i>▶</i><div><small>ACCIÓN PRINCIPAL</small><b>{currentPlan.isActive ? "Iniciar una experiencia" : "Activar un plan"}</b></div><span>→</span></a><button onClick={()=>go("participants")}><i>＋</i><div><small>GESTIÓN</small><b>Invitar participantes</b></div><span>→</span></button><button onClick={()=>go("reports")}><i>↗</i><div><small>ANÁLISIS</small><b>Ver resultados</b></div><span>→</span></button></div>
        <div className="metric-grid"><article><small>PARTICIPANTES REGISTRADOS</small><b>{usedParticipants}</b><span>de {currentPlan.limit} disponibles</span><div><i style={{width:`${usage}%`}}/></div></article><article><small>EXPERIENCIAS REALIZADAS</small><b>0</b><span>Comienza tu primera activación</span><em>↗</em></article><article><small>PROMEDIO DE CONOCIMIENTO</small><b>—</b><span>Aparecerá después del primer juego</span><em>◎</em></article><article><small>CERTIFICADOS EMITIDOS</small><b>0</b><span>Disponibles según tu plan</span><em>◆</em></article></div>
        <div className="dashboard-grid"><ExperiencePanel compact planCode={currentPlan.code}/><PlanPanel {...props} plan={currentPlan.name} planCode={currentPlan.code} status={currentPlan.status} participantLimit={currentPlan.limit} expiresAt={currentPlan.expiresAt} isActive={currentPlan.isActive} expiry={expiry}/></div>
        <EmptyParticipants onInvite={()=>setInviteOpen(true)} />
      </>}

      {activeTab === "participants" && <section className="tab-screen"><div className="tab-toolbar"><div><small>GESTIÓN DEL EQUIPO</small><h2>Participantes</h2><p>Invita, consulta y administra las personas que pueden participar en tus experiencias.</p></div><button onClick={()=>setInviteOpen(true)}>＋ INVITAR PARTICIPANTES</button></div><div className="participant-summary"><article><b>0</b><span>Registrados</span></article><article><b>{currentPlan.limit}</b><span>Cupos disponibles</span></article><article><b>0%</b><span>Uso del plan</span></article></div><EmptyParticipants onInvite={()=>setInviteOpen(true)} embedded/></section>}

      {activeTab === "experiences" && <section className="tab-screen"><div className="tab-toolbar"><div><small>BIBLIOTECA DE CONTENIDOS</small><h2>Juegos y contenidos</h2><p>Activa experiencias de compliance para toda tu organización.</p></div><a href="/juego">INICIAR JUEGO →</a></div><ExperiencePanel planCode={currentPlan.code}/><div className="content-topics"><h3>Temas incluidos</h3><div>{["Ética empresarial","Anticorrupción","LA/FT","Conflictos de interés","Protección de datos","Canales de denuncia","GAFI","ONU y OCDE"].map(topic=><span key={topic}>◆ {topic}</span>)}</div></div></section>}

      {activeTab === "reports" && <section className="tab-screen"><div className="tab-toolbar"><div><small>ANÁLISIS DE DESEMPEÑO</small><h2>Reportes</h2><p>Conoce fortalezas, brechas y evolución del conocimiento de tu equipo.</p></div><button disabled>EXPORTAR REPORTE</button></div><div className="report-placeholder"><div className="fake-chart"><i/><i/><i/><i/><i/><i/><i/></div><span>▥</span><h3>Tu primer reporte aparecerá aquí</h3><p>Los resultados se consolidan automáticamente después de cada experiencia.</p><a href="/juego">INICIAR UNA EXPERIENCIA →</a></div></section>}

      {activeTab === "certificates" && <section className="tab-screen"><div className="tab-toolbar"><div><small>RECONOCIMIENTO</small><h2>Certificados</h2><p>Emite y consulta certificados para quienes completen los retos definidos.</p></div><button disabled>CONFIGURAR PLANTILLA</button></div><div className="certificate-preview"><div><span>C</span><small>CERTIFICADO DE PARTICIPACIÓN</small><h3>Compliance Challenge</h3><i>Otorgado por completar satisfactoriamente<br/>la experiencia internacional de cumplimiento.</i><b>{props.organizationName}</b></div><aside><span>0</span><h3>Certificados emitidos</h3><p>Cuando tus participantes completen una experiencia aparecerán aquí.</p></aside></div></section>}

      {activeTab === "plan" && <section className="tab-screen"><div className="tab-toolbar"><div><small>SUSCRIPCIÓN</small><h2>Mi plan</h2><p>Elige y activa el plan que quieras durante esta etapa de lanzamiento.</p></div><a href="/#precios">COMPARAR PLANES →</a></div><div className="preview-plan-notice"><b>◆ MODO DE LANZAMIENTO · PAGOS DESACTIVADOS</b><span>La activación es inmediata y no solicita tarjeta ni genera cobros. La pasarela se conectará más adelante.</span></div><div className="full-plan-card"><div><small>PLAN ACTUAL</small><h3>{currentPlan.name}</h3><b className={currentPlan.isActive ? "status-active" : "status-expired"}>{currentPlan.isActive ? "● ACTIVO" : "● INACTIVO"}</b></div><div><span><small>PARTICIPANTES</small><b>{currentPlan.limit}</b></span><span><small>VIGENCIA</small><b>{expiry}</b></span><span><small>ESTADO</small><b>{currentPlan.status}</b></span></div><ul><li>✓ Acceso a El Reto Internacional</li><li>✓ Ranking de participantes</li><li>{currentPlan.code === "free" ? "—" : "✓"} Certificados</li><li>{["quarterly","semiannual","annual","premium"].includes(currentPlan.code) ? "✓" : "—"} Personalización</li></ul></div>{planMessage && <div className={`plan-change-message ${planMessage.kind}`}>{planMessage.text}</div>}<div className="self-serve-plans">{availablePlans.map(plan=><article key={plan.code} className={currentPlan.code === plan.code ? "current" : ""}><small>{plan.duration.toUpperCase()}</small><h3>{plan.name}</h3><div><b>{plan.price}</b><span>{plan.tax}</span></div><p>Hasta {plan.limit} participantes</p><button disabled={currentPlan.code === plan.code || activatingPlan !== null} onClick={()=>activatePlan(plan.code)}>{currentPlan.code === plan.code ? "✓ PLAN ACTUAL" : activatingPlan === plan.code ? "ACTIVANDO…" : "ACTIVAR SIN PAGO →"}</button></article>)}</div></section>}

      {activeTab === "settings" && <section className="tab-screen"><div className="tab-toolbar"><div><small>CUENTA Y ORGANIZACIÓN</small><h2>Configuración</h2><p>Consulta la información asociada al acceso empresarial.</p></div></div><div className="settings-grid"><article><small>PERFIL</small><h3>{props.fullName}</h3><span>{props.email}</span><b>{props.role === "owner" ? "Propietario de la cuenta" : "Administrador"}</b><button disabled>EDITAR PERFIL — PRÓXIMAMENTE</button></article><article><small>ORGANIZACIÓN</small><h3>{props.organizationName}</h3><span>Plan {currentPlan.name}</span><b>Datos aislados y protegidos por empresa</b><button disabled>PERSONALIZAR MARCA — PRÓXIMAMENTE</button></article><article><small>SEGURIDAD</small><h3>Acceso protegido</h3><span>Autenticación administrada por Supabase</span><b>Sesión y políticas de acceso activas</b><form action={logout}><button>CERRAR TODAS MIS SESIONES</button></form></article></div></section>}

      {inviteOpen && <div className="invite-modal" role="dialog" aria-modal="true" aria-label="Invitar participantes"><button className="modal-close" onClick={()=>setInviteOpen(false)}>×</button><p>INVITAR PARTICIPANTES</p><h2>Comparte tu próxima experiencia.</h2><span>Cuando actives un juego, aquí aparecerá un enlace único para que tu equipo se registre y participe.</span><div>cumplimiento.co/juego/<b>próxima-sesión</b></div><button onClick={()=>{navigator.clipboard?.writeText("http://localhost:3000/juego"); setInviteOpen(false)}}>COPIAR ENLACE DEL JUEGO →</button></div>}
      <footer>La información de tu organización está protegida y aislada mediante políticas de acceso por empresa.</footer>
    </section>
  </main>;
}

function ExperiencePanel({ compact = false, planCode }: { compact?: boolean; planCode: string }) {
  return <section className={`dashboard-panel experience-panel ${compact ? "compact" : ""}`}><header><div><small>CONTENIDO</small><h2>Experiencias disponibles</h2></div><a href="/juego">Abrir biblioteca →</a></header><div className="experience-row"><span>01</span><div><b>El Reto Internacional</b><small>GAFI · ONU · OCDE · 15 niveles</small></div><i>ACTIVO</i><a href="/juego">INICIAR →</a></div><div className="experience-row locked"><span>02</span><div><b>Reto personalizado</b><small>Contenido adaptado a tu organización</small></div><i>{planCode === "free" || planCode === "monthly" ? "MEJORAR PLAN" : "DISPONIBLE"}</i><a href="/#contacto">CONFIGURAR →</a></div></section>;
}

function PlanPanel(props: DashboardProps & { expiry: string }) {
  return <section className="dashboard-panel plan-panel"><header><div><small>VIGENCIA</small><h2>Plan {props.plan}</h2></div><b className={props.isActive ? "status-active" : "status-expired"}>{props.isActive ? "● ACTIVO" : "● INACTIVO"}</b></header><div className="plan-detail"><span><small>PARTICIPANTES</small><b>{props.participantLimit}</b></span><span><small>VENCE</small><b>{props.expiry}</b></span></div><a href="/#precios">ADMINISTRAR PLAN →</a></section>;
}

function EmptyParticipants({ onInvite, embedded = false }: { onInvite: () => void; embedded?: boolean }) {
  return <section className={`dashboard-panel empty-participants ${embedded ? "embedded" : ""}`}><header><div><small>EQUIPO</small><h2>Participantes recientes</h2></div><button onClick={onInvite}>＋ INVITAR PARTICIPANTES</button></header><div><span>◎</span><h3>Aún no hay participantes</h3><p>Invita a tu equipo o comparte el enlace de una experiencia para comenzar.</p><button onClick={onInvite}>PREPARAR INVITACIÓN →</button></div></section>;
}
