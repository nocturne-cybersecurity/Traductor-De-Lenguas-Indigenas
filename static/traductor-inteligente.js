/**
 * Traductor Inteligente - Cliente
 * Comunica con el servidor Python/Node.js para traducciones mejoradas
 */

class TraductorInteligenteCliente {
    constructor() {
        this.baseURL = window.location.origin;
        this.diccionarioActual = null;
    }

    /**
     * Traduce una palabra usando el servidor inteligente
     * @param {string} palabra - Palabra a traducir
     * @param {string} diccionario - Archivo del diccionario (e.g., 'nahuatl.JSON')
     * @param {string} direccion - 'es_ind' o 'ind_es'
     * @returns {Promise<Object>} Resultado con traducción y confianza
     */
    async traducirPalabra(palabra, diccionario, direccion = 'es_ind') {
        try {
            const response = await fetch(`${this.baseURL}/api/traducir`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    diccionario: diccionario,
                    palabra: palabra,
                    direccion: direccion
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Error en traducción:', error);
            return {
                éxito: false,
                error: error.message,
                traduccion: null,
                confianza: 0
            };
        }
    }

    /**
     * Traduce una frase completa
     * @param {string} frase - Frase a traducir
     * @param {string} diccionario - Archivo del diccionario
     * @param {string} direccion - 'es_ind' o 'ind_es'
     * @returns {Promise<Object>} Resultado con frase traducida
     */
    async traducirFrase(frase, diccionario, direccion = 'es_ind') {
        try {
            const response = await fetch(`${this.baseURL}/api/traducir-frase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    diccionario: diccionario,
                    frase: frase,
                    direccion: direccion
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Error en traducción de frase:', error);
            return {
                éxito: false,
                error: error.message,
                frase_traducida: null,
                confianza: 0
            };
        }
    }

    /**
     * Formatea el resultado de traducción para mostrar en UI
     * @param {Object} resultado - Resultado del servidor
     * @returns {Object} Objeto formateado para UI
     */
    formatearResultado(resultado) {
        if (!resultado.éxito) {
            return {
                texto: "Traducción no encontrada",
                confianza: 0,
                tipo: 'error',
                alternativas: []
            };
        }

        const confianzaPorcentaje = Math.round(resultado.confianza * 100);
        let tipo = 'error';

        if (resultado.confianza === 1.0) {
            tipo = 'exacta'; // Coincidencia exacta
        } else if (resultado.confianza >= 0.85) {
            tipo = 'muy-buena'; // Muy buena
        } else if (resultado.confianza >= 0.70) {
            tipo = 'buena'; // Buena
        } else if (resultado.confianza >= 0.60) {
            tipo = 'aproximada'; // Aproximada
        }

        return {
            texto: resultado.traduccion || "No encontrada",
            confianza: confianzaPorcentaje,
            tipo: tipo,
            alternativas: resultado.alternativas || []
        };
    }

    /**
     * Crea un elemento visual para mostrar confianza
     * @param {number} confianza - Valor de confianza 0-1
     * @returns {string} HTML del indicador
     */
    crearIndicadorConfianza(confianza) {
        const porcentaje = Math.round(confianza * 100);
        const color = this.obtenerColorConfianza(confianza);

        return `
            <div class="confianza-container">
                <div class="confianza-label">Confianza: ${porcentaje}%</div>
                <div class="confianza-barra">
                    <div class="confianza-relleno" 
                         style="width: ${porcentaje}%; background-color: ${color};">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Obtiene color según nivel de confianza
     */
    obtenerColorConfianza(confianza) {
        if (confianza === 1.0) return '#4CAF50'; // Verde (exacta)
        if (confianza >= 0.85) return '#8BC34A'; // Verde claro (muy buena)
        if (confianza >= 0.70) return '#FFC107'; // Amarillo (buena)
        if (confianza >= 0.60) return '#FF9800'; // Naranja (aproximada)
        return '#f44336'; // Rojo (poca confianza)
    }

    /**
     * Obtiene etiqueta del tipo de coincidencia
     */
    obtenerEtiquetaTipo(tipo) {
        const etiquetas = {
            'exacta': '✓ Coincidencia exacta',
            'muy-buena': '✓✓ Muy buena coincidencia',
            'buena': '✓ Buena coincidencia',
            'aproximada': '≈ Coincidencia aproximada',
            'error': '✗ No encontrada'
        };
        return etiquetas[tipo] || 'Desconocida';
    }
}

// Instancia global
const traductorInteligente = new TraductorInteligenteCliente();
