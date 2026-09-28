// CAMBIÁ ESTA CLAVE.
// Nota: una extensión local no puede ocultar una contraseña frente a alguien
// con acceso técnico al perfil. Esto es una barrera práctica, no seguridad fuerte.
const PASSWORD = "1234";

const form = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const error = document.getElementById("error");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";

  if (passwordInput.value !== PASSWORD) {
    error.textContent = "Contraseña incorrecta.";
    passwordInput.value = "";
    passwordInput.focus();
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: "UNLOCK" });

  if (!response?.ok) {
    error.textContent = "No se pudo desbloquear el perfil.";
  }
});
