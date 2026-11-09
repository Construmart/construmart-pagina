// Portero de Construmart.
// 1) Clientes de mayoreo: revisa usuario y clave y entrega a cada uno solo sus precios.
//    El dueño los da de alta, les cambia la clave y les pone precios desde su panel.
// 2) Bandeja de cotizaciones: guarda las cotizaciones que mandan los clientes y deja que
//    el dueño las conteste con su clave. El cliente ve la respuesta en "Mis cotizaciones".
// 3) Productos: la página los lee de aquí y el dueño los edita desde su panel (con fotos).
// Todo lo demás (la página, fotos) lo sirve Cloudflare directo desde la carpeta.
import { DurableObject } from "cloudflare:workers";
import DATOS from "./privado/clientes.json";

const COOKIE = "cm_cliente";
const NIVELES = ["publico", "medio", "mayoreo", "ferreteria"];
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
// Los clientes viven en la base de la tienda; la primera vez se cargan los de privado/clientes.json
async function buscarCliente(env, usuario) {
  const stub = bandeja(env);
  let c = await stub.cliente(usuario);
  if (!c && (await stub.sembrarClientes(DATOS.clientes))) c = await stub.cliente(usuario);
  if (!c || c.activo === false) return null;
  return c;
}
async function sesionCliente(request, env) {
  const s = await validarSesion(leerCookie(request, COOKIE), env);
  if (!s) return null;
  const c = await buscarCliente(env, s.quien);
  if (!c || c.h.slice(0, 12) !== s.huella) return null;
  return { usuario: s.quien, c };
}
async function sesionDueno(request, env) {
  const a = DATOS.admin;
  if (!a) return false;
  const s = await validarSesion(leerCookie(request, COOKIE_ADMIN), env);
  return !!(s && s.quien === "dueno" && a.h.slice(0, 12) === s.huella);
}

const CATS_DEF = ["construccion", "metal", "mallas"];
const publico = async (env, usuario, c) => ({ usuario, nombre: c.n, cats: Array.isArray(c.cats) ? c.cats : CATS_DEF, precios: await bandeja(env).preciosDe(c.nivel, c.p), nota: DATOS.nota || "" });

