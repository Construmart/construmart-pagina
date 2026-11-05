// Portero de Construmart.
// 1) Clientes de mayoreo: revisa usuario y clave y entrega a cada uno solo sus precios.
// 2) Bandeja de cotizaciones: guarda las cotizaciones que mandan los clientes y deja que
//    el dueño las conteste con su clave. El cliente ve la respuesta en "Mis cotizaciones".
// Todo lo demás (la página, fotos) lo sirve Cloudflare directo desde la carpeta.
import { DurableObject } from "cloudflare:workers";
import DATOS from "./privado/clientes.json";

const COOKIE = "cm_cliente";
const COOKIE_ADMIN = "cm_dueno";
const DIAS = 30;
const enc = new TextEncoder();

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

async function hashClave(clave, sal, iter) {
  const key = await crypto.subtle.importKey("raw", enc.encode(clave), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(sal), iterations: iter }, key, 256);
  return hex(bits);
}

function igual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function firmar(texto, secreto) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(texto)));
}

const secretoDe = (env) => (env && env.SESSION_SECRET) || DATOS.secreto;
const normUsuario = (u) => String(u || "").trim().toLowerCase();
const leerCookie = (request, nombre) => {
  const ck = request.headers.get("cookie") || "";
  const m = ck.match(new RegExp(`(?:^|;\\s*)${nombre}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
};
const cookie = (nombre, valor, maxAge) =>
  `${nombre}=${encodeURIComponent(valor)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const espera = () => new Promise((r) => setTimeout(r, 600));

// ===== Sesiones =====
// La sesión guarda: quién . vencimiento . huella de la clave (si cambia la clave, la sesión deja de servir)
async function crearSesion(quien, huellaClave, env, dias = DIAS) {
  const vence = Date.now() + dias * 864e5;
  const base = `${quien}.${vence}.${huellaClave.slice(0, 12)}`;
  return `${base}.${await firmar(base, secretoDe(env))}`;
}
async function validarSesion(valor, env) {
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 4) return null;
  const [quien, vence, huella, firma] = partes;
  const base = `${quien}.${vence}.${huella}`;
  if (!igual(firma, await firmar(base, secretoDe(env)))) return null;
  if (Number(vence) < Date.now()) return null;
  return { quien, huella };
}
async function sesionCliente(request, env) {
  const s = await validarSesion(leerCookie(request, COOKIE), env);
  if (!s) return null;
  const c = DATOS.clientes[s.quien];
  if (!c || c.h.slice(0, 12) !== s.huella) return null;
  return { usuario: s.quien, c };
}
async function sesionDueno(request, env) {
  const a = DATOS.admin;
  if (!a) return false;
  const s = await validarSesion(leerCookie(request, COOKIE_ADMIN), env);
  return !!(s && s.quien === "dueno" && a.h.slice(0, 12) === s.huella);
}

const publico = (usuario, c) => ({ usuario, nombre: c.n, precios: c.p || {}, nota: DATOS.nota || "" });

// ===== Bandeja de cotizaciones (se guarda en Cloudflare) =====
const txt = (v, max) => String(v ?? "").slice(0, max);
const nuevoId = () => Date.now().toString(36).padStart(9, "0") + "-" + hex(crypto.getRandomValues(new Uint8Array(4)));
const nuevoToken = () => hex(crypto.getRandomValues(new Uint8Array(16)));
const bandeja = (env) => env.BANDEJA.get(env.BANDEJA.idFromName("principal"));
const resumen = (q) => ({
  id: q.id, folio: q.folio, fecha: q.fecha, nombre: q.nombre, telefono: q.telefono, sucursal: q.sucursal,
  recoge: q.recoge, cliente: q.cliente ? q.cliente.nombre : "", productos: q.items.length, estado: q.estado,
  total: q.respuesta ? q.respuesta.total : null, respondida: q.respuesta ? q.respuesta.fecha : null,
});

export class Bandeja extends DurableObject {
  async guardar(q) { await this.ctx.storage.put("q:" + q.id, q); return true; }
  async obtener(id) { return (await this.ctx.storage.get("q:" + id)) || null; }
  async listar(limite) {
    const m = await this.ctx.storage.list({ prefix: "q:", reverse: true, limit: limite });
    return [...m.values()].map(resumen);
  }
  async actualizar(id, cambios) {
    const q = await this.ctx.storage.get("q:" + id);
    if (!q) return null;
    Object.assign(q, cambios);
    await this.ctx.storage.put("q:" + id, q);
    return q;
  }
  async borrar(id) { await this.ctx.storage.delete("q:" + id); return true; }
  async porTokens(pares) {
    const out = [];
    for (const [id, tok] of pares) {
      const q = await this.ctx.storage.get("q:" + id);
      if (q && igual(String(tok), q.token)) out.push({ id, estado: q.estado, respuesta: q.respuesta || null });
    }
    return out;
  }
}

async function recibirCotizacion(request, env) {
  const largo = Number(request.headers.get("content-length") || 0);
  if (largo > 60000) return json({ ok: false, error: "muy_grande" }, 413);
  let b = {};
  try { b = await request.json(); } catch (e) { return json({ ok: false, error: "datos" }, 400); }
  const items = Array.isArray(b.items) ? b.items.slice(0, 150) : [];
  if (!items.length) return json({ ok: false, error: "vacia" }, 400);
  const s = await sesionCliente(request, env);
  const precios = s ? s.c.p || {} : {};
  const q = {
    id: nuevoId(), token: nuevoToken(), fecha: Date.now(), estado: "pendiente",
    folio: txt(b.folio, 30), nombre: txt(b.nombre, 80), telefono: txt(b.telefono, 30),
    sucursal: txt(b.sucursal, 60), recoge: txt(b.recoge, 80), notas: txt(b.notas, 1000),
    cliente: s ? { usuario: s.usuario, nombre: s.c.n } : null,
    items: items.map((it) => {
      const id = txt(it.id, 40), v = txt(it.v, 80);
      const pc = !it.custom && precios[`${id}|${v}`];
      return {
        id, v, n: txt(it.n, 160), b: txt(it.b, 40), q: Math.max(1, Math.min(100000, Number(it.q) || 1)),
        u: txt(it.u, 30), cod: txt(it.cod, 40), custom: !!it.custom, ...(pc ? { pc } : {}),
      };
    }),
  };
  await bandeja(env).guardar(q);
  return json({ ok: true, id: q.id, token: q.token });
}

async function api(request, env, url) {
  const ruta = url.pathname, metodo = request.method;

  // --- Clientes de mayoreo ---
  if (ruta === "/api/sesion" && metodo === "GET") {
    const s = await sesionCliente(request, env);
    return json({ ok: true, cliente: s ? publico(s.usuario, s.c) : null, bandeja: true });
  }
  if (ruta === "/api/entrar" && metodo === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) {}
    const usuario = normUsuario(body.usuario);
    const clave = String(body.clave || "");
    const c = DATOS.clientes[usuario];
    // Siempre se calcula un hash, exista o no el usuario, para no dar pistas por el tiempo de respuesta
    const h = await hashClave(clave, c ? c.s : "sin-usuario", DATOS.iter || 100000);
    if (!c || !igual(h, c.h)) { await espera(); return json({ ok: false, error: "datos" }, 401); }
    const sesion = await crearSesion(usuario, c.h, env);
    return json({ ok: true, cliente: publico(usuario, c) }, 200, { "set-cookie": cookie(COOKIE, sesion, DIAS * 86400) });
  }
  if (ruta === "/api/salir" && metodo === "POST") {
    return json({ ok: true }, 200, { "set-cookie": cookie(COOKIE, "", 0) });
  }

  // --- Cotizaciones que mandan los clientes ---
  if (ruta === "/api/cotizaciones" && metodo === "POST") return recibirCotizacion(request, env);
  if (ruta === "/api/mis-cotizaciones" && metodo === "POST") {
    let b = {};
    try { b = await request.json(); } catch (e) {}
    const pares = (Array.isArray(b.pares) ? b.pares : []).filter((p) => Array.isArray(p) && p.length === 2).slice(0, 25);
    return json({ ok: true, cotizaciones: await bandeja(env).porTokens(pares) });
  }

  // --- Dueño: bandeja ---
  if (ruta === "/api/dueno/entrar" && metodo === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) {}
    const a = DATOS.admin;
    const h = await hashClave(String(body.clave || ""), a ? a.s : "sin-dueno", DATOS.iter || 100000);
    if (!a || !igual(h, a.h)) { await espera(); return json({ ok: false, error: "datos" }, 401); }
    const sesion = await crearSesion("dueno", a.h, env, 60);
    return json({ ok: true }, 200, { "set-cookie": cookie(COOKIE_ADMIN, sesion, 60 * 86400) });
  }
  if (ruta === "/api/dueno/salir" && metodo === "POST") {
    return json({ ok: true }, 200, { "set-cookie": cookie(COOKIE_ADMIN, "", 0) });
  }
  if (ruta.startsWith("/api/dueno/")) {
    if (!(await sesionDueno(request, env))) return json({ ok: false, error: "sin_sesion" }, 401);
    if (ruta === "/api/dueno/sesion") return json({ ok: true });
    if (ruta === "/api/dueno/cotizaciones" && metodo === "GET") {
      return json({ ok: true, cotizaciones: await bandeja(env).listar(300) });
    }
    const m = ruta.match(/^\/api\/dueno\/cotizaciones\/([a-z0-9-]{6,40})$/);
    if (m) {
      const id = m[1];
      if (metodo === "GET") {
        const q = await bandeja(env).obtener(id);
        if (!q) return json({ ok: false, error: "no_encontrada" }, 404);
        const { token, ...sinToken } = q;
        return json({ ok: true, cotizacion: sinToken });
      }
      if (metodo === "POST") {
        let b = {};
        try { b = await request.json(); } catch (e) {}
        if (b.accion === "borrar") { await bandeja(env).borrar(id); return json({ ok: true }); }
        if (b.accion === "estado") {
          const estado = ["pendiente", "respondida", "archivada"].includes(b.estado) ? b.estado : "pendiente";
          const q = await bandeja(env).actualizar(id, { estado });
          return q ? json({ ok: true }) : json({ ok: false, error: "no_encontrada" }, 404);
        }
        if (b.accion === "responder") {
          const r = b.respuesta || {};
          const lineas = (Array.isArray(r.lineas) ? r.lineas : []).slice(0, 150).map((l) => ({
            precio: Number(l && l.precio) > 0 ? Math.round(Number(l.precio) * 100) / 100 : null,
            existe: ["si", "no", "parcial"].includes(l && l.existe) ? l.existe : "si",
          }));
          const actual = await bandeja(env).obtener(id);
          if (!actual) return json({ ok: false, error: "no_encontrada" }, 404);
          // El total se calcula aquí con las cantidades guardadas; lo que no hay no se cobra
          const total = Math.round(lineas.reduce((a, l, i) => a + (l.precio && l.existe !== "no" && actual.items[i] ? l.precio * actual.items[i].q : 0), 0) * 100) / 100;
          const respuesta = { fecha: Date.now(), lineas, notas: txt(r.notas, 1000), total };
          const q = await bandeja(env).actualizar(id, { estado: "respondida", respuesta });
          return q ? json({ ok: true, respuesta }) : json({ ok: false, error: "no_encontrada" }, 404);
        }
        return json({ ok: false, error: "accion" }, 400);
      }
    }
  }
  return json({ ok: false, error: "no_encontrado" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return api(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
