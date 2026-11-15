# Inscripciones CORPOSEPI — configuración en Firebase

Proyecto: **corposepi-carnets** (el mismo de carnets, asistencia y convivencia).
Base: **Realtime Database**. No se usa la base del Gimnasio Real de la Sabana.

## 1. Métodos de ingreso (Authentication → Método de acceso)
- **Anónimo**: ya está activo (lo usan los carnets). Lo usan los padres.
- **Google**: activarlo para que secretaría entre con `corposepi@corposepi.org`.
  (Opcional: Correo/contraseña.)

## 2. Dominios autorizados (Authentication → Configuración)
Agregar `corposepi.org` si no aparece (y `localhost` para pruebas).

## 3. Reglas (Realtime Database → Reglas)
**No borre las reglas que ya existen.** Agregue estos dos bloques dentro de `"rules"`:

```json
"inscripciones": {
  "$anio": {
    ".read": "auth != null && auth.token.email == 'corposepi@corposepi.org'",
    "$codigo": {
      ".read": "auth != null",
      ".write": "auth != null && (auth.token.email == 'corposepi@corposepi.org' || (!data.exists() && newData.child('estado').val() == 'pendiente'))"
    }
  }
},
"inscripciones_config": {
  "$anio": {
    ".read": "auth != null",
    ".write": "auth != null && auth.token.email == 'corposepi@corposepi.org'"
  }
}
```

Qué hacen:
- Los padres solo pueden **crear** una inscripción nueva (no modificar ni borrar).
- Una inscripción se puede leer solo si se conoce su código (para "Consultar").
- La **lista completa** solo la ve la cuenta institucional.

> ⚠️ Si sus reglas actuales tienen `".read": "auth != null"` o `".write": "auth != null"`
> en la raíz, esas permiten todo hacia abajo y estas restricciones no se aplican.
> En ese caso conviene mover esos permisos a los nodos que usan los carnets (`corposepi`, etc.).

## 4. Nodos de matrícula 2027 (no tocan nada de 2026)
| Nodo | Qué guarda |
|---|---|
| `inscripciones_meta/2027/factura` | consecutivo de facturas FM27-0001… |
| `matriculas_2027/<código>` | folio, firmas, aceptaciones, estado |
| `matriculas_2027_docs/<código>/<doc>` | documentos y soporte de pago (foto/PDF) |
| `matriculas_meta/2027/folio` | consecutivo del folio de matrícula |
| `carnets_2027/<CORP-2027-0001>` | carné digital 2027 |
| `carnets_2027_meta/seq` | consecutivo del carné |
| `familias_2027/<cc>`, `pagos_2027/f_<cc>` | cartera 2027 (mismo formato que familias_v3 / pagos_v3) |

Al cerrar reglas: los padres necesitan leer/escribir **solo su** `matriculas_2027/<código>` y `matriculas_2027_docs/<código>`
(como en `inscripciones`), leer `carnets_2027/<id>` y usar los consecutivos; `familias_2027`, `pagos_2027` y escribir
`carnets_2027` deben quedar solo para la cuenta institucional.

Para agregar otro correo administrador: añadirlo en las reglas y en `config.js` → `admins`.
