document.addEventListener('DOMContentLoaded', function () {
  const registroForm = document.getElementById('registroForm');
  const mensaje = document.getElementById('mensajeRegistro');

  if (registroForm) {
    registroForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const formData = new FormData(this);
      
      // Seleccionar el botón DENTRO del evento
      const submitBtn = this.querySelector("button[type='submit']");
      submitBtn.disabled = true;

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
          // Reseleccionar para asegurar que existe
          const btnActual = document.getElementById("btn-registro");
          if (btnActual) btnActual.disabled = false;
        }
      } catch (error) {
        console.error("Error en registro:", error);
        mensaje.innerText = "Error de red o en la solicitud";
        mensaje.style.color = 'red';
        // Reseleccionar para asegurar que existe
        const btnActual = document.getElementById("btn-registro");
        if (btnActual) btnActual.disabled = false;
      }
    });

    function mostrarFormularioVerificacion(correo, tipo_user) {
      const contenedor = document.querySelector('.formulario_campos');
      contenedor.innerHTML = `
        <form id="verificacionForm" style="display: flex; flex-direction: column; gap: 15px;">
          <input type="text" name="Correo" value="${correo}" readonly style="background: #f0f0f0;" />
          <input type="text" name="Codigo" placeholder="Código de verificación" required />
          <button type="submit" style="padding: 10px; cursor: pointer;">Verificar</button>
        </form>
        <div style="text-align: center; margin-top: 15px;">
          <a href="#" id="btn-reenviar-codigo" 
             style="color: #3498db; 
                    text-decoration: underline; 
                    cursor: pointer;
                    font-size: 14px;
                    display: inline-block;">
            🔄 Reenviar código
          </a>
        </div>
      `;

      const form = document.getElementById('verificacionForm');
      const btnReenviar = document.getElementById('btn-reenviar-codigo');
      
      // Verificar que el botón existe
      console.log("Botón reenviar encontrado:", btnReenviar);
      
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        
        // Deshabilitar el botón del formulario actual
        const btnVerificar = this.querySelector("button[type='submit']");
        btnVerificar.disabled = true;
        
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
            }, 500);
          } else {
            mensaje.innerText = data.error || "Error en la verificación";
            mensaje.style.color = 'red';
            btnVerificar.disabled = false;
          }
        } catch (error) {
          console.error("Error en verificación:", error);
          mensaje.innerText = "Error de red o en la solicitud";
          mensaje.style.color = 'red';
          btnVerificar.disabled = false;
        }
      });
      
        if (btnReenviar) {
          btnReenviar.addEventListener('click', async function (e) {
            e.preventDefault();
            const textoOriginal = this.innerText;
            this.innerText = "Enviando...";
            
            try {
              const res = await fetch('/reenviar_codigo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 'Correo': correo}),
              });
            console.log("Reenviar respuesta:", correo);
            const data = await res.json();
            if (res.ok) {
              mensaje.innerText = "Código reenviado al correo.";
              mensaje.style.color = 'green';
            } else {
              mensaje.innerText = data.error || "Error al reenviar código";
              mensaje.style.color = 'red';
            }
          } catch (error) {
            console.error("Error al reenviar:", error);
            mensaje.innerText = "Error de red o en la solicitud";
            mensaje.style.color = 'red';
          } finally {
            this.innerText = textoOriginal;
          }
        });
      } else {
        console.error("ERROR: No se encontró el botón btn-reenviar-codigo");
      }
    }
  }
});