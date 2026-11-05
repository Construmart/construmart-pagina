// Portero de Construmart: revisa usuario y clave de los clientes de mayoreo
// y le entrega a cada uno solo sus precios. Todo lo demás (la página, fotos)
// lo sirve Cloudflare directo desde la carpeta.
import DATOS from "./privado/clientes.json";

const COOKIE = "cm_cliente";
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

// La sesión guarda: usuario . vencimiento . huella de la clave (si cambia la clave, la sesión deja de servir)
async function crearSesion(usuario, c, env) {
  const vence = Date.now() + DIAS * 864e5;
  const base = `${usuario}.${vence}.${c.h.slice(0, 12)}`;
  return `${base}.${await firmar(base, secretoDe(env))}`;
}

async function leerSesion(request, env) {
  const ck = request.headers.get("cookie") || "";
  const m = ck.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const partes = decodeURIComponent(m[1]).split(".");
  if (partes.length !== 4) return null;
  const [usuario, vence, huella, firma] = partes;
  const base = `${usuario}.${vence}.${huella}`;
  if (!igual(firma, await firmar(base, secretoDe(env)))) return null;
  if (Number(vence) < Date.now()) return null;
  const c = DATOS.clientes[usuario];
  if (!c || c.h.slice(0, 12) !== huella) return null;
  return { usuario, c };
}

const cookie = (valor, maxAge) =>
  `${COOKIE}=${encodeURIComponent(valor)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

const publico = (usuario, c) => ({ usuario, nombre: c.n, precios: c.p || {}, nota: DATOS.nota || "" });

async function api(request, env, url) {
  const ruta = url.pathname;
  if (ruta === "/api/sesion" && request.method === "GET") {
    const s = await leerSesion(request, env);
    return json({ ok: true, cliente: s ? publico(s.usuario, s.c) : null });
  }
  if (ruta === "/api/entrar" && request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) {}
    const usuario = normUsuario(body.usuario);
    const clave = String(body.clave || "");
    const c = DATOS.clientes[usuario];
    // Siempre se calcula un hash, exista o no el usuario, para no dar pistas por el tiempo de respuesta
    const h = await hashClave(clave, c ? c.s : "sin-usuario", DATOS.iter || 100000);
    if (!c || !igual(h, c.h)) {
      await new Promise((r) => setTimeout(r, 600));
      return json({ ok: false, error: "datos" }, 401);
    }
    const sesion = await crearSesion(usuario, c, env);
    return json({ ok: true, cliente: publico(usuario, c) }, 200, { "set-cookie": cookie(sesion, DIAS * 86400) });
  }
  if (ruta === "/api/salir" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
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
