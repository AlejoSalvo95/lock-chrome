const form = document.getElementById("passwordForm");
const currentPassword = document.getElementById("currentPassword");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "error";
  message.textContent = "";

  if (newPassword.value !== confirmPassword.value) {
    message.textContent = "Las contraseñas nuevas no coinciden.";
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "CHANGE_PASSWORD",
    currentPassword: currentPassword.value,
    newPassword: newPassword.value
  });

  if (!response?.ok) {
    message.textContent = response?.error || "No se pudo cambiar la contraseña.";
    return;
  }

  form.reset();
  message.className = "success";
  message.textContent = "Contraseña cambiada correctamente.";
});
