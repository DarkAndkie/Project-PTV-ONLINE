document.addEventListener('DOMContentLoaded', function () {
  const registroForm = document.getElementById('registroForm');
  const mensaje = document.getElementById('mensajeRegistro');

  if (registroForm) {
    registroForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const formData = new FormData(this);

      try {
        const res = await fetch('/registro_post', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok) {
          mensaje.innerText = "Código enviado al correo. Ingresa el código para activar tu cuenta.";
          mensaje.style.color = 'green';
          mostrarFormularioVerificacion(formData.get("Correo"), formData.get("Tipo_user"));
        } else {
          mensaje.innerText = data.error || "Error en el registro";
          mensaje.style.color = 'red';
        }
      } catch {
        mensaje.innerText = "Error de red o en la solicitud";
        mensaje.style.color = 'red';
      }
    });
  }

  function mostrarFormularioVerificacion(correo, tipo_user) {
    const contenedor = document.querySelector('.formulario_campos');
    contenedor.innerHTML = `
      <form id="verificacionForm">
        <input type="text" name="Correo" value="${correo}" readonly />
        <input type="text" name="Codigo" placeholder="Código de verificación" required />
        <button type="submit">Verificar</button>
      </form>
    `;

    const form = document.getElementById('verificacionForm');
    form.addEventListener('submit', async function (e) {
       registroForm.querySelector("button[type='submit']").disabled = true;
      e.preventDefault();
      const formData = new FormData(this);
      console.log("Verificando:", formData.get("Correo"), formData.get("Codigo"));
      try {
        const res = await fetch('/verificar_codigo', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok) {
          mensaje.innerText = data.message;
          mensaje.style.color = 'green';
                setTimeout(() => {
        window.location.href = data.direccion;
      }, 1500);
        } else {
          mensaje.innerText = data.error || "Error en la verificación";
          mensaje.style.color = 'red';
        }
      } catch {
        mensaje.innerText = "Error de red o en la solicitud";
        mensaje.style.color = 'red';
      }

      registroForm.reset();
    });
  }
});