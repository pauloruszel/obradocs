const form = document.querySelector("#delete-form");
const submit = document.querySelector("#submit");
const message = document.querySelector("#message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!window.confirm("Excluir permanentemente sua conta e os dados indicados?")) return;

  submit.disabled = true;
  message.className = "";
  message.textContent = "Processando...";
  const email = form.email.value.trim();
  const senha = form.password.value;

  try {
    const login = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    if (!login.ok) throw new Error("E-mail ou senha inválidos.");
    const session = await login.json();

    const deletion = await fetch("/auth/account", {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ senha }),
    });
    if (!deletion.ok) throw new Error("Não foi possível excluir a conta.");

    form.remove();
    message.className = "success";
    message.textContent = "Conta excluída. Seus dados foram encaminhados para remoção.";
  } catch (error) {
    message.className = "error";
    message.textContent = error.message;
    submit.disabled = false;
  }
});