// ===== Bandeja de cotizaciones (se guarda en Cloudflare) =====
const txt = (v, max) => String(v ?? "").slice(0, max);
const nuevoId = () => Date.now().toString(36).padStart(9, "0") + "-" + hex(crypto.getRandomValues(new Uint8Array(4)));
const nuevoToken = () => hex(crypto.getRandomValues(new Uint8Array(16)));
const bandeja = (env) => env.BANDEJA.get(env.BANDEJA.idFromName("principal"));
const resumen = (q) => ({
  id: q.id, folio: q.folio, fecha: q.fecha, nombre: q.nombre, telefono: q.telefono, sucursal: q.sucursal,
  recoge: q.recoge, factura: !!q.factura, entrega: q.entrega || "recoger", cliente: q.cliente ? q.cliente.nombre : "", productos: q.items.length, estado: q.estado,
  total: q.respuesta ? q.respuesta.total : null, respondida: q.respuesta ? q.respuesta.fecha : null, confirmada: q.confirmada ? q.confirmada.fecha : null,
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

  // ===== Clientes de mayoreo (el dueño los da de alta desde su panel) =====
  async sembrarClientes(base) {
    if (await this.ctx.storage.get("cv")) return false;
    const lote = {};
    for (const [u, c] of Object.entries(base || {})) lote["c:" + u] = { n: c.n, persona: "", wa: "", activo: true, s: c.s, h: c.h, p: c.p || {}, alta: Date.now() };
    if (Object.keys(lote).length) await this.ctx.storage.put(lote);
    await this.ctx.storage.put("cv", { t: Date.now() });
    return true;
  }
  async cliente(u) { return (await this.ctx.storage.get("c:" + u)) || null; }
  async clientes() {
    const m = await this.ctx.storage.list({ prefix: "c:" });
    return [...m.entries()].map(([k, c]) => ({ usuario: k.slice(2), nombre: c.n, persona: c.persona || "", wa: c.wa || "", activo: c.activo !== false, nivel: c.nivel || "", cats: Array.isArray(c.cats) ? c.cats : CATS_DEF, precios: c.p || {}, alta: c.alta || 0 }));
  }
  async guardarCliente(u, datos) {
    const prev = (await this.ctx.storage.get("c:" + u)) || { alta: Date.now() };
    const c = { ...prev, ...datos };
    await this.ctx.storage.put("c:" + u, c);
    return c;
  }
  async borrarCliente(u) { await this.ctx.storage.delete("c:" + u); return true; }

  // ===== Listas de precios (Público, Medio mayoreo, Mayoreo, Ferretería). Privadas: solo dueño y clientes con cuenta =====
  async listasTodas() {
    if (this._lp) return this._lp;
    const m = await this.ctx.storage.list({ prefix: "lp:" });
    const out = {};
    for (const [k, v] of m) out[k.slice(3)] = v;
    this._lp = out;
    return out;
  }
  async guardarListas(cambios) {
    const todas = await this.listasTodas();
    const lote = {}, borrar = [];
    for (const [id, porMedida] of Object.entries(cambios)) {
      const prev = { ...(todas[id] || {}) };
      for (const [v, arr] of Object.entries(porMedida || {})) {
        if (!arr || !arr.some((x) => x > 0)) delete prev[v]; else prev[v] = arr;
      }
      if (Object.keys(prev).length) { lote["lp:" + id] = prev; todas[id] = prev; } else { borrar.push("lp:" + id); delete todas[id]; }
    }
    if (Object.keys(lote).length) await this.ctx.storage.put(lote);
    if (borrar.length) await this.ctx.storage.delete(borrar);
    return true;
  }
  // Precios que ve un cliente: los de su nivel y, encima, sus precios especiales
  async preciosDe(nivel, especiales) {
    const i = NIVELES.indexOf(nivel);
    const out = {};
    if (i >= 0) {
      const todas = await this.listasTodas();
      for (const [id, pm] of Object.entries(todas)) for (const [v, arr] of Object.entries(pm)) if (arr[i] > 0) out[id + "|" + v] = arr[i];
    }
    return Object.assign(out, especiales || {});
  }

  // ===== Categorías =====
  async categorias() { return (await this.ctx.storage.get("cats")) || null; }
  async guardarCategorias(lista) { await this.ctx.storage.put("cats", lista); return true; }

  // ===== Banners del inicio (el dueño los cambia desde su panel) =====
  async banners() { return (await this.ctx.storage.get("banners")) || null; }
  async guardarBanners(lista) { await this.ctx.storage.put("banners", lista); return true; }

  // ===== Productos de la página (el dueño los edita desde su panel) =====
  sqlFotos() {
    if (!this._sql) {
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS fotos (id TEXT PRIMARY KEY, tipo TEXT, datos BLOB, fecha INTEGER)");
      this._sql = true;
    }
    return this.ctx.storage.sql;
  }
  async productosTodos() {
    if (this._cache) return this._cache;
    const v = await this.ctx.storage.get("pv");
    if (!v) return { vacio: true };
    const m = await this.ctx.storage.list({ prefix: "p:" });
    const lista = [...m.values()].sort((a, b) => a.ord - b.ord || String(a.p.id).localeCompare(b.p.id)).map((x) => x.p);
    this._cache = { v: v.v, actualizado: v.t, productos: lista, texto: JSON.stringify({ ok: true, v: v.v, actualizado: v.t, productos: lista }) };
    return this._cache;
  }
  async marcar() {
    const v = (await this.ctx.storage.get("pv")) || { v: 0 };
    const nv = { v: v.v + 1, t: Date.now() };
    await this.ctx.storage.put("pv", nv);
    this._cache = null;
    return nv;
  }
  async sembrar(lista) {
    if (await this.ctx.storage.get("pv")) return false;
    const ent = {};
    lista.forEach((p, i) => { if (p && p.id) ent["p:" + p.id] = { ord: (i + 1) * 10, p }; });
    const claves = Object.keys(ent);
    for (let i = 0; i < claves.length; i += 100) {
      const lote = {};
      claves.slice(i, i + 100).forEach((k) => (lote[k] = ent[k]));
      await this.ctx.storage.put(lote);
    }
    await this.ctx.storage.put("pv", { v: 1, t: Date.now() });
    this._cache = null;
    return true;
  }
  async guardarProducto(p, nuevo) {
    const k = "p:" + p.id;
    const prev = await this.ctx.storage.get(k);
    let ord;
    if (prev) ord = prev.ord;
    else {
      // Va al final de su categoría
      const m = await this.ctx.storage.list({ prefix: "p:" });
      const xs = [...m.values()].sort((a, b) => a.ord - b.ord);
      const mismos = xs.filter((x) => x.p.cat === p.cat);
      const ult = mismos.length ? mismos[mismos.length - 1] : xs[xs.length - 1];
      const sig = ult ? xs[xs.indexOf(ult) + 1] : null;
      ord = ult ? (sig ? (ult.ord + sig.ord) / 2 : ult.ord + 10) : 10;
    }
    await this.ctx.storage.put(k, { ord, p });
    await this.marcar();
    return { ok: true, nuevo: !prev };
  }
  async borrarProducto(id) {
    await this.ctx.storage.delete("p:" + id);
    await this.marcar();
    return true;
  }
  async guardarFoto(id, tipo, datos) {
    this.sqlFotos().exec("INSERT OR REPLACE INTO fotos (id, tipo, datos, fecha) VALUES (?, ?, ?, ?)", id, tipo, datos, Date.now());
    return true;
  }
  async foto(id) {
    const r = this.sqlFotos().exec("SELECT tipo, datos FROM fotos WHERE id = ?", id).toArray();
    return r.length ? { tipo: r[0].tipo, datos: r[0].datos } : null;
  }
  async deCliente(usuario) {
    const m = await this.ctx.storage.list({ prefix: "q:", reverse: true, limit: 400 });
    return [...m.values()].filter((q) => q.cliente && q.cliente.usuario === usuario).slice(0, 40)
      .map((q) => ({ id: q.id, folio: q.folio, fecha: q.fecha, estado: q.estado, sucursal: q.sucursal, entrega: q.entrega, items: q.items.map((it) => ({ id: it.custom ? "" : it.id, n: it.n, v: it.v, q: it.q, u: it.u, custom: !!it.custom })), respuesta: q.respuesta || null, confirmada: q.confirmada || null }));
  }
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
  const precios = s ? await bandeja(env).preciosDe(s.c.nivel, s.c.p) : {};
  const q = {
    id: nuevoId(), token: nuevoToken(), fecha: Date.now(), estado: "pendiente",
    folio: txt(b.folio, 30), nombre: txt(b.nombre, 80), telefono: txt(b.telefono, 30),
    sucursal: txt(b.sucursal, 60), recoge: txt(b.recoge, 80), notas: txt(b.notas, 1000), factura: !!b.factura,
    entrega: ["envio", "recoger", "cotizar"].includes(b.entrega) ? b.entrega : "recoger", direccion: txt(b.direccion, 400),
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


// ===== Productos =====
// Categorías de base; el dueño puede agregar más (ej. Tinacos), renombrarlas y ordenarlas desde su panel
const CATS_BASE = [
  { slug: "herramientas-manuales", name: "Herramientas manuales", blurb: "Martillos, pinzas, desarmadores, llaves y medición." },
  { slug: "herramientas-electricas", name: "Herramientas eléctricas", blurb: "Taladros, esmeriladoras, sierras y lijadoras." },
  { slug: "ferreteria", name: "Ferretería", blurb: "Candados, bisagras, tornillería, taquetes y brocas." },
  { slug: "material-electrico", name: "Material eléctrico", blurb: "Cable, contactos, iluminación y extensiones." },
  { slug: "plomeria", name: "Plomería", blurb: "Llaves, válvulas, conexiones y sellado." },
  { slug: "pintura", name: "Pintura", blurb: "Rodillos, brochas, espátulas, lijas y aerosoles." },
  { slug: "construccion", name: "Construcción", blurb: "Herramienta de albañilería y materiales para obra." },
  { slug: "metal", name: "Metal", blurb: "Acero para construcción: armex, varilla, alambre y clavos." },
  { slug: "mallas", name: "Mallas", blurb: "Malla electrosoldada, ciclónica, de gallinero, sombra y mosquitera." },
  { slug: "impermeabilizantes", name: "Impermeabilizantes y selladores", blurb: "Impermeabilizantes, selladores y membranas para techos y muros." },
  { slug: "jardineria", name: "Jardinería", blurb: "Riego, poda y herramienta de jardín." },
  { slug: "seguridad-industrial", name: "Seguridad industrial", blurb: "Equipo de protección personal." },
  { slug: "limpieza", name: "Limpieza", blurb: "Escobas, trapeadores, cubetas y jaladores." },
];
const ICONOS_OK = ["herramientas-manuales","herramientas-electricas","ferreteria","material-electrico","plomeria","pintura","construccion","metal","mallas","impermeabilizantes","jardineria","seguridad-industrial","limpieza","tinaco","bano","cerradura","escalera","caja","puerta","lamina","estrella"];
async function catsOk(env) { const c = await bandeja(env).categorias(); return (c || CATS_BASE).map((x) => x.slug); }
const ICONOS = { plomeria: "fitting", pintura: "roller", limpieza: "bucket", "material-electrico": "spool" };
const lista = (v, n, max) => (Array.isArray(v) ? v.slice(0, n).map((x) => txt(x, max)) : null);
const rutaFoto = (v) => { const t = txt(v, 200); return /^(fotos\/[\w./-]+|\/api\/foto\/[a-z0-9]{8,40})$/i.test(t) ? t : ""; };
function limpiarProducto(b, previo, CATS_OK) {
  const id = txt(b.id, 20);
  if (!/^[a-z0-9]{1,20}$/i.test(id)) return null;
  const cat = CATS_OK.includes(b.cat) ? b.cat : null;
  if (!cat) return null;
  const nombre = txt(b.name, 160).trim();
  if (!nombre) return null;
  // Se conservan los datos de diseño que no se editan aquí (icono, color, grupo)
  const p = { id, cat, brand: txt(b.brand, 40).trim() || "Material", name: nombre };
  const base = previo || {};
  for (const k of ["icon", "label", "color", "group", "hidden"]) if (base[k] !== undefined) p[k] = base[k];
  if (!p.icon) { p.icon = ICONOS[cat] || "bag"; if (p.icon === "bag") { p.label = p.brand.toUpperCase().slice(0, 10); p.color = "#8b8f94"; } }
  const desc = txt(b.desc, 3000).trim(); if (desc) p.desc = desc;
  const vars = lista(b.variants, 80, 80);
  if (vars && vars.length > 1) {
    p.variants = vars;
    const codes = lista(b.codes, 80, 60); if (codes && codes.some((c) => c)) p.codes = vars.map((_, i) => codes[i] || "");
    const fotos = Array.isArray(b.photos) ? vars.map((_, i) => rutaFoto(b.photos[i])) : null; if (fotos && fotos.some((f) => f)) p.photos = fotos;
  } else {
    const spec = txt(b.spec, 80).trim(); if (spec) p.spec = spec;
    const code = txt(b.code, 60).trim(); if (code) p.code = code;
  }
  p.unit = txt(b.unit, 30).trim() || "pieza";
  const elige = txt(b.elige, 120).trim(); if (elige) p.elige = elige;
  const sub = txt(b.sub, 60).trim(); if (sub) p.sub = sub;
  const foto = rutaFoto(b.photo); if (foto) p.photo = foto;
  if (b.rapido) p.rapido = true;
  return p;
}
async function productosPublicos(request, env, url) {
  const stub = bandeja(env);
  let r = await stub.productosTodos();
  if (r.vacio) {
    // Primera vez: se carga la lista que viene con la página
    const res = await env.ASSETS.fetch(new Request(url.origin + "/productos.json"));
    if (!res.ok) return json({ ok: false, error: "sin_productos" }, 503);
    await stub.sembrar(await res.json());
    r = await stub.productosTodos();
  }
  const etag = `"p${r.v}"`;
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag, "cache-control": "no-cache" } });
  return new Response(r.texto, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache", etag } });
}

async function api(request, env, url) {
  const ruta = url.pathname, metodo = request.method;

  // --- Clientes de mayoreo ---
  if (ruta === "/api/sesion" && metodo === "GET") {
    const s = await sesionCliente(request, env);
    return json({ ok: true, cliente: s ? await publico(env, s.usuario, s.c) : null, bandeja: true, dueno: await sesionDueno(request, env) });
  }
  if (ruta === "/api/entrar" && metodo === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) {}
    const usuario = normUsuario(body.usuario);
    const clave = String(body.clave || "");
    const c = usuario ? await buscarCliente(env, usuario) : null;
    // Siempre se calcula un hash, exista o no el usuario, para no dar pistas por el tiempo de respuesta
    const h = await hashClave(clave, c ? c.s : "sin-usuario", DATOS.iter || 100000);
    if (!c || !igual(h, c.h)) { await espera(); return json({ ok: false, error: "datos" }, 401); }
    const sesion = await crearSesion(usuario, c.h, env);
    return json({ ok: true, cliente: await publico(env, usuario, c) }, 200, { "set-cookie": cookie(COOKIE, sesion, DIAS * 86400) });
  }
  if (ruta === "/api/salir" && metodo === "POST") {
    return json({ ok: true }, 200, { "set-cookie": cookie(COOKIE, "", 0) });
  }

  // --- Categorías (las lee la página) ---
  if (ruta === "/api/categorias" && metodo === "GET") {
    const c = await bandeja(env).categorias();
    return new Response(JSON.stringify({ ok: true, categorias: c || CATS_BASE, propias: !!c }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" } });
  }
  // --- Banners del inicio (los lee la página) ---
  if (ruta === "/api/banners" && metodo === "GET") {
    const b = await bandeja(env).banners();
    return new Response(JSON.stringify({ ok: true, banners: b }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" } });
  }
  // --- Productos (los lee la página) ---
  if (ruta === "/api/productos" && metodo === "GET") return productosPublicos(request, env, url);
  const mf = ruta.match(/^\/api\/foto\/([a-z0-9]{8,40})$/);
  if (mf && metodo === "GET") {
    const f = await bandeja(env).foto(mf[1]);
    if (!f) return new Response("No encontrada", { status: 404 });
    return new Response(f.datos, { headers: { "content-type": f.tipo, "cache-control": "public, max-age=31536000, immutable" } });
  }

  // --- Clientes con cuenta: sus cotizaciones y confirmar pedido ---
  if (ruta === "/api/mis-pedidos" && metodo === "GET") {
    const s = await sesionCliente(request, env);
    if (!s) return json({ ok: false, error: "sin_sesion" }, 401);
    return json({ ok: true, cotizaciones: await bandeja(env).deCliente(s.usuario) });
  }
  if (ruta === "/api/mis-pedidos/confirmar" && metodo === "POST") {
    const s = await sesionCliente(request, env);
    if (!s) return json({ ok: false, error: "sin_sesion" }, 401);
    let b = {};
    try { b = await request.json(); } catch (e) {}
    const stub = bandeja(env);
    const q = await stub.obtener(txt(b.id, 40));
    if (!q || !q.cliente || q.cliente.usuario !== s.usuario) return json({ ok: false, error: "no_encontrada" }, 404);
    if (!q.respuesta) return json({ ok: false, error: "sin_respuesta" }, 409);
    if (q.confirmada) return json({ ok: true, confirmada: q.confirmada });
    const r = q.respuesta;
    if (r.vigencia && Date.now() > r.fecha + r.vigencia * 864e5 + 864e5) return json({ ok: false, error: "vencida" }, 409);
    const confirmada = { fecha: Date.now(), notas: txt(b.notas, 500) };
    await stub.actualizar(q.id, { estado: "confirmada", confirmada });
    return json({ ok: true, confirmada });
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
    // --- Dueño: clientes de mayoreo ---
    if (ruta === "/api/dueno/clientes" && metodo === "GET") {
      const stub = bandeja(env);
      await stub.sembrarClientes(DATOS.clientes);
      const lista = await stub.clientes();
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      return json({ ok: true, clientes: lista, nota: DATOS.nota || "" });
    }
    if (ruta === "/api/dueno/clientes" && metodo === "POST") {
      let b = {};
      try { b = await request.json(); } catch (e) {}
      const stub = bandeja(env);
      await stub.sembrarClientes(DATOS.clientes);
      const u = normUsuario(b.usuario || (b.cliente && b.cliente.usuario));
      if (!/^[a-z0-9._-]{3,30}$/.test(u) || /^(due[nñ]o|dueno|admin|administrador)$/.test(u)) return json({ ok: false, error: "usuario" }, 400);
      if (b.accion === "borrar") { await stub.borrarCliente(u); return json({ ok: true }); }
      const c = b.cliente || {};
      const previo = await stub.cliente(u);
      if (b.nuevo && previo) return json({ ok: false, error: "existe" }, 409);
      const okCats = await catsOk(env);
      const datos = { n: txt(c.nombre, 80).trim() || u, persona: txt(c.persona, 80).trim(), wa: txt(c.wa, 20).trim(), activo: c.activo !== false, nivel: NIVELES.includes(c.nivel) ? c.nivel : "", cats: Array.isArray(c.cats) ? c.cats.filter((x) => okCats.includes(x)).slice(0, 40) : CATS_DEF };
      const clave = String(c.clave || "");
      if (clave) {
        if (clave.length < 6 || clave.length > 60) return json({ ok: false, error: "clave" }, 400);
        datos.s = hex(crypto.getRandomValues(new Uint8Array(8)));
        datos.h = await hashClave(clave, datos.s, DATOS.iter || 100000);
      } else if (!previo) return json({ ok: false, error: "clave" }, 400);
      if (c.precios && typeof c.precios === "object") {
        const p = {};
        for (const [k, v] of Object.entries(c.precios).slice(0, 3000)) {
          const n = Math.round(Number(v) * 100) / 100;
          if (n > 0 && k.length <= 140) p[k] = n;
        }
        datos.p = p;
      }
      await stub.guardarCliente(u, datos);
      return json({ ok: true });
    }
    // --- Dueño: categorías ---
    if (ruta === "/api/dueno/categorias" && metodo === "POST") {
      let b = {};
      try { b = await request.json(); } catch (e) {}
      const vistos = new Set();
      const lista = (Array.isArray(b.categorias) ? b.categorias : []).slice(0, 40).map((x) => ({
        slug: String(x.slug || "").toLowerCase(), name: txt(x.name, 40).trim(), blurb: txt(x.blurb, 140).trim(),
        icon: ICONOS_OK.includes(x.icon) ? x.icon : "caja",
      })).filter((x) => /^[a-z0-9-]{2,40}$/.test(x.slug) && x.name && !vistos.has(x.slug) && vistos.add(x.slug));
      if (!lista.length) return json({ ok: false, error: "vacia" }, 400);
      // No se puede quitar una categoría que todavía tiene productos
      const todos = await bandeja(env).productosTodos();
      const usados = new Set((todos.productos || []).map((p) => p.cat));
      const faltan = [...usados].filter((s) => !vistos.has(s));
      if (faltan.length) return json({ ok: false, error: "con_productos", categorias: faltan }, 409);
      await bandeja(env).guardarCategorias(lista);
      return json({ ok: true, categorias: lista });
    }
    // --- Dueño: banners ---
    if (ruta === "/api/dueno/banners" && metodo === "POST") {
      let b = {};
      try { b = await request.json(); } catch (e) {}
      const fecha = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
      const lista = (Array.isArray(b.banners) ? b.banners : []).slice(0, 12).map((x) => ({
        id: txt(x.id, 30) || Date.now().toString(36),
        img: rutaFoto(x.img) || (/^marca\/[\w.-]+\.(jpg|png|webp)$/.test(String(x.img || "")) ? String(x.img) : ""),
        href: /^#[a-z0-9-]{0,40}$/.test(String(x.href || "")) ? String(x.href) : "#inicio",
        alt: txt(x.alt, 200).trim(), activo: x.activo !== false, desde: fecha(x.desde), hasta: fecha(x.hasta),
      })).filter((x) => x.img);
      await bandeja(env).guardarBanners(lista);
      return json({ ok: true, banners: lista });
    }
    // --- Dueño: listas de precios ---
    if (ruta === "/api/dueno/precios" && metodo === "GET") return json({ ok: true, niveles: NIVELES, precios: await bandeja(env).listasTodas() });
    if (ruta === "/api/dueno/precios" && metodo === "POST") {
      let b = {};
      try { b = await request.json(); } catch (e) {}
      const cambios = {};
      let n = 0;
      for (const [id, pm] of Object.entries(b.cambios || {})) {
        if (!/^[a-z0-9]{1,20}$/i.test(id) || !pm || typeof pm !== "object") continue;
        cambios[id] = {};
        for (const [v, arr] of Object.entries(pm)) {
          if (String(v).length > 80 || !Array.isArray(arr)) continue;
          cambios[id][v] = [0, 1, 2, 3].map((i) => { const x = Math.round(Number(arr[i]) * 100) / 100; return x > 0 && x < 1e7 ? x : 0; });
          if (++n > 5000) break;
        }
      }
      await bandeja(env).guardarListas(cambios);
      return json({ ok: true });
    }
    // --- Dueño: productos ---
    if (ruta === "/api/dueno/productos" && metodo === "POST") {
      let b = {};
      try { b = await request.json(); } catch (e) {}
      const stub = bandeja(env);
      const todos = await stub.productosTodos();
      if (todos.vacio) return json({ ok: false, error: "sin_productos" }, 409);
      if (b.accion === "borrar") { await stub.borrarProducto(txt(b.id, 20)); return json({ ok: true }); }
      const previo = todos.productos.find((x) => x.id === b.producto?.id) || null;
      const p = limpiarProducto(b.producto || {}, previo, await catsOk(env));
      if (!p) return json({ ok: false, error: "datos" }, 400);
      const r = await stub.guardarProducto(p);
      return json({ ok: true, producto: p, nuevo: r.nuevo });
    }
    if (ruta === "/api/dueno/fotos" && metodo === "POST") {
      const tipo = (request.headers.get("content-type") || "").split(";")[0];
      if (!["image/jpeg", "image/png", "image/webp"].includes(tipo)) return json({ ok: false, error: "tipo" }, 415);
      const datos = await request.arrayBuffer();
      if (!datos.byteLength || datos.byteLength > 1500000) return json({ ok: false, error: "tamano" }, 413);
      const id = "u" + Date.now().toString(36) + hex(crypto.getRandomValues(new Uint8Array(5)));
      await bandeja(env).guardarFoto(id, tipo, datos);
      return json({ ok: true, ruta: "/api/foto/" + id });
    }
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
        // Precio sugerido por renglón: el del nivel del cliente (si tiene cuenta) o el precio público
        const stub = bandeja(env);
        const cli = q.cliente ? await stub.cliente(q.cliente.usuario) : null;
        const nivel = cli && cli.nivel ? cli.nivel : "publico";
        const lp = await stub.preciosDe(nivel, cli ? cli.p : null);
        const sug = q.items.map((it) => (it.custom ? null : lp[`${it.id}|${it.v}`] || null));
        return json({ ok: true, cotizacion: sinToken, sugeridos: sug, nivel });
      }
      if (metodo === "POST") {
        let b = {};
        try { b = await request.json(); } catch (e) {}
        if (b.accion === "borrar") { await bandeja(env).borrar(id); return json({ ok: true }); }
        if (b.accion === "estado") {
          const estado = ["pendiente", "respondida", "confirmada", "entregada", "archivada"].includes(b.estado) ? b.estado : "pendiente";
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
          const envio = Number(r.envio) > 0 ? Math.round(Number(r.envio) * 100) / 100 : 0;
          const vigencia = Math.max(0, Math.min(30, parseInt(r.vigencia, 10) || 0));
          const respuesta = { fecha: Date.now(), lineas, notas: txt(r.notas, 1000), envio, vigencia, total: Math.round((total + envio) * 100) / 100 };
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
