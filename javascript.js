// =============================================
// SISTEMA DE SÍNTESIS DE VOZ PARA LENGUAS INDÍGENAS
// =============================================

class SintesisVozIndigena {
    constructor() {
        this.vocesDisponibles = [];
        this.cargarVoces();
    }

    cargarVoces() {
        if (window.speechSynthesis) {
            this.vocesDisponibles = window.speechSynthesis.getVoices();
            
            if (this.vocesDisponibles.length === 0) {
                window.speechSynthesis.onvoiceschanged = () => {
                    this.vocesDisponibles = window.speechSynthesis.getVoices();
                    console.log('Voces disponibles:', this.vocesDisponibles.map(v => v.name));
                };
            }
        }
    }

    crearReglasFoneticas(idioma) {
        const reglas = {
            'nahuatl': {
                'x': 'sh', 'tl': 't-l', 'tz': 'ts', 'cu': 'kw',
                'hu': 'w', 'qu': 'k', 'c': 'k', 'z': 's'
            },
            'mixteco': {
                'dx': 'dʲ', 'tx': 'tʲ', 'ch': 'tʃ',
                'ñ': 'ɲ', 'x': 'ʃ'
            },
            'zapoteco': {
                'zh': 'ʒ', 'x': 'ʃ', 'qu': 'k', 'ch': 'tʃ'
            },
            'totonaco': {
                'ch': 'tʃ', 'lh': 'ɬ', 'x': 'ʃ', 'qu': 'k'
            },
            'maya': {
                'x': 'sh', 'ch': 'tʃ', 'tz': 'ts',
                'pp': 'pʼ', 'tt': 'tʼ'
            },
            'otomi': {
                'ts': 'ʦ', 'ch': 'tʃ', "'": 'ʔ'
            }
        };
        return reglas[idioma] || {};
    }

