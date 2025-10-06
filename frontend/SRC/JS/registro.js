document.addEventListener('DOMContentLoaded', function(){

    const registroForm = document.getElementById('registroForm');
  if(registroForm){
    registroForm.addEventListener('submit',async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const mensaje =  document.getElementById("mensajeRegistro");
        try{
            const respuesta = await fetch('/registro_post',{
            method: 'POST',
            body: formData
            });
            if(respuesta.ok){
              const data = await respuesta.json();
              mensaje.innerText = `Registro exitoso para ${data.Nombre}`;
              mensaje.style.color='green';
              registroForm.reset();
              
            }
            else{
              const error = await respuesta.text();
              mensaje.innerText = `${error}`;
              mensaje.style.color='red';

            }
        }

        catch(error){
          alert('Error de red o en la solicitud');
                 mensaje.innerText = 'Error de red o en la solicitud○';
        mensaje.style.color = 'red';

        }
    })
  }  
})