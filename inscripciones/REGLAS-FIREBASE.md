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

Para agregar otro correo administrador: añadirlo en las reglas y en `config.js` → `admins`.