    convertirFoneticamente(texto, idioma) {
        let textoFonetico = texto.toLowerCase();
        const reglas = this.crearReglasFoneticas(idioma);
        
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

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance();
        
        if (idioma === 'es') {
            utterance.text = texto;
            utterance.lang = 'es-ES';
        } else {
            const textoFonetico = this.convertirFoneticamente(texto, idioma);
            utterance.text = textoFonetico;
            utterance.lang = 'es-ES';
        }

        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

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

// =============================================
// TRADUCTOR INTELIGENTE MEJORADO
// =============================================

class TraductorInteligente {
    constructor(datos, languageKey) {
        this.languageKey = languageKey;
        this.datos = this.expandirDatos(datos);
    }

    expandirDatos(datos) {
        const expandidos = [];
        
        datos.forEach(entrada => {
            const espanol = entrada.espanol?.toLowerCase().trim() || entrada.español?.toLowerCase().trim() || '';
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

// =============================================
// GESTIÓN PRINCIPAL DE LA APLICACIÓN
// =============================================

let diccionarioEsIndigena = {};
let diccionarioIndigenaEs = {};
let traductorInteligente = null;
const sintesisVoz = new SintesisVozIndigena();

async function cargarDiccionario(filename) {
    try {
        const response = await fetch(`./${filename}`);
        if (!response.ok) {
            throw new Error(`Error al cargar el archivo: ${response.statusText}`);
        }
        
        const datos = await response.json();
        diccionarioEsIndigena = {};
        diccionarioIndigenaEs = {};

        // Buscar la clave del idioma indígena
        let idiomaIndigenaKey = '';
        if (datos.length > 0) {
            const claves = Object.keys(datos[0]);
            idiomaIndigenaKey = claves.find(k => 
                !['espanol', 'español', 'espanol', 'espanol'].includes(k.toLowerCase())
            );
        }

        if (!idiomaIndigenaKey) {
            throw new Error("Estructura JSON inválida. No se encontró la clave del idioma indígena.");
        }

        // Crear diccionarios bidireccionales
        datos.forEach(entrada => {
            const espanol = entrada.espanol?.toLowerCase().trim() || 
                           entrada.español?.toLowerCase().trim() || '';
            const indigena = entrada[idiomaIndigenaKey]?.toLowerCase().trim() || '';

            if (espanol && indigena) {
                diccionarioEsIndigena[espanol] = indigena;
                diccionarioIndigenaEs[indigena] = espanol;
            }
        });

        // Inicializar traductor inteligente
        traductorInteligente = new TraductorInteligente(datos, idiomaIndigenaKey);
        
        // Actualizar UI
        document.getElementById('diccionario-estado').textContent = 
            `Diccionario ${filename.replace('.JSON', '')} cargado - ${Object.keys(diccionarioEsIndigena).length} palabras`;
        document.getElementById('traducir-btn').disabled = false;
        
    } catch (err) {
        console.error(err);
        document.getElementById('diccionario-estado').textContent = 
            `Error cargando ${filename}: ${err.message}`;
        document.getElementById('traducir-btn').disabled = true;
    }
}

function mostrarControlesAudio(textoOriginal, textoTraducido, direccion, idiomaSeleccionado) {
    let controles = document.getElementById('controles-audio');
    
    if (!controles) {
        controles = document.createElement('div');
        controles.id = 'controles-audio';
        controles.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            border: 1px solid #d7ccc8;
            border-radius: 3px;
            background-color: #fffbe6;
            text-align: center;
        `;
        
        controles.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #ccaa00;">🔊 Escuchar pronunciación:</div>
            <button id="btn-audio-original" class="btn-audio" style="margin-right: 10px; padding: 10px 15px;">
                Texto original
            </button>
            <button id="btn-audio-traducido" class="btn-audio" style="padding: 10px 15px;">
                Traducción
            </button>
        `;
        
        const resultadoSection = document.querySelector('.resultado');
        resultadoSection.parentNode.insertBefore(controles, resultadoSection.nextSibling);
    } else {
        controles.style.display = 'block';
    }

    // Configurar eventos de audio
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

function traducir(event) {
    event.preventDefault();

    const textoEntrada = document.getElementById('texto_entrada');
    const direccionSelect = document.getElementById('direccion_select');
    const idiomaSelect = document.getElementById('idioma_select');
    const traduccionTexto = document.getElementById('traduccion-texto');
    
    const palabra = textoEntrada.value.trim();
    const direccion = direccionSelect.value;
    const idiomaSeleccionado = idiomaSelect.value ? 
        idiomaSelect.value.replace('.JSON', '').toLowerCase() : '';
    
    let resultado = "Traducción no encontrada.";
    
    if (!palabra) {
        traduccionTexto.textContent = "Introduce una palabra.";
        ocultarControlesAudio();
        return;
    }

    // Primero intentar búsqueda exacta
    const diccionarioBusqueda = direccion === 'espanol' ? diccionarioEsIndigena : diccionarioIndigenaEs;
    const traduccionExacta = diccionarioBusqueda[palabra.toLowerCase()];

    if (traduccionExacta) {
        resultado = traduccionExacta.charAt(0).toUpperCase() + traduccionExacta.slice(1);
        mostrarControlesAudio(palabra, resultado, direccion, idiomaSeleccionado);
    } 
    // Si no hay coincidencia exacta, usar traductor inteligente
    else if (traductorInteligente) {
        const direccionInteligente = direccion === 'espanol' ? 'es_indigena' : 'indigena_es';
        const sugerencias = traductorInteligente.buscarTraducciones(palabra, direccionInteligente, 3);
        
        if (sugerencias.length > 0) {
            resultado = "¿Quizás quisiste decir?\n" + 
                sugerencias.map((s, i) => 
                    `${i+1}. "${s.palabraOriginal}" → "${s.traduccion}" (${s.confianza})`
                ).join('\n');
        }
        ocultarControlesAudio();
    } else {
        ocultarControlesAudio();
    }

    traduccionTexto.textContent = resultado;
}

// =============================================
// INICIALIZACIÓN
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Configurar select de idiomas
    const idiomaSelect = document.getElementById('idioma_select');
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

    // Event listeners
    idiomaSelect.addEventListener('change', (e) => {
        const filename = e.target.value;
        if (filename) {
            cargarDiccionario(filename);
        } else {
            document.getElementById('diccionario-estado').textContent = "Estado: Esperando selección de idioma.";
            document.getElementById('traducir-btn').disabled = true;
            ocultarControlesAudio();
        }
    });

    document.getElementById('translator-form').addEventListener('submit', traducir);
    
    document.getElementById('texto_entrada').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            traducir(e);
        }
    });
});

// =============================================
// FUNCIONES AUXILIARES
// =============================================

function normalize(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}0-9\s',\-]/gu, '')
        .toLowerCase()
        .trim();
    }

