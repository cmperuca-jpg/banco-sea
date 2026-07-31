document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const erro = document.getElementById("erro");
  const btnEntrar = document.getElementById("btnEntrar");
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  const btnAlternarSenha = document.getElementById("btnAlternarSenha");

  if (!form || !erro || !btnEntrar || !email || !senha) return;

  function definirVisibilidadeSenha(mostrar) {
    senha.type = mostrar ? "text" : "password";

    if (!btnAlternarSenha) return;

    const rotulo = mostrar ? "Ocultar senha" : "Mostrar senha";
    btnAlternarSenha.classList.toggle("is-visible", mostrar);
    btnAlternarSenha.setAttribute("aria-pressed", String(mostrar));
    btnAlternarSenha.setAttribute("aria-label", rotulo);
    btnAlternarSenha.title = rotulo;
  }

  btnAlternarSenha?.addEventListener("click", () => {
    const mostrar = senha.type === "password";
    definirVisibilidadeSenha(mostrar);
    senha.focus({ preventScroll: true });

    try {
      const final = senha.value.length;
      senha.setSelectionRange(final, final);
    } catch {}
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    erro.textContent = "";

    if (!form.reportValidity()) return;

    if (!window.FusionAuth || typeof FusionAuth.login !== "function") {
      erro.textContent = "O serviço de autenticação não foi carregado. Atualize a página e tente novamente.";
      return;
    }

    btnEntrar.disabled = true;
    btnEntrar.textContent = "Entrando...";
    form.setAttribute("aria-busy", "true");

    try {
      const usuario = await FusionAuth.login(email.value.trim(), senha.value);
      const params = new URLSearchParams(location.search);
      const next = params.get("next");
      window.location.href = next || FusionAuth.destinoPorPerfil(usuario);
    } catch (err) {
      erro.textContent = err?.message || "Não foi possível entrar. Confira os dados informados.";
      senha.focus();
      senha.select();
    } finally {
      btnEntrar.disabled = false;
      btnEntrar.textContent = "Entrar";
      form.removeAttribute("aria-busy");
    }
  });
});
