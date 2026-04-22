// status-patch.js — pequeño parche para actualizar el dot de estado
(function() {
  const dot = document.getElementById('status-dot');
  const statusEl = document.getElementById('status');
  const dictEl = document.getElementById('diccionario-estado');

  if (!dot || !statusEl) return;

  // Observar cambios en el texto de estado
  const observer = new MutationObserver(() => {
    const text = (statusEl.textContent + (dictEl ? dictEl.textContent : '')).toLowerCase();
    dot.className = 'status-dot';
    if (text.includes('cargando') || text.includes('selecciona')) {
      dot.classList.add('loading');
    } else if (text.includes('éxito') || text.includes('cargado') || text.includes('palabras')) {
      dot.classList.add('loaded');
    } else if (text.includes('error')) {
      dot.classList.add('error');
    }
  });

  observer.observe(statusEl, { childList: true, characterData: true, subtree: true });
  if (dictEl) observer.observe(dictEl, { childList: true, characterData: true, subtree: true });
})();