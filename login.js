const form = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const confirmGroup = document.getElementById("confirmGroup");
const title = document.getElementById("title");
const description = document.getElementById("description");
const submitButton = document.getElementById("submitButton");
const error = document.getElementById("error");
let setupMode = false;

async function initialize() {
  const response = await chrome.runtime.sendMessage({ type: "PASSWORD_STATUS" });
  setupMode = !response?.configured;

  if (setupMode) {
    title.textContent = "Creá tu contraseña";
    description.textContent =
      "Se guardará localmente como un hash y no aparecerá en el código.";
    passwordInput.autocomplete = "new-password";
    confirmGroup.hidden = false;
    submitButton.textContent = "Guardar y desbloquear";
  }

  passwordInput.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";

  if (setupMode) {
    if (passwordInput.value.length < 6) {
      error.textContent = "Usá al menos 6 caracteres.";
      return;
    }

    if (passwordInput.value !== confirmPasswordInput.value) {
      error.textContent = "Las contraseñas no coinciden.";
      confirmPasswordInput.value = "";
      confirmPasswordInput.focus();
      return;
    }
  }

  const response = await chrome.runtime.sendMessage({
    type: setupMode ? "SET_PASSWORD" : "UNLOCK",
    password: passwordInput.value
  });

  if (!response?.ok) {
    error.textContent = response?.error || "No se pudo desbloquear el perfil.";
    passwordInput.value = "";
    confirmPasswordInput.value = "";
    passwordInput.focus();
  }
});

initialize().catch(() => {
  error.textContent = "No se pudo iniciar la configuración.";
});
