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
          // Guardar token
           if (data.token) {
    localStorage.setItem('token', data.token);
  }
  if (data.role) {
    localStorage.setItem('userRole', data.role);
  }

  mensaje.innerText = `Bienvenido ${data.usuario}`;
  mensaje.style.color = 'green';

  setTimeout(() => {
    // REEMPLAZA el historial: no se puede volver con "adelante"
    window.location.replace(data.direccion);
  }, 600);
  LoginForm.reset();
        } else if (data.requiere_verificacion == true) {
          mensaje.innerText = data.error;
          mensaje.style.color = 'orange';
          
          setTimeout(() => {
            mostrarFormularioVerificacion(data.correo);
          }, 500);
          
        } else {
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

  function mostrarFormularioVerificacion(correo) {
    const contenedor = document.querySelector('.login_apartado');
    
    if (!contenedor) {
      console.error('❌ No se encontró .login_apartado');
      return;
    }

    contenedor.innerHTML = `
      <div class="cabecera_Login">
        <h4>✉️ Verificación de correo</h4>
        <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">
          Código enviado a: <strong style="color: #16213e;">${correo}</strong>
        </p>
      </div>

      <form id="verificacionForm" style="display: flex; flex-direction: column; gap: 20px;">
        <div class="usuario_form">
          <input type="text" name="Correo" value="${correo}" readonly style="background: #ecf0f1; cursor: not-allowed;" />
        </div>
        
        <div class="password_form">
          <input 
            type="text" 
            name="Codigo" 
            placeholder="Código de 6 dígitos" 
            required 
            maxlength="6"
            style="text-align: center; letter-spacing: 8px; font-size: 20px; font-weight: bold;"
          />
        </div>
        
        <div class="sesion_foot">
          <input type="submit" value="Verificar código" id="btnVerificar" />
        </div>
      </form>
      
      <div class="formulario_footer" style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
        <button type="button" id="reenviarCodigo" style="
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(45deg, #f39c12, #e67e22);
          color: white;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          🔄 Reenviar código
        </button>
        
        <button type="button" id="volverLogin" style="
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(45deg, #10b981, #14b8a6);
          color: white;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          ← Volver al login
        </button>
      </div>
    `;

    // ✅ Aplicar efectos hover después de crear elementos
    setTimeout(() => {
      const btnReenviar = document.getElementById('reenviarCodigo');
      const btnVolver = document.getElementById('volverLogin');

      if (btnReenviar) {
        btnReenviar.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 5px 15px rgba(243, 156, 18, 0.4)';
        });
        btnReenviar.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = 'none';
        });
      }

      if (btnVolver) {
        btnVolver.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 5px 15px rgba(149, 165, 166, 0.4)';
        });
        btnVolver.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = 'none';
        });
      }
    }, 50);

    const form = document.getElementById('verificacionForm');
    const btnReenviar = document.getElementById('reenviarCodigo');
    const btnVolver = document.getElementById('volverLogin');

    // ✅ SUBMIT: Verificar código
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const submitBtn = document.getElementById('btnVerificar');
      const originalValue = submitBtn.value;
      
      submitBtn.disabled = true;
      submitBtn.value = "Verificando...";
      submitBtn.style.opacity = "0.6";
      submitBtn.style.cursor = "not-allowed";
      
      const formData = new FormData(this);
      console.log("Verificando:", formData.get("Correo"), formData.get("Codigo"));
      
      try {
        const res = await fetch('/verificar_codigo', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        
        if (res.ok) {
          mensaje.innerText = data.message || "✅ Correo verificado correctamente";
          mensaje.style.color = 'green';
          
          submitBtn.value = "✅ Verificado";
          
          setTimeout(() => {
            window.location.href = data.direccion;
          }, 1500);
        } else {
          mensaje.innerText = data.error || "❌ Código inválido o expirado";
          mensaje.style.color = 'red';
          
          submitBtn.disabled = false;
          submitBtn.value = originalValue;
          submitBtn.style.opacity = "1";
          submitBtn.style.cursor = "pointer";
        }
      } catch (error) {
        console.error('❌ Error:', error);
        mensaje.innerText = "❌ Error de red al verificar";
        mensaje.style.color = 'red';
        
        submitBtn.disabled = false;
        submitBtn.value = originalValue;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }
    });

    // ✅ BOTÓN: Reenviar código
    btnReenviar.addEventListener('click', async function() {
      const originalText = this.innerHTML;
      this.disabled = true;
      this.innerHTML = "📧 Enviando...";
      this.style.opacity = "0.6";
      
      mensaje.innerText = "📧 Reenviando código...";
      mensaje.style.color = 'blue';
      
      try {
        const formData = new FormData();
        formData.append('Correo', correo);
        
        const res = await fetch('/reenviar_codigo', {
          method: 'POST',
          body: formData
        });
        
        const data = await res.json();
        console.log('📥 Respuesta reenvío:', data);
        
        if (res.ok) {
          mensaje.innerText = "✅ " + (data.message || "Código reenviado. Revisa tu correo.");
          mensaje.style.color = 'green';
        } else {
          mensaje.innerText = "❌ " + (data.error || "Error al reenviar código");
          mensaje.style.color = 'red';
        }
      } catch (error) {
        console.error('❌ Error:', error);
        mensaje.innerText = "❌ Error de red al reenviar código";
        mensaje.style.color = 'red';
      } finally {
        this.disabled = false;
        this.innerHTML = originalText;
        this.style.opacity = "1";
      }
    });
    
    // ✅ BOTÓN: Volver al login
    btnVolver.addEventListener('click', function() {
      location.reload();
    });
  }
});