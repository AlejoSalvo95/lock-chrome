# Chrome Profile Lock

Extensión local para poner una barrera sencilla a un perfil de Google Chrome.

## Instalación

1. Descomprimí la carpeta.
2. Abrí `chrome://extensions/`.
3. Activá **Modo de desarrollador**.
4. Elegí **Cargar descomprimida**.
5. Seleccioná la carpeta `chrome-profile-lock`.

## Contraseña

La primera vez que se carga la extensión, la pantalla de bloqueo solicita crear una contraseña de al menos 6 caracteres. La contraseña no se guarda en el código ni en Git: se deriva con PBKDF2-SHA-256, un salt aleatorio y 310.000 iteraciones, y solamente se guarda el resultado en `chrome.storage.local`.

Para cambiarla, abrí los detalles de la extensión desde `chrome://extensions/` y elegí **Opciones de extensión**.

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
