// ============================================================
//  CONFIGURACIÓN — CORPOSEPI · Inscripciones en línea
// ============================================================
//  Usa la base de datos de CORPOSEPI (proyecto Firebase
//  "corposepi-carnets", Realtime Database), la misma de carnets,
//  asistencia y convivencia. NO usa la base del Gimnasio.
//
//  Datos que se guardan:
//    inscripciones/<año>/<código>      → cada inscripción
//    inscripciones_config/<año>        → cupos, WhatsApp, abierto/cerrado
//
//  Si "firebase" se pone en null, la app queda en MODO DEMO
//  (datos solo en el navegador, PIN de abajo).
// ============================================================
window.CPS_CONFIG = {
  anio: 2027,
  colegio: "CORPOSEPI",
  colegioLargo: "Corporación de Servicios Educativos Pensamiento e Innovación",
  ciudad: "Madrid, Cundinamarca",
  prefijoCodigo: "CP",            // códigos tipo CP27-XXXX-XXXX

  // Proyecto Firebase de CORPOSEPI. Estos datos no son secretos:
  // la seguridad la dan las reglas (ver REGLAS-FIREBASE.md).
  firebase: {
    apiKey: "AIzaSyARjZP37yHcNRtIFWXarSVvYJ4ZOChuZ54",
    authDomain: "corposepi-carnets.firebaseapp.com",
    databaseURL: "https://corposepi-carnets-default-rtdb.firebaseio.com",
    projectId: "corposepi-carnets",
    storageBucket: "corposepi-carnets.firebasestorage.app",
    messagingSenderId: "653751648346",
    appId: "1:653751648346:web:7397e71424f285a6599863"
  },

  // Correos que pueden entrar al panel (deben coincidir con las reglas).
  admins: ["corposepi@corposepi.org"],

  // Solo para MODO DEMO (sin Firebase).
  pinDemo: "2027"
};
// Abrir con ?demo en la dirección para probar sin tocar la base real.
window.CPS_DEMO = /[?&]demo\b/.test(location.search) ? "&demo" : "";
if (window.CPS_DEMO) window.CPS_CONFIG.firebase = null;
