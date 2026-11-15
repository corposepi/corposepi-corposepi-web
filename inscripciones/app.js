// ============================================================
//  Capa de datos compartida — CORPOSEPI · Inscripciones
//  Firebase Realtime Database (corposepi-carnets) o modo demo local
// ============================================================
(function () {
  const C = window.CPS_CONFIG;

  const GRADOS = ["Prejardín", "Jardín", "Transición",
    "Primero", "Segundo", "Tercero", "Cuarto", "Quinto",
    "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo", "Undécimo"];

  // En CORPOSEPI esto es INSCRIPCIÓN (no matrícula) y NO tiene costo:
  // la familia llena el formulario y la corporación confirma el cupo.
  const ESTADOS = {
    pendiente: { txt: "Pendiente de confirmar", cls: "st-pend" },
    guardado:  { txt: "Cupo confirmado",        cls: "st-ok" },
    liberado:  { txt: "Cupo no asignado",       cls: "st-lib" },
    anulado:   { txt: "Anulada",                cls: "st-lib" }
  };

  const CUPOS_BASE = {};
  GRADOS.forEach((g, i) => CUPOS_BASE[g] = i < 3 ? 20 : 30);

  // Valores de matrícula y pensión 2027 por grado (se cambian en el panel → Configuración)
  const VALORES_BASE = {};
  GRADOS.forEach(g => VALORES_BASE[g] = { matricula: 800000, pension: 519000 });

  const MATRICULA_BASE = {
    valores: VALORES_BASE,
    mesesPension: 10,                       // febrero a noviembre
    fechaLimite: (C.anio) + "-01-31",       // fecha máxima para pagar y matricular
    mediosPago: "Transferencia o consignación a la cuenta de CORPOSEPI (pida los datos por WhatsApp) o pago en efectivo en CORPOSEPI.",
    descuentos: {
      d1: { nombre: "Pago de matrícula en diciembre", aplica: "matricula", pct: 10, hasta: (C.anio - 1) + "-12-31", para: "todos" }
    },
    // Quien paga la matrícula DE CONTADO con descuento gana descuento mensual en la pensión,
    // solo los meses que pague dentro de los primeros "pensionDia" días del mes.
    pensionDescPct: 5,
    pensionDia: 6,
    // Matrícula en dos cuotas (sin descuentos). Para matricular y guardar cupo: mínimo la mitad.
    dosCuotas: true,
    cuota1Hasta: (C.anio - 1) + "-12-31",
    cuota2Hasta: (C.anio) + "-01-31"
  };

  const CONFIG_BASE = {
    abierto: true,
    fechaCierre: "",
    whatsappSecretaria: "3208331239",
    cupos: CUPOS_BASE,
    ocupados: {},
    matricula: MATRICULA_BASE
  };

  // ---------- utilidades ----------
  const ALFA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function genCodigo() {
    const a = crypto.getRandomValues(new Uint8Array(8));
    let s = "";
    for (const b of a) s += ALFA[b % 32];
    return (C.prefijoCodigo || "CP") + String(C.anio).slice(2) + "-" + s.slice(0, 4) + "-" + s.slice(4);
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fecha(iso, conHora) {
    if (!iso) return "—";
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00" : iso);
    const o = { day: "2-digit", month: "short", year: "numeric" };
    if (conHora) { o.hour = "2-digit"; o.minute = "2-digit"; }
    return d.toLocaleString("es-CO", o);
  }
  function hoyISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function edad(fn) {
    if (!fn) return "";
    const n = new Date(fn + "T00:00:00"), h = new Date();
    let a = h.getFullYear() - n.getFullYear();
    let m = h.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < n.getDate())) { a--; m += 12; }
    if (h.getDate() < n.getDate()) m = (m + 11) % 12;
    return a + " años" + (m ? " " + m + (m === 1 ? " mes" : " meses") : "");
  }
  function nombreEst(i) {
    return [i.nombre1, i.nombre2, i.apellido1, i.apellido2].filter(Boolean).join(" ");
  }
  function estadoReal(i) {
    return ESTADOS[i.estado] ? i.estado : "pendiente";
  }
  const TIPOS = { nuevo: "Estudiante nuevo", continuidad: "Continuidad (ya estudia en CORPOSEPI)" };

  // Reduce la foto a 300×400 px en JPEG (~25 KB) para guardarla dentro de la inscripción
  function fotoReducida(file) {
    return new Promise((ok, fail) => {
      if (!file || !/^image\//.test(file.type)) return fail(new Error("El archivo no es una imagen"));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const W = 300, H = 400, c = document.createElement("canvas");
        c.width = W; c.height = H;
        const r = Math.max(W / img.width, H / img.height);
        const w = img.width * r, h = img.height * r;
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
        g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        URL.revokeObjectURL(url);
        ok(c.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = () => { URL.revokeObjectURL(url); fail(new Error("No se pudo leer la imagen")); };
      img.src = url;
    });
  }
  // ---------- matrícula: valores, descuentos y factura ----------
  function pesos(n) { return "$ " + Math.round(Number(n) || 0).toLocaleString("es-CO"); }
  function nivelDe(g) {
    const i = GRADOS.indexOf(g);
    if (i < 3) return "Preescolar";
    if (i < 8) return "Básica Primaria";
    if (i < 12) return "Básica Secundaria";
    return "Media Académica — Grado " + (i === 12 ? "10°" : "11°");
  }
  // Descuentos que aplican a un estudiante (por tipo nuevo/continuidad)
  function descuentosPara(i, cfg, aplica) {
    return Object.entries(cfg.matricula.descuentos || {})
      .map(([id, d]) => Object.assign({ id }, d))
      .filter(d => d.aplica === aplica && (!d.para || d.para === "todos" || d.para === i.tipoEstudiante) && Number(d.pct) > 0)
      .sort((a, b) => String(a.hasta).localeCompare(String(b.hasta)));
  }
  // Calcula la factura de matrícula a una fecha dada (ISO yyyy-mm-dd)
  function calcFactura(i, cfg, hoy) {
    hoy = hoy || hoyISO();
    const v = cfg.matricula.valores[i.grado] || { matricula: 0, pension: 0 };
    const base = Number(v.matricula) || 0;
    const descM = descuentosPara(i, cfg, "matricula");
    const vigente = descM.filter(d => !d.hasta || hoy <= d.hasta).sort((a, b) => b.pct - a.pct)[0] || null;
    const desc = vigente ? Math.round(base * vigente.pct / 100) : 0;
    const escalas = descM.map(d => ({ nombre: d.nombre, hasta: d.hasta, pct: d.pct, total: base - Math.round(base * d.pct / 100), vigente: !d.hasta || hoy <= d.hasta }));
    const mt = cfg.matricula, pension = Number(v.pension) || 0;
    const pPct = Number(mt.pensionDescPct) || 0, pDia = Number(mt.pensionDia) || 6;
    return {
      base, desc, total: base - desc, vigente, escalas,
      pension, meses: Number(mt.mesesPension) || 10,
      // descuento en pensión que se gana pagando la matrícula de contado con descuento
      pensionDescPct: pPct, pensionDia: pDia, pensionConDesc: pension - Math.round(pension * pPct / 100),
      descPension: descuentosPara(i, cfg, "pension"),
      // dos cuotas sin descuento; mínimo para matricular = la mitad
      dosCuotas: mt.dosCuotas !== false, cuota: Math.ceil(base / 2), minimo: Math.ceil(base / 2),
      cuota1Hasta: mt.cuota1Hasta, cuota2Hasta: mt.cuota2Hasta,
      fechaLimite: mt.fechaLimite
    };
  }
  // ¿El pago de matrícula reportado gana el descuento mensual en pensión?
  // Sí, si fue de contado (valor ≥ total con descuento) dentro de la fecha de un descuento de matrícula.
  function ganaDescPension(i, cfg, pago) {
    if (!pago || pago.plan === "cuotas") return false;   // pagos antiguos sin "plan": se juzgan por el valor
    const k = calcFactura(i, cfg, pago.fecha);
    return !!k.vigente && Number(pago.valor) >= k.total && k.pensionDescPct > 0;
  }
  // Valor final de la matrícula: con descuento si pagó de contado a tiempo; si no, valor pleno
  function valorMatriculaFinal(i, cfg) {
    const p = i.pagoMatricula, k = calcFactura(i, cfg, p && p.fecha);
    return p && p.plan !== "cuotas" && k.vigente && Number(p.valor) >= k.total ? k.total : k.base;
  }
  // Total pagado de matrícula (1ª + 2ª cuota aprobadas o en revisión según "soloAprobado")
  function pagadoMatricula(i, soloAprobado) {
    return [i.pagoMatricula, i.pagoMatricula2].filter(p => p && (soloAprobado ? p.estado === "aprobado" : p.estado !== "rechazado"))
      .reduce((s, p) => s + (Number(p.valor) || 0), 0);
  }
  // Número a letras (pesos colombianos) para contrato y pagaré
  function enLetras(n) {
    n = Math.round(Number(n) || 0);
    if (n === 0) return "CERO PESOS";
    const U = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
    const D = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const CEN = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
    const tres = x => {
      if (x === 100) return "CIEN";
      const c = Math.floor(x / 100), r = x % 100;
      const dd = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " Y " + U[r % 10] : "");
      return [CEN[c], dd].filter(Boolean).join(" ");
    };
    const mill = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000;
    const p = [];
    if (mill) p.push(mill === 1 ? "UN MILLÓN" : tres(mill).replace(/UNO$/, "UN") + " MILLONES");
    if (miles) p.push(miles === 1 ? "MIL" : tres(miles).replace(/UNO$/, "UN") + " MIL");
    if (resto) p.push(tres(resto));
    return p.join(" ") + ((!miles && !resto && mill) ? " DE PESOS" : " PESOS");
  }
  // Reduce documentos: imágenes a JPEG ≤1400 px; PDF se guarda tal cual si pesa ≤ 2,5 MB
  function archivoReducido(file) {
    return new Promise((ok, fail) => {
      if (!file) return fail(new Error("Sin archivo"));
      if (file.type === "application/pdf") {
        if (file.size > 2.5 * 1024 * 1024) return fail(new Error("El PDF pesa más de 2,5 MB. Tómele foto o redúzcalo."));
        const fr = new FileReader(); fr.onload = () => ok({ data: fr.result, tipo: "pdf", nombre: file.name }); fr.onerror = () => fail(new Error("No se pudo leer el PDF")); fr.readAsDataURL(file); return;
      }
      if (!/^image\//.test(file.type)) return fail(new Error("Use una foto (JPG/PNG) o un PDF."));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const M = 1400, r = Math.min(1, M / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); ok({ data: c.toDataURL("image/jpeg", 0.72), tipo: "img", nombre: file.name });
      };
      img.onerror = () => { URL.revokeObjectURL(url); fail(new Error("No se pudo leer la imagen")); };
      img.src = url;
    });
  }
  // Abre un archivo guardado (data:…) en otra pestaña
  function verArchivo(a) {
    if (!a || !a.data) return;
    const w = window.open("", "_blank");
    if (!w) { alert("Permita ventanas emergentes para ver el documento."); return; }
    w.document.write(a.tipo === "pdf"
      ? `<title>${esc(a.nombre || "Documento")}</title><iframe src="${a.data}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>`
      : `<title>${esc(a.nombre || "Documento")}</title><body style="margin:0;background:#333"><img src="${a.data}" style="max-width:100%;display:block;margin:auto"></body>`);
  }
  function hoyLargo(iso) {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  }

  function telWa(t) {
    let d = String(t || "").replace(/\D/g, "");
    if (d.length === 10) d = "57" + d;
    return d;
  }
  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => fail(new Error("No cargó " + src));
      document.head.appendChild(s);
    });
  }
  // Realtime Database no acepta "undefined": se limpian los campos vacíos
  function limpio(o) {
    const r = {};
    Object.entries(o).forEach(([k, v]) => { if (v !== undefined) r[k] = v; });
    return r;
  }

  // ---------- almacenamiento ----------
  let db = null, auth = null;
  const LK = "cps" + C.anio + "_";
  const RUTA = "inscripciones/" + C.anio;
  const RUTA_CFG = "inscripciones_config/" + C.anio;
  const local = {
    all() { try { return JSON.parse(localStorage.getItem(LK + "insc") || "{}"); } catch (e) { return {}; } },
    put(map) { localStorage.setItem(LK + "insc", JSON.stringify(map)); }
  };
  // Árbol local para modo demo (imita la base de datos por rutas)
  const arbol = {
    raiz() { try { return JSON.parse(localStorage.getItem(LK + "arbol") || "{}"); } catch (e) { return {}; } },
    get(path) {
      if (path.startsWith(RUTA + "/")) { const p = path.split("/"); return p.slice(3).reduce((o, k) => o == null ? null : o[k], local.all()[p[2]]) ?? null; }
      return path.split("/").reduce((o, k) => o == null ? null : o[k], this.raiz()) ?? null;
    },
    set(path, val) {
      if (path.startsWith(RUTA + "/")) {
        const p = path.split("/"), m = local.all(); let o = m;
        for (let i = 2; i < p.length - 1; i++) o = o[p[i]] = o[p[i]] || {};
        if (val === null) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = val;
        local.put(m); return;
      }
      const r = this.raiz(), p = path.split("/"); let o = r;
      for (let i = 0; i < p.length - 1; i++) o = o[p[i]] = (o[p[i]] && typeof o[p[i]] === "object") ? o[p[i]] : {};
      if (val === null) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = val;
      localStorage.setItem(LK + "arbol", JSON.stringify(r));
    }
  };

  const esAdmin = email => (C.admins || []).map(x => x.toLowerCase()).includes(String(email || "").toLowerCase());

  const Store = {
    modo: "local",

    // publico = true → entra con sesión anónima (padres de familia)
    async init(publico) {
      if (C.firebase && C.firebase.apiKey) {
        const v = "10.12.2", base = "https://www.gstatic.com/firebasejs/" + v + "/";
        await loadScript(base + "firebase-app-compat.js");
        await Promise.all([loadScript(base + "firebase-database-compat.js"),
          loadScript(base + "firebase-auth-compat.js")]);
        if (!firebase.apps.length) firebase.initializeApp(C.firebase);
        db = firebase.database();
        auth = firebase.auth();
        this.modo = "firebase";
        if (publico) {
          await new Promise(ok => { const u = auth.onAuthStateChanged(x => { u(); ok(x); }); });
          if (!auth.currentUser) await auth.signInAnonymously();
        }
      }
    },

    async getConfig() {
      let c = {};
      if (db) {
        const s = await db.ref(RUTA_CFG).once("value");
        c = s.val() || {};
      } else {
        try { c = JSON.parse(localStorage.getItem(LK + "config") || "{}"); } catch (e) {}
      }
      const r = Object.assign({}, CONFIG_BASE, c);
      r.cupos = Object.assign({}, CONFIG_BASE.cupos, c.cupos || {});
      r.ocupados = Object.assign({}, c.ocupados || {});
      const m = c.matricula || {};
      r.matricula = Object.assign({}, MATRICULA_BASE, m);
      r.matricula.valores = {};
      GRADOS.forEach(g => r.matricula.valores[g] = Object.assign({}, VALORES_BASE[g], (m.valores || {})[g] || {}));
      r.matricula.descuentos = m.descuentos !== undefined ? (m.descuentos || {}) : MATRICULA_BASE.descuentos;
      return r;
    },

    // ---- acceso genérico a otros nodos (matrícula, carnés, cartera 2027) ----
    async get(path) {
      if (db) return (await db.ref(path).once("value")).val();
      return arbol.get(path);
    },
    async set(path, val) {
      if (db) return db.ref(path).set(val);
      arbol.set(path, val);
    },
    async patch(path, obj) {
      if (db) return db.ref(path).update(obj);
      Object.entries(obj).forEach(([k, v]) => arbol.set(path + "/" + k, v));
    },
    // Consecutivo seguro (folio, factura, carné): devuelve el siguiente número
    async siguiente(path) {
      if (db) {
        const r = await db.ref(path).transaction(n => (Number(n) || 0) + 1);
        return r.snapshot.val();
      }
      const n = (Number(arbol.get(path)) || 0) + 1; arbol.set(path, n); return n;
    },

    async saveConfig(cfg) {
      if (db) await db.ref(RUTA_CFG).set(cfg);
      else localStorage.setItem(LK + "config", JSON.stringify(cfg));
    },

    async crear(data, cfg) {
      const codigo = genCodigo();
      const doc = limpio(Object.assign({}, data, {
        codigo, anio: C.anio, estado: "pendiente",
        creado: new Date().toISOString()
      }));
      if (db) await db.ref(RUTA + "/" + codigo).set(doc);
      else { const m = local.all(); m[codigo] = doc; local.put(m); }
      return doc;
    },

    async obtener(codigo) {
      codigo = String(codigo || "").trim().toUpperCase();
      if (!/^[A-Z0-9-]{6,20}$/.test(codigo)) return null;
      if (db) {
        const s = await db.ref(RUTA + "/" + codigo).once("value");
        return s.val();
      }
      return local.all()[codigo] || null;
    },

    async listar() {
      if (db) {
        const s = await db.ref(RUTA).once("value");
        return Object.values(s.val() || {});
      }
      return Object.values(local.all());
    },

    async actualizar(codigo, patch) {
      patch.modificado = new Date().toISOString();
      if (db) await db.ref(RUTA + "/" + codigo).update(patch);
      else {
        const m = local.all();
        if (!m[codigo]) throw new Error("No existe " + codigo);
        Object.assign(m[codigo], patch);
        Object.keys(patch).forEach(k => { if (patch[k] === null) delete m[codigo][k]; });
        local.put(m);
      }
    },

    // Recalcula los cupos ocupados (público) a partir de las inscripciones confirmadas
    async recalcularOcupados(lista) {
      const cfg = await this.getConfig();
      const oc = {};
      lista.forEach(i => { if (i.estado === "guardado") oc[i.grado] = (oc[i.grado] || 0) + 1; });
      cfg.ocupados = oc;
      await this.saveConfig(cfg);
      return cfg;
    },

    // ---- sesión de administración ----
    onAuth(cb) {
      if (auth) auth.onAuthStateChanged(u => cb(u && !u.isAnonymous ? (u.email || "") : null));
      else cb(sessionStorage.getItem(LK + "admin"));
    },
    esAdmin,
    async loginGoogle() {
      const p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      await auth.signInWithPopup(p);
    },
    async login(usuario, clave) {
      if (auth) { await auth.signInWithEmailAndPassword(usuario, clave); return; }
      if (clave !== C.pinDemo) throw new Error("PIN incorrecto");
      sessionStorage.setItem(LK + "admin", usuario || "admin");
    },
    async logout() {
      if (auth) await auth.signOut();
      sessionStorage.removeItem(LK + "admin");
    },
    usuario() {
      return (auth && auth.currentUser && auth.currentUser.email) || sessionStorage.getItem(LK + "admin") || "admin";
    }
  };

  // Solo se muestran fotos guardadas como imagen embebida (data:image/…)
  function fotoSrc(i) {
    return typeof i.foto === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(i.foto) ? i.foto : "";
  }

  // ---------- hoja imprimible (formato del formulario en papel) ----------
  function hoja(i) {
    const e = esc, st = ESTADOS[estadoReal(i)] || ESTADOS.pendiente;
    const td = (t, v, cs) => `<td${cs ? ` colspan="${cs}"` : ""}><b>${t}</b>${e(v) || "&nbsp;"}</td>`;
    const conf = i.confirmacion ? `Confirmado el ${fecha(i.confirmacion.fecha)}` : "Cupo sin confirmar";
    return `<div class="hoja">
      <div class="enc"><img src="logo.png" alt="">
        <div><h1>FORMULARIO DE INSCRIPCIÓN ${C.anio}</h1><p>${e(C.colegio)} · ${e(C.colegioLargo)} · ${e(C.ciudad)}</p></div>
        <div class="estado-imp"><b>Código: ${e(i.codigo)}</b><br>Estado: <b>${st.txt}</b><br>${conf}<br>Diligenciado: ${fecha(i.creado, true)}</div>
        ${fotoSrc(i) ? `<img class="foto-imp" src="${e(fotoSrc(i))}" alt="Foto">` : `<div class="foto-imp">FOTO</div>`}
      </div>
      <p class="legal">Apreciados Padres de Familia: para nuestra Institución es muy gratificante ser elegidos como educadores y formadores de su(s) hijo(a). La inscripción no tiene costo. CORPOSEPI revisará la inscripción y le confirmará el cupo.</p>
      <h3>DATOS DEL ESTUDIANTE</h3>
      <table>
        <tr>${td("1er. Nombre", i.nombre1)}${td("2do. Nombre", i.nombre2)}${td("1er. Apellido", i.apellido1)}${td("2do. Apellido", i.apellido2)}</tr>
        <tr>${td("Documento", (i.tipoDoc || "") + " " + (i.numDoc || ""))}${td("Expedido en", i.expedidoEn)}${td("Nacionalidad", i.nacionalidad)}${td("Lugar de nacimiento", i.lugarNacimiento)}</tr>
        <tr>${td("Fecha de nacimiento", i.fechaNacimiento)}${td("Edad", i.edad)}${td("EPS", i.eps)}${td("RH", i.rh)}</tr>
        <tr>${td("Dirección", i.direccion, 2)}${td("Torre/bloque · Casa/Apto", [i.torre, i.apto].filter(Boolean).join(" · "))}${td("Conjunto", i.conjunto)}</tr>
        <tr>${td("Barrio", i.barrio, 2)}${td("Grado del servicio de apoyo educativo", i.grado, 2)}</tr>
        <tr>${td("Tipo de estudiante", TIPOS[i.tipoEstudiante] || "", 2)}${td("Modalidad del servicio", i.modalidad, 2)}</tr>
        <tr>${td("Alergias", i.alergias, 2)}${td("Enfermedades", i.enfermedades, 2)}</tr>
        <tr>${td("Cuidados especiales", i.cuidados, 2)}${td("Rechazo algún alimento", i.rechazoAlimento, 2)}</tr>
        <tr>${td("El estudiante vive con", (i.viveCon || "") + (i.viveConOtro ? ": " + i.viveConOtro : ""), 4)}</tr>
      </table>
      <h3>DATOS DE LOS PADRES</h3>
      <table>
        <tr>${td("Nombre de la madre", i.madreNombre, 2)}${td("Nombre del padre", i.padreNombre, 2)}</tr>
        <tr>${td("C.C. No.", i.madreCC)}${td("Celular", i.madreCel)}${td("C.C. No.", i.padreCC)}${td("Celular", i.padreCel)}</tr>
        <tr>${td("Dirección", i.madreDir)}${td("Correo", i.madreCorreo)}${td("Dirección", i.padreDir)}${td("Correo", i.padreCorreo)}</tr>
        <tr>${td("Lugar de trabajo", i.madreTrabajo)}${td("Teléfono", i.madreTel)}${td("Lugar de trabajo", i.padreTrabajo)}${td("Teléfono", i.padreTel)}</tr>
      </table>
      <h3>ACUDIENTE Y EMERGENCIA</h3>
      <table>
        <tr>${td("Acudiente", i.acuNombre)}${td("C.C.", i.acuCC)}${td("Teléfono", i.acuTel)}${td("Parentesco", i.acuParentesco)}</tr>
        <tr>${td("En caso de emergencia llamar a", i.emeNombre, 2)}${td("Teléfono", i.emeTel)}${td("Correo acudiente", i.acuCorreo)}</tr>
      </table>
      <p class="legal"><b>Aceptamos</b> el Proyecto Educativo Institucional PEI, el Manual de Convivencia, el sistema de Matrícula, pensión y las normas establecidas en la Ley General de Educación.
      Diligenciando el presente documento <b>autorizamos</b> a ${e(C.colegio)} – ${e(C.colegioLargo).toUpperCase()} de manera expresa y consciente para que, de conformidad con la Ley 1581 de 2012 y sus decretos reglamentarios, trate, almacene y transmita los datos aquí consignados con fines de recolección, análisis de información, sugerencias, desarrollo y ejecución administrativa – educativa.
      <i>Todos sus datos se mantendrán protegidos según las políticas y procedimientos establecidos por ${e(C.colegio)} y se protegerán los datos sensibles de los menores de edad según lo estipulado en el Marco Legal.</i><br>
      Aceptado en línea por <b>${e(i.firmaNombre)}</b> (${e(i.firmaParentesco)}) el ${fecha(i.creado, true)}.</p>
      <div class="firmas"><div>ESTUDIANTE</div><div>MADRE / PADRE</div><div>ACUDIENTE</div><div>RECTORÍA</div></div>
    </div>`;
  }
  function imprimir(html) {
    let z = document.getElementById("imprimir");
    if (!z) { z = document.createElement("div"); z.id = "imprimir"; document.body.appendChild(z); }
    z.innerHTML = html;
    const img = z.querySelector("img");
    if (img && !img.complete) img.onload = () => window.print(); else window.print();
  }

  const MODALIDADES = ["Presencial", "Semipresencial", "Virtual"];

  window.CPS = { ganaDescPension, pagadoMatricula, valorMatriculaFinal, pesos, nivelDe, calcFactura, enLetras, archivoReducido, verArchivo, hoyLargo, MODALIDADES, C, GRADOS, ESTADOS, Store, esc, fecha, edad, nombreEst, estadoReal, telWa, hoja, imprimir, hoyISO, TIPOS, fotoReducida, fotoSrc };
})();
