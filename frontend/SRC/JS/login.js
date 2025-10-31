document.addEventListener('DOMContentLoaded', function () {
  const LoginForm = document.getElementById('formulario_login');
  const mensaje = document.getElementById('mensaje_login');

  if (LoginForm) {
    LoginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const formData = new FormData(this);

      try {
        const respuesta = await fetch('/login_Post', {
          method: 'POST',
          body: formData
        });

        const data = await respuesta.json();
        console.log('📥 Respuesta login:', data);

        if (respuesta.ok) {
          // ✅ Login exitoso
          mensaje.innerText = `Bienvenido ${data.usuario}`;
          mensaje.style.color = 'green';

          setTimeout(() => {
            window.location.href = data.direccion;
          }, 1500);

          LoginForm.reset();
          
        } else if (data.requiere_verificacion==true) {
          // ✅ CASO ESPECIAL: Necesita verificar correo
          mensaje.innerText = data.error;
          mensaje.style.color = 'orange';
          
          // Mostrar formulario de verificación
          setTimeout(() => {
            mostrarFormularioVerificacion(data.correo);
          }, 500);
          
        } else {
          // ❌ Error normal
          mensaje.innerText = data.error || 'Error al iniciar sesión';
          mensaje.style.color = 'red';
        }
        
      } catch (error) {
        console.error('❌ Error:', error);
        mensaje.innerText = 'Error de red o en la solicitud';
        mensaje.style.color = 'red';
      }
    });
  }

  // ✅ FUNCIÓN PARA MOSTRAR VERIFICACIÓN
  function mostrarFormularioVerificacion(correo) {
    const contenedor = LoginForm;
    
    if (!contenedor) {
      console.error('❌ No se encontró el contenedor del formulario');
      return;
    }

    contenedor.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #2c3e50;">✉️ Verificación de correo</h2>
        <p style="margin: 20px 0;">Se ha enviado un código a:</p>
        <p style="font-weight: bold; color: #3498db; font-size: 18px;">${correo}</p>
        
        <form id="verificacionForm" style="margin-top: 30px;">
          <input type="hidden" name="Correo" value="${correo}" />
          
          <div style="margin-bottom: 20px;">
            <input 
              type="text" 
              name="Codigo" 
              placeholder="Ingresa el código de 6 dígitos" 
              required 
              maxlength="6"
              style="padding: 12px; font-size: 18px; text-align: center; letter-spacing: 5px; width: 250px; border: 2px solid #3498db; border-radius: 5px;"
            />
          </div>
          
          <button 
            type="submit" 
            style="background: #27ae60; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px;">
            ✅ Verificar código
          </button>
          
          <button 
            type="button" 
            id="reenviarCodigo"
            style="background: #3498db; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px;">
            🔄 Reenviar código
          </button>
          
          <button 
            type="button" 
            id="volverLogin"
            style="background: #95a5a6; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px;">
            ← Volver al login
          </button>
        </form>
        
        <p id="mensajeVerificacion" style="margin-top: 20px; font-weight: bold;"></p>
      </div>
    `;

    const mensajeVerif = document.getElementById('mensajeVerificacion');
    const form = document.getElementById('verificacionForm');
    
    // ✅ SUBMIT: Verificar código
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const formData = new FormData(this);
      
      mensajeVerif.innerText = "Verificando...";
      mensajeVerif.style.color = "blue";

      try {
        const res = await fetch('/verificar_codigo', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        
        if (res.ok) {
          mensajeVerif.innerText = data.message || "✅ Correo verificado correctamente";
          mensajeVerif.style.color = 'green';
          
          setTimeout(() => {
            window.location.href = data.direccion || '/';
          }, 1500);
        } else {
          mensajeVerif.innerText = data.error || "❌ Código inválido o expirado";
          mensajeVerif.style.color = 'red';
        }
      } catch (error) {
        console.error('❌ Error:', error);
        mensajeVerif.innerText = "❌ Error de red al verificar";
        mensajeVerif.style.color = 'red';
      }
    });

    // ✅ BOTÓN: Reenviar código
    document.getElementById('reenviarCodigo').addEventListener('click', async function() {
      this.disabled = true;
      this.innerText = "Enviando...";
      
      mensajeVerif.innerText = "Reenviando código...";
      mensajeVerif.style.color = 'blue';
      
      try {
        const formData = new FormData();
        formData.append('Correo', correo);
        
        const res = await fetch('/reenviar_codigo', {
          method: 'POST',
          body: formData
        });
        
        const data = await res.json();
        
        if (res.ok) {
          mensajeVerif.innerText = "✅ " + data.message;
          mensajeVerif.style.color = 'green';
        } else {
          mensajeVerif.innerText = "❌ " + data.error;
          mensajeVerif.style.color = 'red';
        }
      } catch (error) {
        console.error('❌ Error:', error);
        mensajeVerif.innerText = "❌ Error al reenviar código";
        mensajeVerif.style.color = 'red';
      } finally {
        this.disabled = false;
        this.innerText = "🔄 Reenviar código";
      }
    });
    
    // ✅ BOTÓN: Volver al login
    document.getElementById('volverLogin').addEventListener('click', function() {
      location.reload();
    });
  }
});