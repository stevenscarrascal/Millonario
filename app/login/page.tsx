import { login, signup } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; mode?: string }> }) {
  const query = await searchParams;
  const signingUp = query.mode === "signup";
  return <main className="auth-page">
    <a href="/" className="auth-brand"><span>C</span><div><b>CUMPLIMIENTO</b><small>PLATAFORMA EMPRESARIAL</small></div></a>
    <section className="auth-story"><div><p>EL COMPLIANCE QUE SÍ SE RECUERDA</p><h1>Tu cultura de integridad, en un solo lugar.</h1><span>Administra participantes, activa experiencias, consulta resultados y demuestra el avance de tu organización.</span><ul><li>◆ Experiencias ilimitadas según tu plan</li><li>◆ Ranking, certificados y reportes</li><li>◆ Contenido internacional actualizado</li></ul></div></section>
    <section className="auth-card">
      <a href="/" className="auth-back">← VOLVER AL INICIO</a>
      <p>{signingUp ? "CREAR CUENTA FREE" : "ACCESO EMPRESARIAL"}</p>
      <h2>{signingUp ? "Empieza tu experiencia." : "Bienvenido de nuevo."}</h2>
      <span>{signingUp ? "Hasta 10 usuarios, sin tarjeta de crédito." : "Ingresa con el correo asociado a tu plan."}</span>
      {query.error && <div className="auth-alert error">{query.error}</div>}
      {query.message && <div className="auth-alert success">{query.message}</div>}
      <form>
        {signingUp && <><label>Nombre completo<input name="fullName" required autoComplete="name" placeholder="Tu nombre"/></label><label>Empresa<input name="company" required autoComplete="organization" placeholder="Organización"/></label></>}
        <label>Correo electrónico<input name="email" required type="email" autoComplete="email" placeholder="nombre@empresa.com"/></label>
        <label>Contraseña<input name="password" required type="password" minLength={8} autoComplete={signingUp ? "new-password" : "current-password"} placeholder="Mínimo 8 caracteres"/></label>
        <button formAction={signingUp ? signup : login}>{signingUp ? "CREAR CUENTA GRATIS →" : "INGRESAR AL PANEL →"}</button>
      </form>
      <div className="auth-switch">{signingUp ? <>¿Ya tienes cuenta? <a href="/login">Ingresar</a></> : <>¿Quieres probar la plataforma? <a href="/login?mode=signup">Crear cuenta Free</a></>}</div>
      <small>Acceso protegido por Supabase Auth. Nunca almacenamos tu contraseña directamente.</small>
    </section>
  </main>;
}
