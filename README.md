# Chrome Profile Lock

Extensión local para poner una barrera sencilla a un perfil de Google Chrome.

## Instalación

1. Descomprimí la carpeta.
2. Abrí `chrome://extensions/`.
3. Activá **Modo de desarrollador**.
4. Elegí **Cargar descomprimida**.
5. Seleccioná la carpeta `chrome-profile-lock`.

## Contraseña inicial

`1234`

Para cambiarla, abrí `login.js` y editá:

```js
const PASSWORD = "1234";
```

Después volvé a `chrome://extensions/` y apretá **Recargar** en la extensión.

## Cómo funciona

- Al iniciar Chrome, la extensión activa un bloqueo para las páginas `http://` y `https://`.
- Las pestañas web abiertas se envían temporalmente a la pantalla de login.
- Al ingresar la contraseña correcta, se quita el bloqueo y se intentan restaurar las pestañas anteriores.
- Al cerrar completamente Chrome y volver a abrirlo, el bloqueo se activa otra vez.

## Limitación importante

Esto NO proporciona seguridad fuerte.

Una persona con conocimientos técnicos y acceso a tu sesión de Windows puede entrar a
`chrome://extensions/`, desactivar o eliminar la extensión, inspeccionar sus archivos o acceder
a otras páginas internas de Chrome.

Sirve como barrera práctica para evitar que otra persona use accidentalmente tus sesiones web
sin tener que bloquear toda la PC.

Para privacidad real entre personas que usan la misma computadora, la solución correcta es usar
cuentas separadas del sistema operativo.
