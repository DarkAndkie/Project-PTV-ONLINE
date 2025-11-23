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
        console.log('🔥 Respuesta login:', data);
        
        if (respuesta.ok) {
          // ✅ Generar ID único de sesión
          const sessionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          
          // ✅ Guardar TODOS los datos del usuario
          localStorage.setItem('token', data.token);
          localStorage.setItem('tipo_user', data.tipo_user);
          localStorage.setItem('id_user', data.id_user);
          localStorage.setItem('session_id', sessionId); // ✅ NUEVO
          
          console.log('✅ Sesión iniciada con ID:', sessionId);

          mensaje.innerText = `Bienvenido ${data.usuario}`;
          mensaje.style.color = 'green';

          setTimeout(() => {
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

  

  async function traer_Caratulas(){
    const res = await fetch("/api/Buscar_Albums_Aleatorios",{
      method:'GET',
    })
    return await res.json();
  }
  async  function tarjetas_loader(){
  const contenedor = document.querySelector(".fondo_cartas");
  const template = document.getElementById("plantilla-tarjeta");

  contenedor.innerHTML='';
  const datos = await traer_Caratulas();
  console.log("📦 Datos recibidos:", datos);
  datos.forEach((album, index) => {
    const clon=template.content.cloneNode(true);
    //vmos a añadir las id de cada tarjeta
    const tarjeta=clon.querySelector('.tarjeta');
    tarjeta.classList.add((`tarjeta_${index+1}`))
    clon.querySelector("img").src=album.caratula_dir;
    clon.querySelector("img").alt="Caratula";
    const contenido =clon.querySelector(".contenido");
    const fecha_album = new Date(album.fecha_lanza);
    const fecha_regionalizada = fecha_album.toLocaleDateString("es-CO",{
      year:"numeric",
      month:"long",
      day:"numeric",
    });
    contenido.innerHTML=`
    <h4>${album.nombre_album}</h4>
    <p>${fecha_regionalizada}</p>

    `
    contenedor.appendChild(clon);
  });
  template.remove();
 }
 tarjetas_loader();
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
  // ========================================
  // RECUPERACIÓN DE CONTRASEÑA
  // ========================================
  const recuperarLink = document.getElementById("recuperarPassword")
  if (recuperarLink) {
    recuperarLink.addEventListener("click", (e) => {
      e.preventDefault()
      mostrarFormularioRecuperacion()
    })
  }

  function mostrarFormularioRecuperacion() {
    const contenedor = document.querySelector('.login_apartado')
    
    if (!contenedor) {
      console.error('❌ No se encontró .login_apartado')
      return
    }
    
    contenedor.innerHTML = `
      <div class="cabecera_Login">
        <h4>🔑 Recuperar Contraseña</h4>
        <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">
          Ingresa tu correo para recibir un código de verificación
        </p>
      </div>

      <form id="recuperarForm" style="display: flex; flex-direction: column; gap: 20px;">
        <div class="usuario_form">
          <input type="email" name="Correo" placeholder="Tu correo registrado" required />
        </div>
        
        <div class="sesion_foot">
          <button type="submit" id="btnEnviarCodigo" style="width: 100%; padding: 12px; background: linear-gradient(45deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
            Enviar código
          </button>
        </div>
        
        <div id="mensaje_recuperar" style="text-align: center; margin-top: 10px;"></div>
      </form>
      
      <div class="formulario_footer" style="margin-top: 15px; text-align: center;">
        <button type="button" id="volverLogin" style="background: none; border: none; color: #3498db; cursor: pointer; text-decoration: underline; font-size: 14px;">
          ← Volver al login
        </button>
      </div>
    `
    
    const form = document.getElementById("recuperarForm")
    const mensajeDiv = document.getElementById("mensaje_recuperar")
    
    form.addEventListener("submit", async (e) => {
      e.preventDefault()
      const email = e.target.Correo.value.trim()
      const btnEnviar = document.getElementById("btnEnviarCodigo")
      
      if (!email) {
        mensajeDiv.innerHTML = '<p style="color: #e74c3c;">❌ Ingresa un correo</p>'
        return
      }
      
      btnEnviar.disabled = true
      btnEnviar.textContent = "Enviando..."
      mensajeDiv.innerHTML = '<p style="color: #3498db;">📧 Enviando código...</p>'
      
      try {
        const resp = await fetch('/api/recuperar-password/enviar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo: email })
        })
        
        const data = await resp.json()
        
        if (resp.ok) {
          mensajeDiv.innerHTML = '<p style="color: #27ae60;">✅ ' + data.message + '</p>'
          setTimeout(() => {
            mostrarFormularioCambioPassword(email)
          }, 1500)
        } else {
          mensajeDiv.innerHTML = '<p style="color: #e74c3c;">❌ ' + (data.error || 'Error al enviar código') + '</p>'
          btnEnviar.disabled = false
          btnEnviar.textContent = "Enviar código"
        }
      } catch (error) {
        console.error('❌ Error:', error)
        mensajeDiv.innerHTML = '<p style="color: #e74c3c;">❌ Error de conexión</p>'
        btnEnviar.disabled = false
        btnEnviar.textContent = "Enviar código"
      }
    })
    
    document.getElementById("volverLogin").addEventListener("click", () => {
      location.reload()
    })
  }

  function mostrarFormularioCambioPassword(email) {
    const contenedor = document.querySelector('.login_apartado')
    
    contenedor.innerHTML = `
      <div class="cabecera_Login">
        <h4>🔐 Nueva Contraseña</h4>
        <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">
          Código enviado a: <strong>${email}</strong>
        </p>
      </div>

      <form id="cambioPasswordForm" style="display: flex; flex-direction: column; gap: 15px;">
        <div class="usuario_form">
          <input type="text" name="Codigo" placeholder="Código de 6 dígitos" required maxlength="6" style="text-align: center; letter-spacing: 5px; font-size: 18px; font-weight: bold;" />
        </div>
        
        <div class="password_form">
          <input type="password" name="NuevaPassword" placeholder="Nueva contraseña" required />
          <small style="color: #7f8c8d; font-size: 12px; display: block; margin-top: 5px;">
            Mínimo 8 caracteres, incluye letras, números y símbolos
          </small>
        </div>
        
        <div class="sesion_foot">
          <button type="submit" id="btnCambiar" style="width: 100%; padding: 12px; background: linear-gradient(45deg, #27ae60, #2ecc71); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
            Cambiar contraseña
          </button>
        </div>
        
        <div id="mensaje_cambio" style="text-align: center; margin-top: 10px;"></div>
      </form>
      
      <button type="button" id="volverLogin" style="margin-top: 10px; background: none; border: none; color: #3498db; cursor: pointer; text-decoration: underline; font-size: 14px;">
        ← Volver al login
      </button>
    `
    
    const form = document.getElementById("cambioPasswordForm")
    const mensajeDiv = document.getElementById("mensaje_cambio")
    
    form.addEventListener("submit", async (e) => {
  e.preventDefault()
  const btnCambiar = document.getElementById("btnCambiar")
  
  const formData = new FormData()
  formData.append('Correo', email)
  formData.append('Codigo', e.target.Codigo.value.trim())
  formData.append('NuevaPassword', e.target.NuevaPassword.value)
  
  btnCambiar.disabled = true
  btnCambiar.textContent = "Cambiando..."
  mensajeDiv.innerHTML = '<p style="color: #3498db;">🔄 Actualizando contraseña...</p>'
  
  try {
    const resp = await fetch('/api/recuperar-password/cambiar', {
      method: 'POST',
      body: formData
    })
    
    const data = await resp.json()
    
    if (resp.ok) {
      mensajeDiv.innerHTML = '<p style="color: #27ae60;">✅ ' + data.message + '</p>'
      
      // ✅ LIMPIAR TOKEN VIEJO
      localStorage.removeItem('token')
      localStorage.removeItem('tipo_user')
      localStorage.removeItem('id_user')
      
      setTimeout(() => {
        location.reload() // Vuelve al login
      }, 500)
    } else {
      mensajeDiv.innerHTML = '<p style="color: #e74c3c;">❌ ' + (data.error || 'Error al cambiar contraseña') + '</p>'
      btnCambiar.disabled = false
      btnCambiar.textContent = "Cambiar contraseña"
    }
  } catch (error) {
    console.error('❌ Error:', error)
    mensajeDiv.innerHTML = '<p style="color: #e74c3c;">❌ Error de conexión</p>'
    btnCambiar.disabled = false
    btnCambiar.textContent = "Cambiar contraseña"
  }
})
    
    document.getElementById("volverLogin").addEventListener("click", () => location.reload())
  }

}); 
