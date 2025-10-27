function renderAlbums() {
  return `
    <h3>Gestión de Álbums</h3>
    <form id="form-crear-album">
      <input type="text" id="nombre_album" placeholder="Nombre del álbum" required>
      <input type="text" id="descrip" placeholder="Descripción" required>
      <input type="text" id="caratula_dir" placeholder="URL de carátula" required>
      <input type="date" id="fecha_lanza" required>
      <select id="estado">
        <option value="borrador">Borrador</option>
        <option value="activo">Activo</option>
        <option value="deshabilitado">Deshabilitado</option>
      </select>
      <button type="submit">Guardar</button>
    </form>
    <table>
      <thead>
        <tr><th>ID</th><th>Nombre</th><th>Estado</th><th>Fecha</th></tr>
      </thead>
      <tbody id="tbody-albums"></tbody>
    </table>
  `;
}