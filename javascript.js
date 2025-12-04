// =============================================
// SISTEMA DE SÍNTESIS DE VOZ PARA LENGUAS INDÍGENAS
// =============================================

class SintesisVozIndigena {
    constructor() {
        this.vocesDisponibles = [];
        this.cargarVoces();
    }

    cargarVoces() {
        // Esperar a que las voces estén disponibles
        window.speechSynthesis.onvoiceschanged = () => {
            this.vocesDisponibles = window.speechSynthesis.getVoices();
            console.log('Voces disponibles:', this.vocesDisponibles.map(v => v.name));
        };
    }

    // Reglas de pronunciación aproximada para lenguas indígenas
    crearReglasFoneticas(idioma) {
        const reglas = {
            'nahuatl': {
                'x': 'sh',
                'tl': 't-l',
                'tz': 'ts',
                'cu': 'kw',
                'hu': 'w',
                'qu': 'k',
                'c': 'k',
                'z': 's'
            },
            'mixteco': {
                'dx': 'dʲ',
                'tx': 'tʲ', 
                'ch': 'tʃ',
                'ñ': 'ɲ',
                'x': 'ʃ'
            },
            'zapoteco': {
                'zh': 'ʒ',
                'x': 'ʃ',
                'qu': 'k',
                'ch': 'tʃ'
            },
            'totonaco': {
                'ch': 'tʃ',
                'lh': 'ɬ',
                'x': 'ʃ',
                'qu': 'k'
            },
            'maya': {
                'x': 'sh',
                'ch': 'tʃ',
                'tz': 'ts',
                'pp': 'pʼ',
                'tt': 'tʼ'
            }
        };
        return reglas[idioma] || {};
    }

    convertirFoneticamente(texto, idioma) {
        let textoFonetico = texto.toLowerCase();
        const reglas = this.crearReglasFoneticas(idioma);
        
        // Aplicar reglas de reemplazo
        Object.keys(reglas).forEach(original => {
            const regex = new RegExp(original, 'g');
            textoFonetico = textoFonetico.replace(regex, reglas[original]);
        });

        return textoFonetico;
    }

    hablar(texto, idioma = 'es') {
        if (!('speechSynthesis' in window)) {
            this.mostrarErrorNavegador();
            return false;
        }

        // Detener habla anterior
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance();
        
        // Si es español, usar voz normal
        if (idioma === 'es') {
            utterance.text = texto;
            utterance.lang = 'es-ES';
        } else {
            // Para lenguas indígenas, usar fonética aproximada
            const textoFonetico = this.convertirFoneticamente(texto, idioma);
            utterance.text = textoFonetico;
            utterance.lang = 'es-ES'; // Usar español como base
        }

        // Configurar voz
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Seleccionar mejor voz disponible
        const vocesEspanol = this.vocesDisponibles.filter(voz => 
            voz.lang.includes('es') || voz.lang.includes('ES')
        );
        
        if (vocesEspanol.length > 0) {
            utterance.voice = vocesEspanol[0];
        }

        utterance.onerror = (event) => {
            console.error('Error en síntesis de voz:', event);
        };

        window.speechSynthesis.speak(utterance);
        return true;
    }

    mostrarErrorNavegador() {
        alert('Tu navegador no soporta síntesis de voz. Prueba con Chrome, Edge o Safari.');
    }
}

// Inicializar el sistema de voz
const sintesisVoz = new SintesisVozIndigena();

// =============================================
// CÓDIGO ORIGINAL DEL TRADUCTOR (MODIFICADO)
// =============================================

let diccionarioEsIndigena = {};
let diccionarioIndigenaEs = {};

const idiomaSelect = document.getElementById('idioma_select');
const textoEntrada = document.getElementById('texto_entrada');
const direccionSelect = document.getElementById('direccion_select');
const traducirBtn = document.getElementById('traducir-btn');
const traduccionTexto = document.getElementById('traduccion-texto');
const diccionarioEstado = document.getElementById('diccionario-estado');
const contadorPalabras = document.getElementById('contador-palabras');

