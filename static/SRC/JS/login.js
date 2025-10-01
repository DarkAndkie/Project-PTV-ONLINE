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

        if (respuesta.ok) {
          const data = await respuesta.json();
          mensaje.innerText = `Bienvenido ${data.usuario}`;
          mensaje.style.color = 'green';

          setTimeout(() => {
            window.location.href = data.direccion;
          }, 3000);

          LoginForm.reset();
        } else {
          mensaje.innerText = 'Error: ' + await respuesta.text();
          mensaje.style.color = 'red';
        }
      } catch (error) {
        mensaje.innerText = 'Error de red o en la solicitud';
        mensaje.style.color = 'red';
      }
    });
  }
});