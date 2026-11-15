// ============================================================
//  Documentos de matrícula 2027 — CORPOSEPI
//  Factura de matrícula, folio, contrato, pagaré y carta de instrucciones
//  (textos tomados de los documentos 2026 de CORPOSEPI, actualizados a 2027)
// ============================================================
(function () {
  const { C, esc, pesos, fecha, nombreEst, enLetras, hoyLargo, nivelDe, TIPOS } = CPS;
  const NIT = "901.898.846-6", TEL = "320 833 1239", REP = "DESIDERIO PERDOMO ÁVILA";
  const RAZON = "CORPORACIÓN DE SERVICIOS EDUCATIVOS PENSAMIENTO E INNOVACIÓN — CORPOSEPI®";
  const L = v => esc(v) || "_______________";

  function encabezado(titulo, sub) {
    return `<div class="enc"><img src="logo.png" alt="">
      <div><h1>${titulo}</h1><p>${RAZON}<br>NIT ${NIT} · Madrid, Cundinamarca · Tel ${TEL} · corposepi.org</p>${sub ? `<p><b>${sub}</b></p>` : ""}</div></div>`;
  }
  function firma(f, rol, extra) {
    return `<div class="firma-doc">${f && f.img ? `<img src="${esc(f.img)}" alt="Firma">` : `<div style="height:52px"></div>`}
      <div class="linea"><b>${esc(f && f.nombre) || rol}</b><br>${rol}${extra ? "<br>" + extra : ""}${f && f.fecha ? `<br><small>Firmado en línea: ${fecha(f.fecha, true)}</small>` : ""}</div></div>`;
  }
  // Quién es el acudiente frente a madre/padre
  function firmantes(i) {
    const r = [{ k: "estudiante", rol: "Estudiante", nombre: nombreEst(i), doc: (i.tipoDoc || "") + " " + (i.numDoc || ""), req: true },
               { k: "acudiente", rol: "Acudiente (" + (i.acuParentesco || "") + ")", nombre: i.acuNombre, doc: "C.C. " + (i.acuCC || ""), req: true }];
    const n = s => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
    const d = s => String(s || "").replace(/\D/g, "");
    // es el mismo acudiente si coincide la cédula o, sin cédula, el nombre
    const mismo = (cc, nom) => (d(cc) && d(cc) === d(i.acuCC)) || (!d(cc) && n(nom) === n(i.acuNombre));
    if (i.madreNombre && !mismo(i.madreCC, i.madreNombre)) r.push({ k: "madre", rol: "Madre", nombre: i.madreNombre, doc: "C.C. " + (i.madreCC || ""), req: false });
    if (i.padreNombre && !mismo(i.padreCC, i.padreNombre)) r.push({ k: "padre", rol: "Padre", nombre: i.padreNombre, doc: "C.C. " + (i.padreCC || ""), req: false });
    return r;
  }

  // ---------- FACTURA DE MATRÍCULA (estilo factura electrónica, documento interno) ----------
  function factura(i, cfg) {
    const f = i.factura || {}, k = CPS.calcFactura(i, cfg);
    const pago = i.pagoMatricula;
    const filas = k.escalas.length
      ? k.escalas.map(e => `<tr><td>Pagando hasta el ${fecha(e.hasta)} (${esc(e.nombre)}, ${e.pct}% dto.)</td><td class="num">${pesos(e.total)}</td><td>${e.vigente ? "Vigente" : "Vencido"}</td></tr>`).join("") +
        `<tr><td>Pagando hasta el ${fecha(k.fechaLimite)} (valor pleno)</td><td class="num">${pesos(k.base)}</td><td>—</td></tr>`
      : `<tr><td>Pagando hasta el ${fecha(k.fechaLimite)}</td><td class="num">${pesos(k.base)}</td><td>—</td></tr>`;
    return `<div class="hoja factura">
      ${encabezado("FACTURA DE MATRÍCULA " + C.anio, "N.° " + esc(f.numero || "—"))}
      <table class="fx-meta"><tr>
        <td><b>Fecha de expedición</b>${fecha(f.fecha || new Date().toISOString())}</td>
        <td><b>Fecha máxima de pago</b>${fecha(k.fechaLimite)}</td>
        <td><b>Código de inscripción</b>${esc(i.codigo)}</td>
        <td><b>Estado</b>${pago && pago.estado === "aprobado" ? "PAGADA" : pago && pago.estado === "revision" ? "Pago en revisión" : "Pendiente de pago"}</td></tr></table>
      <h3>ADQUIRIENTE</h3>
      <table><tr><td><b>Nombre / Razón social</b>${esc(i.acuNombre)}</td><td><b>C.C.</b>${esc(i.acuCC)}</td><td><b>Teléfono</b>${esc(i.acuTel)}</td><td><b>Correo</b>${esc(i.acuCorreo) || "—"}</td></tr>
        <tr><td colspan="2"><b>Dirección</b>${esc(i.direccion)} · ${esc(i.barrio)}</td><td colspan="2"><b>Estudiante</b>${esc(nombreEst(i))} · ${esc(i.tipoDoc)} ${esc(i.numDoc)}</td></tr></table>
      <h3>DETALLE</h3>
      <table class="fx-items"><tr class="th"><td>Descripción</td><td>Cant.</td><td class="num">Valor unitario</td><td class="num">Total</td></tr>
        <tr><td>Matrícula ${C.anio} — Servicio de apoyo educativo<br><small>Grado ${esc(i.grado)} · ${esc(nivelDe(i.grado))} · Modalidad ${esc(i.modalidad || "—")} · ${esc(TIPOS[i.tipoEstudiante] || "")}</small></td><td>1</td><td class="num">${pesos(k.base)}</td><td class="num">${pesos(k.base)}</td></tr>
        <tr><td colspan="3" class="num">Subtotal</td><td class="num">${pesos(k.base)}</td></tr>
        <tr><td colspan="3" class="num">Descuento vigente hoy${k.vigente ? ` (${esc(k.vigente.nombre)}, ${k.vigente.pct}%)` : ""}</td><td class="num">- ${pesos(k.desc)}</td></tr>
        <tr><td colspan="3" class="num">IVA (servicio educativo excluido, Art. 476 E.T.)</td><td class="num">$ 0</td></tr>
        <tr class="tot"><td colspan="3" class="num">TOTAL A PAGAR HOY</td><td class="num">${pesos(k.total)}</td></tr></table>
      <h3>VALOR SEGÚN FECHA DE PAGO</h3>
      <table class="fx-items">${filas}</table>
      <h3>PENSIONES ${C.anio}</h3>
      <p class="legal">Pensión mensual del servicio de apoyo educativo: <b>${pesos(k.pension)}</b> × ${k.meses} meses (febrero a noviembre).
      ${k.descPension.length ? "Descuentos en pensiones: " + k.descPension.map(d => `<b>${esc(d.nombre)}</b> ${d.pct}%${d.hasta ? " pagando hasta el " + fecha(d.hasta) : ""}`).join("; ") + "." : ""}</p>
      <h3>MEDIOS DE PAGO</h3>
      <p class="legal">${esc(cfg.matricula.mediosPago)}</p>
      <p class="legal"><i>Documento de cobro interno de CORPOSEPI. La factura electrónica con validez ante la DIAN se emite al confirmar el pago. Son ${esc(enLetras(k.total).toLowerCase())} m/cte.</i></p>
    </div>`;
  }

  // ---------- FOLIO DE MATRÍCULA ----------
  function folio(i, m) {
    const td = (t, v, cs) => `<td${cs ? ` colspan="${cs}"` : ""}><b>${t}</b>${esc(v) || "&nbsp;"}</td>`;
    const fs = firmantes(i);
    return `<div class="hoja">
      <div class="enc"><img src="logo.png" alt="">
        <div><h1>FOLIO DE MATRÍCULA N.° ${esc(m.folio)}</h1><p>${RAZON} · NIT ${NIT}<br>Servicio de apoyo educativo · Año ${C.anio}</p></div>
        <div class="estado-imp"><b>Folio ${esc(m.folio)}</b><br>Inscripción ${esc(i.codigo)}<br>Matrícula: ${m.estado === "confirmada" ? "<b>CONFIRMADA</b>" : "En revisión"}<br>${fecha(m.enviada, true)}</div>
        ${CPS.fotoSrc(i) ? `<img class="foto-imp" src="${esc(CPS.fotoSrc(i))}" alt="Foto">` : `<div class="foto-imp">FOTO</div>`}
      </div>
      <h3>DATOS DEL ESTUDIANTE</h3>
      <table>
        <tr>${td("Nombres", [i.nombre1, i.nombre2].filter(Boolean).join(" "), 2)}${td("Apellidos", [i.apellido1, i.apellido2].filter(Boolean).join(" "), 2)}</tr>
        <tr>${td("Documento", (i.tipoDoc || "") + " " + (i.numDoc || ""))}${td("Fecha de nacimiento", i.fechaNacimiento)}${td("EPS", i.eps)}${td("RH", i.rh)}</tr>
        <tr>${td("Grado del servicio de apoyo educativo", i.grado)}${td("Nivel", nivelDe(i.grado))}${td("Modalidad", i.modalidad)}${td("Tipo", TIPOS[i.tipoEstudiante])}</tr>
        <tr>${td("Dirección", i.direccion, 2)}${td("Barrio", i.barrio)}${td("Vive con", i.viveCon)}</tr>
      </table>
      <h3>FAMILIA Y ACUDIENTE</h3>
      <table>
        <tr>${td("Madre", i.madreNombre, 2)}${td("C.C.", i.madreCC)}${td("Celular", i.madreCel)}</tr>
        <tr>${td("Padre", i.padreNombre, 2)}${td("C.C.", i.padreCC)}${td("Celular", i.padreCel)}</tr>
        <tr>${td("Acudiente", i.acuNombre + " (" + (i.acuParentesco || "") + ")", 2)}${td("C.C.", (i.acuCC || "") + (m.acuExpedida ? " de " + m.acuExpedida : ""))}${td("Celular", i.acuTel)}</tr>
        <tr>${td("Emergencia", i.emeNombre, 2)}${td("Teléfono", i.emeTel)}${td("Correo", m.acuCorreo || i.acuCorreo)}</tr>
      </table>
      <h3>DOCUMENTOS ENTREGADOS</h3>
      <table>${Object.values(m.docs || {}).map(d => `<tr><td>${esc(d.titulo)}</td><td>${d.ok ? "✔ Adjuntado" : "Pendiente"}</td></tr>`).join("")}</table>
      <h3>PAGO DE MATRÍCULA</h3>
      <table><tr>${td("Factura", i.factura && i.factura.numero)}${td("Valor pagado", i.pagoMatricula ? pesos(i.pagoMatricula.valor) : "")}${td("Fecha", i.pagoMatricula && i.pagoMatricula.fecha)}${td("Estado", i.pagoMatricula && i.pagoMatricula.estado === "aprobado" ? "Aprobado" : "En revisión")}</tr></table>
      <p class="legal">Con la firma de este folio, el estudiante y su familia formalizan la matrícula ${C.anio} en el servicio de apoyo educativo de CORPOSEPI®, aceptan el Proyecto Educativo, el Manual de Convivencia y el Modelo Educativo CORPOSEPI®, y declaran que la información suministrada es veraz. Datos tratados conforme a la Ley 1581 de 2012.</p>
      <div class="firmas-doc">${fs.map(x => firma((m.firmas || {})[x.k], x.rol, x.doc)).join("")}${firma(null, "CORPOSEPI® — Rectoría")}</div>
    </div>`;
  }

  // ---------- CONTRATO DE SERVICIO DE APOYO EDUCATIVO ----------
  function contrato(i, m, cfg) {
    const k = CPS.calcFactura(i, cfg), f = (m.firmas || {});
    return `<div class="hoja">
      ${encabezado("CONTRATO DE PRESTACIÓN DEL SERVICIO DE APOYO EDUCATIVO " + C.anio, "Anexo al folio de matrícula N.° " + esc(m.folio))}
      <p class="legal">Entre los suscritos, a saber: <b>EL PRESTADOR DEL SERVICIO:</b> Corporación de Servicios Educativos Pensamiento e Innovación — CORPOSEPI®, persona jurídica sin ánimo de lucro, inscrita en la Cámara de Comercio de Facatativá, NIT ${NIT}, domiciliada en Madrid, Cundinamarca, representada legalmente por ${REP}, quien en adelante se denominará EL PRESTADOR; y <b>EL BENEFICIARIO / ACUDIENTE:</b> ${L(i.acuNombre)}, identificado(a) con C.C. ${L(i.acuCC)}${m.acuExpedida ? " de " + esc(m.acuExpedida) : ""}, con dirección ${L(i.direccion)} (${esc(i.barrio)}), Madrid, Cundinamarca, teléfono ${L(i.acuTel)}, correo ${L(m.acuCorreo || i.acuCorreo)}, en representación del estudiante <b>${esc(nombreEst(i))}</b>, ${esc(i.tipoDoc)} ${esc(i.numDoc)}, grado del servicio de apoyo educativo <b>${esc(i.grado)}</b> (${esc(nivelDe(i.grado))}), modalidad <b>${esc(i.modalidad || "—")}</b>; han acordado celebrar el presente contrato, sujeto a las siguientes cláusulas:</p>
      <p class="legal"><b>PRIMERA — OBJETO.</b> CORPOSEPI® se compromete a prestar el servicio de apoyo educativo y acompañamiento pedagógico flexible al estudiante identificado, conforme al Modelo Educativo CORPOSEPI®, que incluye: proyectos integradores, educación experiencial itinerante, acceso a la Plataforma Aprende, seguimiento formativo cualitativo, acciones articuladoras (LEO, STEAM, Inteligencia Financiera, Inteligencia Emocional, Medio Ambiente, Alimentación Saludable, Marketing y Emprendimiento), y los demás servicios propios del modelo pedagógico de la Corporación.</p>
      <p class="legal"><b>SEGUNDA — MODALIDAD DEL SERVICIO.</b> El servicio se prestará en modalidad <b>${esc(i.modalidad || "—")}</b>. CORPOSEPI® opera como plataforma educativa itinerante, utilizando espacios comunitarios, bibliotecas, parques, cafés culturales y entornos naturales como aulas contextuales, conforme a su modelo pedagógico experiencial.</p>
      <p class="legal"><b>TERCERA — DURACIÓN.</b> El presente contrato tiene vigencia para el período académico ${C.anio}, desde febrero hasta noviembre de ${C.anio}. Se renueva automáticamente, salvo comunicación en contrario con 30 días de anticipación.</p>
      <p class="legal"><b>CUARTA — VALOR DEL SERVICIO Y FORMA DE PAGO.</b> El valor de la matrícula ${C.anio} es de ${pesos(k.base)} (${enLetras(k.base)}), con los descuentos por pronto pago informados en la factura de matrícula. El valor mensual del servicio es de <b>${pesos(k.pension)}</b> (${enLetras(k.pension)}) durante ${k.meses} meses (febrero a noviembre), pagaderos dentro de los primeros cinco (5) días de cada mes, por transferencia, PSE o efectivo. Los pagos se soportarán mediante FACTURA ELECTRÓNICA emitida por CORPOSEPI®, la cual constituye el comprobante válido de pago. EL BENEFICIARIO se compromete a conservar las facturas recibidas.</p>
      <p class="legal"><b>QUINTA — OBLIGACIONES DE CORPOSEPI®.</b> (a) Prestar el servicio en las condiciones acordadas; (b) Emitir la factura electrónica mensual oportunamente; (c) Mantener informada a la familia sobre el proceso formativo del estudiante; (d) Respetar la privacidad y datos personales del estudiante y su familia conforme a la Ley 1581 de 2012; (e) Aplicar el Modelo Educativo CORPOSEPI® con rigor pedagógico y evaluación formativa.</p>
      <p class="legal"><b>SEXTA — OBLIGACIONES DEL BENEFICIARIO.</b> (a) Pagar puntualmente el valor mensual acordado; (b) Participar activamente en el proceso formativo del estudiante; (c) Gestionar la matrícula formal del estudiante en la institución educativa certificadora correspondiente; (d) Informar oportunamente cualquier cambio en los datos de contacto; (e) Cumplir el reglamento y los acuerdos pedagógicos del Modelo CORPOSEPI®.</p>
      <p class="legal"><b>SÉPTIMA — CONSECUENCIAS DEL INCUMPLIMIENTO EN EL PAGO.</b> El incumplimiento en el pago de dos (2) o más mensualidades consecutivas facultará a CORPOSEPI® para: (a) Suspender la prestación del servicio hasta la regularización del pago; (b) Cobrar intereses de mora a la tasa máxima legal permitida; (c) Iniciar el proceso de cobro prejudicial y judicial utilizando los títulos valores suscritos como garantía; (d) Reportar la obligación a centrales de riesgo. La suspensión del servicio no exime al BENEFICIARIO de la obligación de pago.</p>
      <p class="legal"><b>OCTAVA — GARANTÍAS.</b> Como garantía del cumplimiento de las obligaciones de pago, EL BENEFICIARIO suscribe conjuntamente con este contrato un PAGARÉ EN BLANCO con su CARTA DE INSTRUCCIONES, documentos que forman parte integral del presente acuerdo y podrán ser utilizados por CORPOSEPI® en caso de incumplimiento, previo agotamiento de gestiones amigables de cobro.</p>
      <p class="legal"><b>NOVENA — TRATAMIENTO DE DATOS PERSONALES.</b> EL BENEFICIARIO autoriza a CORPOSEPI® para recolectar, almacenar y utilizar sus datos personales y los del estudiante con la finalidad exclusiva de prestar el servicio contratado, gestionar el cobro de las obligaciones económicas y cumplir con las obligaciones legales, de conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013.</p>
      <p class="legal"><b>DÉCIMA — MÉRITO EJECUTIVO Y LEY APLICABLE.</b> El presente contrato, junto con las facturas electrónicas emitidas, presta mérito ejecutivo conforme al artículo 422 del Código General del Proceso. Se rige por las leyes colombianas, especialmente el Código Civil, el Código de Comercio y la normativa de educación flexible vigente. Para cualquier controversia, las partes se someten a los jueces competentes del municipio de Madrid, Cundinamarca.</p>
      <p class="legal"><b>UNDÉCIMA — DECLARACIONES FINALES.</b> Las partes declaran: (a) Haber leído y comprendido íntegramente el presente contrato; (b) Suscribirlo de manera libre y espontánea; (c) Que la información suministrada es veraz; (d) Que están de acuerdo con el Modelo Pedagógico CORPOSEPI® y sus características de flexibilidad estructurada, evaluación formativa y educación experiencial itinerante.</p>
      <p class="legal">En constancia, se firma electrónicamente en Madrid, Cundinamarca, el ${hoyLargo(f.acudiente && f.acudiente.fecha)}.</p>
      <div class="firmas-doc">${firma({ nombre: REP }, "Representante Legal — CORPOSEPI®")}${firma(f.acudiente, "EL BENEFICIARIO / ACUDIENTE", "C.C. " + esc(i.acuCC))}</div>
    </div>`;
  }

  // ---------- PAGARÉ EN BLANCO + CARTA DE INSTRUCCIONES ----------
  function pagare(i, m) {
    const f = (m.firmas || {}), n = "P" + String(C.anio).slice(2) + "-" + esc(m.folio);
    return `<div class="hoja">
      ${encabezado("PAGARÉ N.° " + n, "Título valor — suscrito en blanco con carta de instrucciones")}
      <table><tr><td><b>Ciudad y fecha</b>Madrid, Cundinamarca, ${hoyLargo(f.acudiente && f.acudiente.fecha)}</td><td><b>Suscriptor</b>${esc(i.acuNombre)}</td><td><b>C.C.</b>${esc(i.acuCC)}${m.acuExpedida ? " de " + esc(m.acuExpedida) : ""}</td><td><b>Teléfono</b>${esc(i.acuTel)}</td></tr>
        <tr><td colspan="4"><b>Dirección</b>${esc(i.direccion)} · ${esc(i.barrio)} · Madrid, Cundinamarca</td></tr></table>
      <p class="legal">Yo, <b>${esc(i.acuNombre)}</b>, mayor de edad, vecino(a) de Madrid, Cundinamarca, identificado(a) con C.C. N.° <b>${esc(i.acuCC)}</b>${m.acuExpedida ? " expedida en " + esc(m.acuExpedida) : ""}, me obligo a pagar INCONDICIONALMENTE y a la orden de la CORPORACIÓN DE SERVICIOS EDUCATIVOS PENSAMIENTO E INNOVACIÓN — CORPOSEPI®, con NIT ${NIT}, la suma de: VALOR $ ______________________ ( ____________________________________________ PESOS MONEDA LEGAL COLOMBIANA ), pagaderos en la ciudad de Madrid, Cundinamarca, o donde me sea requerido, en la fecha de vencimiento ____ de ______________ de ______.</p>
      <p class="legal">El presente PAGARÉ se suscribe EN BLANCO de buena fe, con los espacios en blanco que serán diligenciados por el tenedor legítimo — CORPOSEPI® — conforme a la CARTA DE INSTRUCCIONES suscrita en la misma fecha, la cual es parte integral e inseparable del presente título valor. En caso de mora, reconozco intereses a la tasa máxima legal permitida desde la fecha de vencimiento hasta el pago total. El incumplimiento faculta al tenedor para llenar los espacios en blanco y ejercer la acción cambiaria directa sin requerimiento previo. Renuncio al beneficio de excusión y señalo como domicilio para cobro el indicado en este documento.</p>
      <p class="legal">Este pagaré presta mérito ejecutivo conforme a los artículos 619 y ss. del Código de Comercio y el artículo 422 del Código General del Proceso. Suscrito en Madrid, Cundinamarca. Garantiza las obligaciones del contrato de servicio de apoyo educativo ${C.anio}, estudiante ${esc(nombreEst(i))}, folio de matrícula N.° ${esc(m.folio)}.</p>
      <div class="firmas-doc">${firma(f.acudiente, "FIRMA DEL SUSCRIPTOR", "C.C. " + esc(i.acuCC))}${firma(null, "CODEUDOR / AVALISTA (si aplica)")}</div>
    </div>
    <div class="hoja salto">
      ${encabezado("CARTA DE INSTRUCCIONES — PAGARÉ EN BLANCO N.° " + n)}
      <p class="legal">Madrid, Cundinamarca, ${hoyLargo(f.acudiente && f.acudiente.fecha)}<br>Señores: ${RAZON}. Representante Legal: ${REP}.</p>
      <p class="legal">Por medio de la presente carta de instrucciones, yo, <b>${esc(i.acuNombre)}</b>, C.C. <b>${esc(i.acuCC)}</b>, le autorizo expresa e irrevocablemente para diligenciar el PAGARÉ EN BLANCO N.° ${n} que he suscrito en la fecha indicada, conforme a las siguientes instrucciones:</p>
      <p class="legal"><b>PRIMERA — CAUSALES PARA DILIGENCIAR EL PAGARÉ.</b> Usted queda autorizado para diligenciar el pagaré cuando ocurra cualquiera de las siguientes circunstancias: a) Cuando deje de pagar una (1) o más de las cuotas acordadas en el plan de pago establecido en el Contrato de Prestación del Servicio de Apoyo Educativo suscrito en la misma fecha. b) Cuando deje de pagar dos (2) o más mensualidades corrientes del servicio. c) Cuando incurra en cualquier declaración falsa en el contrato. d) Cuando inicie un proceso de insolvencia o cesación de pagos.</p>
      <p class="legal"><b>SEGUNDA — VALOR A DILIGENCIAR.</b> El valor corresponderá a la totalidad de la deuda exigible en el momento del incumplimiento, que incluirá: a) El saldo insoluto de la deuda reconocida en el Contrato. b) Las mensualidades corrientes vencidas no pagadas. c) Los intereses de mora causados a la tasa máxima legal permitida. d) Los gastos de cobranza prejudicial y judicial en que incurra CORPOSEPI®.</p>
      <p class="legal"><b>TERCERA — FECHA DE VENCIMIENTO.</b> Podrá consignar como fecha de vencimiento la fecha en que ocurra el incumplimiento que da lugar al diligenciamiento, o la fecha inmediatamente siguiente a la del vencimiento de la última cuota incumplida. En cualquier caso, la fecha de vencimiento no podrá ser anterior a la fecha en que se registre el incumplimiento.</p>
      <p class="legal"><b>CUARTA — LUGAR DE PAGO.</b> El municipio de Madrid, Cundinamarca, o aquel que usted determine conveniente para el ejercicio de la acción de cobro.</p>
      <p class="legal"><b>QUINTA — NOTIFICACIÓN PREVIA.</b> Antes de diligenciar el pagaré, CORPOSEPI® realizará al menos una (1) gestión de cobro amigable mediante comunicación escrita o electrónica al correo o número de WhatsApp registrado, con un plazo mínimo de cinco (5) días hábiles para que el BENEFICIARIO realice el pago o proponga una solución. Si transcurrido dicho plazo no hay respuesta o pago efectivo, procederá el diligenciamiento del pagaré sin necesidad de autorización adicional.</p>
      <p class="legal"><b>SEXTA — DECLARACIONES DEL SUSCRIPTOR.</b> Declaro expresamente: (a) Que la presente carta de instrucciones se otorga de manera libre, consciente y espontánea; (b) Que he sido informado(a) del alcance jurídico del pagaré en blanco y de la presente carta; (c) Que la deuda que origina el pagaré es real, líquida y existente; (d) Que autorizo a CORPOSEPI® para realizar el reporte a centrales de riesgo en caso de persistir el incumplimiento; (e) Que esta carta forma parte integral del Contrato de Prestación del Servicio de Apoyo Educativo suscrito en la misma fecha.</p>
      <div class="firmas-doc">${firma(f.acudiente, "EL SUSCRIPTOR", "C.C. " + esc(i.acuCC))}${firma(null, "EL CODEUDOR / AVALISTA (si aplica)")}${firma({ nombre: REP }, "Recibido y aceptado — CORPOSEPI®")}</div>
    </div>`;
  }

  // ---------- CARNÉ DIGITAL 2027 ----------
  function carne(c) {
    const url = location.href.replace(/[^/]*$/, "") + "carnet.html?id=" + encodeURIComponent(c.id);
    return `<div class="carne">
      <div class="carne-top"><img src="logo.png" alt=""><div><b>CORPOSEPI</b><small>Servicio de apoyo educativo</small></div><span>${esc(c.ano)}</span></div>
      <div class="carne-cuerpo">
        ${c.photo ? `<img class="carne-foto" src="${esc(c.photo)}" alt="Foto">` : `<div class="carne-foto"></div>`}
        <div class="carne-datos">
          <div class="carne-nom">${esc(c.nombres)}<br>${esc(c.apellidos)}</div>
          <div><small>${esc(c.tipodoc)}</small> ${esc(c.numdoc)}</div>
          <div><small>Grado</small> ${esc(c.grado)}</div>
          <div><small>Modalidad</small> ${esc(c.jornada)}</div>
          <div><small>RH</small> ${esc(c.rh || "—")} · <small>EPS</small> ${esc(c.eps || "—")}</div>
        </div>
      </div>
      <div class="carne-pie"><div><small>Carné</small> <b>${esc(c.id)}</b><br><small>Vigencia</small> <b>${esc(c.vigencia)}</b><br><small>Emergencia</small> ${esc(c.emergencia || "")}</div><div class="carne-qr" data-qr="${esc(url)}"></div></div>
      <div class="carne-estado ${c.status === "active" ? "ok" : ""}">${c.status === "active" ? "✔ ESTUDIANTE ACTIVO " + esc(c.ano) : "INACTIVO"}</div>
    </div>`;
  }
  function pintarQR(cont) {
    cont.querySelectorAll("[data-qr]").forEach(el => {
      el.innerHTML = "";
      if (window.QRCode) new QRCode(el, { text: el.dataset.qr, width: 92, height: 92, correctLevel: QRCode.CorrectLevel.M });
    });
  }

  window.DOCS = { factura, folio, contrato, pagare, carne, pintarQR, firmantes };
})();