// Función para mostrar controles de audio
function mostrarControlesAudio(textoOriginal, textoTraducido, direccion, idiomaSeleccionado) {
    let controles = document.getElementById('controles-audio');
    
    if (!controles) {
        controles = document.createElement('div');
        controles.id = 'controles-audio';
        controles.style.marginTop = '15px';
        controles.style.padding = '15px';
        controles.style.border = '1px solid #d7ccc8';
        controles.style.borderRadius = '3px';
        controles.style.backgroundColor = '#fffbe6';
        controles.style.textAlign = 'center';
        
        controles.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #ccaa00;">🔊 Escuchar pronunciación:</div>
            <button id="btn-audio-original" class="btn-audio" style="margin-right: 10px; padding: 10px 15px;">
                Texto original
            </button>
            <button id="btn-audio-traducido" class="btn-audio" style="padding: 10px 15px;">
                Traducción
            </button>
        `;
        
        // Insertar después de la sección de resultado
        const resultadoSection = document.querySelector('.resultado');
        resultadoSection.parentNode.insertBefore(controles, resultadoSection.nextSibling);
    } else {
        controles.style.display = 'block';
    }

    // Event listeners para los botones
    document.getElementById('btn-audio-original').onclick = () => {
        const idiomaAudio = direccion === 'espanol' ? 'es' : idiomaSeleccionado;
        sintesisVoz.hablar(textoOriginal, idiomaAudio);
    };

    document.getElementById('btn-audio-traducido').onclick = () => {
        const idiomaAudio = direccion === 'espanol' ? idiomaSeleccionado : 'es';
        sintesisVoz.hablar(textoTraducido, idiomaAudio);
    };
}

function ocultarControlesAudio() {
    const controles = document.getElementById('controles-audio');
    if (controles) {
        controles.style.display = 'none';
    }
}

/**
 * Carga el archivo JSON del idioma seleccionado y construye los diccionarios.
 * @param {string} filename - Nombre del archivo JSON (e.g., 'nahuatl.json')
 */

try {
    const response = await fetch(`./${filename}`);
    if (!response.ok) {
        throw new Error(`Error al cargar el archivo: ${response.statusText}`);
    }
    const datos = await response.json();
    diccionarioEsIndigena = {};
    diccionarioIndigenaEs = {};

    let idiomaIndigenaKey = '';
    if (datos.length > 0) {
        const claves = Object.keys(datos[0]);
        idiomaIndigenaKey = claves.find(k => k.toLowerCase() !== 'espanol' && k.toLowerCase() !== 'español');
    }

    if (!idiomaIndigenaKey) {
        throw new Error("Estructura JSON inválida. No se encontró la clave del idioma indígena.");
    }

    datos.forEach(entrada => {
        
        const espanol = entrada.espanol || entrada["español"]
            ? (entrada.espanol || entrada["español"]).toLowerCase().trim()
            : '';

        const indigena = entrada[idiomaIndigenaKey]
            ? entrada[idiomaIndigenaKey].toLowerCase().trim()
            : '';

        if (espanol && indigena) {
            diccionarioEsIndigena[espanol] = indigena;
            diccionarioIndigenaEs[indigena] = espanol;
        }
    });


        traducirBtn.disabled = false;
        diccionarioEstado.textContent =
            `Diccionario ${filename} cargado - ${Object.keys(diccionarioEsIndigena).length} palabras`;

    } catch (err) {
        console.error(err);
        diccionarioEstado.textContent = `Error cargando ${filename}: ${err.message}`;
        traducirBtn.disabled = true;
    }
}


        diccionarioEstado.textContent = `Estado: Diccionario ${idiomaIndigenaKey.toUpperCase()} cargado con éxito.`;
        contadorPalabras.textContent = `(${Object.keys(diccionarioEsIndigena).length} palabras)`;
        traducirBtn.disabled = false;
        traduccionTexto.textContent = "¡Listo para traducir!";

    } catch (error) {
        console.error("Error al procesar el diccionario:", error);
        diccionarioEstado.textContent = `Estado: ERROR en la carga o estructura.`;
        contadorPalabras.textContent = "";
        traducirBtn.disabled = true;
    }
}

function traducir(event) {
    event.preventDefault();

    const palabra = textoEntrada.value.trim();
    const direccion = direccionSelect.value;
    const idiomaSeleccionado = idiomaSelect.value ? idiomaSelect.value.replace('.JSON', '').toLowerCase() : '';
    
    let resultado = "Traducción no encontrada.";
    let diccionarioBusqueda = {};

    if (!palabra) {
        traduccionTexto.textContent = "Introduce una palabra.";
        ocultarControlesAudio();
        return;
    }

    if (direccion === 'espanol') {
        diccionarioBusqueda = diccionarioEsIndigena;
    } else {
        diccionarioBusqueda = diccionarioIndigenaEs;
    }

    const traduccion = diccionarioBusqueda[palabra.toLowerCase()];

    if (traduccion) {
        resultado = traduccion.charAt(0).toUpperCase() + traduccion.slice(1);
        
        // Mostrar controles de audio
        mostrarControlesAudio(palabra, resultado, direccion, idiomaSeleccionado);
    } else {
        ocultarControlesAudio();
        resultado = "Traducción no encontrada.";
    }

    traduccionTexto.textContent = resultado;
}

idiomaSelect.addEventListener('change', (e) => {
    const filename = e.target.value;
    if (filename) {
        cargarDiccionario(filename);
    } else {
        diccionarioEstado.textContent = "Estado: Esperando selección de idioma.";
        contadorPalabras.textContent = "";
        traducirBtn.disabled = true;
        ocultarControlesAudio();
    }
});

document.getElementById('translator-form').addEventListener('submit', traducir);

textoEntrada.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        traducir(e);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const idiomaSelect = document.getElementById('idioma_select');
    const textoEntrada = document.getElementById('texto_entrada');
    const direccionSelect = document.getElementById('direccion_select');
    const traducirBtn = document.getElementById('traducir-btn');
    const resultado = document.getElementById('traduccion-texto');
    const status = document.getElementById('status');

    const languages = [
        { filename: 'mixteco.JSON', label: 'Mixteco' },
        { filename: 'nahuatl.JSON', label: 'Náhuatl' },
        { filename: 'totonaco.JSON', label: 'Totonaco' },
        { filename: 'zapoteco.JSON', label: 'Zapoteco' },
        { filename: 'maya.JSON', label: 'Maya' },
        { filename: 'otomi.JSON', label: 'Otomi' }
    ];

    languages.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.filename;
        opt.textContent = l.label;
        idiomaSelect.appendChild(opt);
    });

    // NORMALIZACIÓN MEJORADA - preserva caracteres importantes
    function normalize(str) {
        return String(str || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // quita acentos pero mantiene ñ
            // Mantiene apostrofes, comas, guiones que son importantes en idiomas indígenas
            .replace(/[^\p{L}0-9\s',\-]/gu, '')
            .toLowerCase()
            .trim();
    }

    let mapEsToInd = {};
    let mapIndToEs = {};
    let loadedFilename = '';
    let currentLangKey = '';

try {
    const response = await fetch(`./${filename}`);
    if (!response.ok) {
        throw new Error(`Error al cargar el archivo: ${response.statusText}`);
    }
    const datos = await response.json();
    diccionarioEsIndigena = {};
    diccionarioIndigenaEs = {};

    let idiomaIndigenaKey = '';
    if (datos.length > 0) {
        const claves = Object.keys(datos[0]);
        idiomaIndigenaKey = claves.find(k => k.toLowerCase() !== 'espanol');
    }

    if (!idiomaIndigenaKey) {
        throw new Error("Estructura JSON inválida. No se encontró la clave del idioma indígena.");
    }

    datos.forEach(entrada => {
        const espanol = entrada.espanol ? entrada.espanol.toLowerCase().trim() : '';
        const indigena = entrada[idiomaIndigenaKey] ? entrada[idiomaIndigenaKey].toLowerCase().trim() : '';

        if (espanol && indigena) {
            // Dirección 1: Español -> Indígena
            diccionarioEsIndigena[espanol] = indigena;
            // Dirección 2: Indígena -> Español
            diccionarioIndigenaEs[indigena] = espanol;
        }
    });
    

} catch (err) {
    console.error(err);
    status.textContent = `Error cargando ${filename}: ${err.message}`;
    traducirBtn.disabled = true;
}

    // FUNCIÓN MEJORADA - BUSCA TRADUCCIONES MÁS PRECISAS
    function translatePhrase(text, direction) {
        const parts = text.split(/(\s+|[.,!?;:()\[\]{}"“”«»]+)/);
        
        const resultadosPorPalabra = parts.map(part => {
            if (!part || /^\s+$/.test(part) || /^[.,!?;:()\[\]{}"“”«»]+$/.test(part)) {
                return { original: part, traducciones: [part] };
            }

            const key = normalize(part);
            const diccionario = direction === 'espanol' ? mapEsToInd : mapIndToEs;
            
            // PRIMERO: búsqueda exacta (la más importante)
            if (diccionario[key]) {
                return { 
                    original: part, 
                    traducciones: [diccionario[key]]
                };
            }
            
            // SEGUNDO: búsqueda de variantes (menos estricta)
            const todasCoincidencias = Object.entries(diccionario)
                .filter(([palabraDiccionario]) => {
                    // Coincidencia exacta de palabra completa
                    if (palabraDiccionario === key) return true;
                    
                    // Coincidencia de variantes (palabras que contengan la búsqueda)
                    const palabrasBuscadas = key.split(/\s+/);
                    const palabrasDiccionario = palabraDiccionario.split(/\s+/);
                    
                    return palabrasBuscadas.some(pb => 
                        palabrasDiccionario.some(pd => pd.includes(pb) || pb.includes(pd))
                    );
                })
                .map(([, traduccion]) => traduccion);

            const traducciones = todasCoincidencias.length > 0 ? [...new Set(todasCoincidencias)] : [part];
            
            return {
                original: part,
                traducciones: traducciones
            };
        });

        // GENERAR COMBINACIONES
        function generarCombinaciones(resultados, index = 0, combinacionActual = []) {
            if (index === resultados.length) {
                return [combinacionActual.join('')];
            }

            const current = resultados[index];
            const combinaciones = [];

            for (const traduccion of current.traducciones) {
                let traduccionFormateada = traduccion;
                
                if (/[A-ZÁÉÍÓÚÑÜ]/.test(current.original[0])) {
                    traduccionFormateada = traduccion.charAt(0).toUpperCase() + traduccion.slice(1);
                }

                const nuevasCombinaciones = generarCombinaciones(
                    resultados, 
                    index + 1, 
                    [...combinacionActual, traduccionFormateada]
                );
                combinaciones.push(...nuevasCombinaciones);
            }

            return combinaciones;
        }

        const todasCombinaciones = generarCombinaciones(resultadosPorPalabra);
        
        if (todasCombinaciones.length === 1) {
            return todasCombinaciones[0];
        } else {
            const combinacionesUnicas = [...new Set(todasCombinaciones)].slice(0, 5);
            return `Traducciones posibles:\n${combinacionesUnicas.map((trad, i) => `${i + 1}. ${trad}`).join('\n')}`;
        }
    }

    // ==== TRADUCTOR INTELIGENTE MEJORADO ====
    
    class TraductorInteligenteJS {
        constructor(datos, languageKey) {
            this.languageKey = languageKey;
            this.datos = this.expandirDatos(datos);
        }

        expandirDatos(datos) {
            const expandidos = [];
            
            datos.forEach(entrada => {
                 = entrada.espanol?.toLowerCase().trim() || entrada.español?.toLowerCase().trim() || '';
                const indigena = entrada[this.languageKey]?.toLowerCase().trim() || '';
                
                if (espanol && indigena) {
                    const variantesEs = espanol.split(',').map(v => v.trim()).filter(v => v);
                    const variantesInd = indigena.split(',').map(v => v.trim()).filter(v => v);
                    
                    variantesEs.forEach(vEs => {
                        variantesInd.forEach(vInd => {
                            expandidos.push({
                                espanol: vEs,
                                indigena: vInd
                            });
                        });
                    });
                }
            });
            
            return expandidos;
        }

        calcularSimilitud(texto1, texto2) {
            texto1 = texto1.toLowerCase().trim();
            texto2 = texto2.toLowerCase().trim();
            
            if (texto1 === texto2) return 1.0;
            
            const palabras1 = texto1.split(/\s+/);
            const palabras2 = texto2.split(/\s+/);
            
            if (palabras1.length > 1 && palabras2.length > 1) {
                if (texto1.includes(texto2) || texto2.includes(texto1)) return 0.9;
                
                const todasCoinciden = palabras1.every(p1 => 
                    palabras2.some(p2 => p1 === p2)
                );
                if (todasCoinciden) return 0.85;
            }
            
            const coincidenciasExactas = palabras1.filter(p1 => 
                palabras2.some(p2 => p1 === p2)
            ).length;
            
            if (coincidenciasExactas > 0) {
                return 0.7 + (coincidenciasExactas * 0.1);
            }
            
            const coincidenciasParciales = palabras1.filter(p1 => 
                palabras2.some(p2 => p2.includes(p1) || p1.includes(p2))
            ).length;
            
            if (coincidenciasParciales > 0) {
                const penalizacion = palabras1.some(p1 => p1.length <= 2) ? 0.2 : 0;
                return 0.3 + (coincidenciasParciales * 0.1) - penalizacion;
            }
            
            return 0;
        }

        buscarTraducciones(texto, direccion = 'es_indigena', topN = 5) {
            texto = texto.toLowerCase().trim();
            const resultados = [];
            
            this.datos.forEach(entrada => {
                const textoOrigen = direccion === 'es_indigena' ? entrada.espanol : entrada.indigena;
                const textoDestino = direccion === 'es_indigena' ? entrada.indigena : entrada.espanol;
                
                const similitud = this.calcularSimilitud(texto, textoOrigen);
                
                if (similitud > 0.2) {
                    resultados.push({
                        traduccion: textoDestino,
                        palabraOriginal: textoOrigen,
                        similitud: similitud,
                        confianza: similitud > 0.8 ? 'Alta' : similitud > 0.5 ? 'Media' : 'Baja'
                    });
                }
            });
            
            const resultadosUnicos = resultados.filter((resultado, index, self) => 
                index === self.findIndex(r => r.traduccion === resultado.traduccion)
            );
            
            return resultadosUnicos
                .sort((a, b) => b.similitud - a.similitud)
                .slice(0, topN);
        }
    }

    // Función para inicializar el traductor inteligente
    function inicializarTraductorInteligente(datos, languageKey) {
        if (datos && Array.isArray(datos)) {
            window.traductorAI = new TraductorInteligenteJS(datos, languageKey);
        }
    }

    // ==== MANEJADOR MEJORADO ====

    const form = document.getElementById('translator-form');
    form.removeEventListener('submit', traducir);
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const palabraRaw = textoEntrada.value;
        if (!palabraRaw) {
            resultado.textContent = 'Introduce una palabra o frase.';
            ocultarControlesAudio();
            return;
        }
        if (!loadedFilename) {
            resultado.textContent = 'Selecciona un diccionario primero.';
            ocultarControlesAudio();
            return;
        }

        const direccion = direccionSelect.value;
        const idiomaSeleccionado = loadedFilename.replace('.JSON', '').toLowerCase();
        const dirTraduccion = direccion === 'espanol' ? 'es_indigena' : 'indigena_es';
        
        let resultadoHTML = '';
        
        // Usar el traductor inteligente si está disponible
        if (window.traductorAI) {
            const traduccionesAI = window.traductorAI.buscarTraducciones(palabraRaw, dirTraduccion, 5);
            
            if (traduccionesAI.length > 0) {
                resultadoHTML += '<strong>🔍 Traducciones inteligentes:</strong><br>';
                traduccionesAI.forEach((trad, index) => {
                    resultadoHTML += `${index + 1}. <strong>${trad.traduccion}</strong> `;
                    resultadoHTML += `<small>(similar a: "${trad.palabraOriginal}", confianza: ${trad.confianza})</small><br>`;
                });
            }
        }
        
        // Mostrar traducción tradicional
        const salidaTradicional = translatePhrase(palabraRaw, direccion);
        
        if (resultadoHTML) {
            resultadoHTML += `<br><strong>📖 Traducción tradicional:</strong><br>`;
        }
        
        resultadoHTML += `${salidaTradicional}`;
        
        resultado.innerHTML = resultadoHTML || 'Traducción no encontrada.';
        resultado.style.whiteSpace = 'pre-line';

        // Mostrar controles de audio si hay traducción válida
        if (salidaTradicional && !salidaTradicional.includes('Traducción no encontrada') && 
            !salidaTradicional.includes('Traducciones posibles')) {
            mostrarControlesAudio(palabraRaw, salidaTradicional, direccion, idiomaSeleccionado);
        } else {
            ocultarControlesAudio();
        }
    });

    // Permitir Enter en el campo
    textoEntrada.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    });

    // Estado inicial
    resultado.textContent = '---';
    resultado.style.whiteSpace = 'pre-line';
    status.textContent = 'Selecciona un diccionario.';

});




