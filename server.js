const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Cache para diccionarios cargados
const diccionariosCache = {};
let pythonDisponible = false;

// Verificar disponibilidad de Python al iniciar
function verificarPython() {
    const python = spawn('python', ['--version']);
    
    python.on('error', () => {
        pythonDisponible = false;
        console.log('⚠️  Python no disponible. Usará búsqueda JavaScript.');
    });
    
    python.on('close', (code) => {
        if (code === 0) {
            pythonDisponible = true;
            console.log('✅ Python detectado. Sistema inteligente activado.');
        }
    });
}

verificarPython();

/**
 * Carga un diccionario JSON
 */
function cargarDiccionario(nombreArchivo) {
    if (diccionariosCache[nombreArchivo]) {
        return Promise.resolve(diccionariosCache[nombreArchivo]);
    }

    return new Promise((resolve, reject) => {
        const rutaArchivo = path.join(__dirname, 'JSON', nombreArchivo);
        
        fs.readFile(rutaArchivo, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            
            try {
                const diccionario = JSON.parse(data);
                diccionariosCache[nombreArchivo] = diccionario;
                resolve(diccionario);
            } catch (parseErr) {
                reject(parseErr);
            }
        });
    });
}

/**
 * Búsqueda inteligente en JavaScript (fallback si Python no está disponible)
 */
function buscarTraduccionJS(diccionario, palabra, direccion) {
    const palabra_norm = palabra.toLowerCase().trim();
    
    // Claves dinámicas según el idioma
    const claves = diccionario.length > 0 ? Object.keys(diccionario[0]) : [];
    if (claves.length < 2) {
        return {
            éxito: false,
            traduccion: null,
            confianza: 0,
            tipo: 'error'
        };
    }
    
    const [clave1, clave2] = claves;
    
    // Determinar dirección de búsqueda
    let claveOrigen = direccion === 'es_ind' ? clave1 : clave2;
    let claveDestino = direccion === 'es_ind' ? clave2 : clave1;
    
    // 1. Búsqueda exacta
    for (let entrada of diccionario) {
        if (entrada[claveOrigen].toLowerCase() === palabra_norm) {
            return {
                éxito: true,
                traduccion: entrada[claveDestino],
                confianza: 1.0,
                tipo: 'exacta'
            };
        }
    }
    
    // 2. Búsqueda aproximada (similitud)
    let mejoresResultados = [];
    
    for (let entrada of diccionario) {
        const palabraDict = entrada[claveOrigen].toLowerCase();
        const similitud = calcularSimilitudJS(palabra_norm, palabraDict);
        
        if (similitud >= 0.70) {
            mejoresResultados.push({
                palabra: entrada[claveDestino],
                similitud: similitud
            });
        }
    }
    
    // Ordenar por similitud
    mejoresResultados.sort((a, b) => b.similitud - a.similitud);
    
    if (mejoresResultados.length > 0) {
        const mejor = mejoresResultados[0];
        return {
            éxito: true,
            traduccion: mejor.palabra,
            confianza: Math.round(mejor.similitud * 100) / 100,
            tipo: 'aproximada'
        };
    }
    
    return {
        éxito: false,
        traduccion: null,
        confianza: 0,
        tipo: 'no_encontrada'
    };
}

/**
 * Calcula similitud simple (algoritmo Levenshtein básico)
 */
function calcularSimilitudJS(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Calcula distancia de edición
 */
function getEditDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

/**
 * Llama a Python para procesar la traducción
 */
function procesarConPython(diccionario, palabra, direccion) {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, 'scripts', 'inteligence.py');
        
        const python = spawn('python', [pythonScript], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
        });

        python.stderr.on('data', (data) => {
            error += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python error: ${error}`));
                return;
            }

            try {
                const resultado = JSON.parse(output);
                resolve(resultado);
            } catch (parseErr) {
                reject(parseErr);
            }
        });

        // Enviar datos a Python
        const entrada = {
            diccionario: diccionario,
            palabra: palabra,
            direccion: direccion
        };

        python.stdin.write(JSON.stringify(entrada));
        python.stdin.end();
    });
}

/**
 * Endpoint: Traducir palabra
 */
app.post('/api/traducir', async (req, res) => {
    try {
        const { diccionario, palabra, direccion } = req.body;

        if (!diccionario || !palabra) {
            return res.status(400).json({
                éxito: false,
                error: 'Faltan parámetros: diccionario, palabra'
            });
        }

        // Cargar diccionario
        const datos = await cargarDiccionario(diccionario);

        let resultado;
        
        if (pythonDisponible) {
            // Usar Python si está disponible
            resultado = await procesarConPython(datos, palabra, direccion || 'es_ind');
        } else {
            // Fallback a JavaScript
            resultado = buscarTraduccionJS(datos, palabra, direccion || 'es_ind');
        }

        res.json(resultado);

    } catch (error) {
        console.error('Error en traducción:', error);
        res.status(500).json({
            éxito: false,
            error: error.message,
            traduccion: null,
            confianza: 0
        });
    }
});

/**
 * Endpoint: Traducir frase
 */
app.post('/api/traducir-frase', async (req, res) => {
    try {
        const { diccionario, frase, direccion } = req.body;

        if (!diccionario || !frase) {
            return res.status(400).json({
                éxito: false,
                error: 'Faltan parámetros: diccionario, frase'
            });
        }

        // Cargar diccionario
        const datos = await cargarDiccionario(diccionario);

        // Procesar frase palabra por palabra
        const palabras = frase.split(/\s+/);
        const traducciones = [];
        let confianzaTotal = 0;

        for (const palabra of palabras) {
            let resultado;
            
            if (pythonDisponible) {
                resultado = await procesarConPython(datos, palabra.toLowerCase(), direccion || 'es_ind');
            } else {
                resultado = buscarTraduccionJS(datos, palabra.toLowerCase(), direccion || 'es_ind');
            }
            
            if (resultado.éxito) {
                traducciones.push(resultado.traduccion);
                confianzaTotal += resultado.confianza;
            } else {
                traducciones.push(palabra);
            }
        }

        const confianzaPromedio = palabras.length > 0 ? 
            (confianzaTotal / palabras.length).toFixed(2) : 0;

        res.json({
            éxito: true,
            frase_original: frase,
            frase_traducida: traducciones.join(' '),
            confianza: parseFloat(confianzaPromedio),
            palabras_procesadas: palabras.length
        });

    } catch (error) {
        console.error('Error en traducción de frase:', error);
        res.status(500).json({
            éxito: false,
            error: error.message
        });
    }
});

/**
 * Endpoint: Salud del servidor
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        mensaje: 'Servidor funcionando correctamente',
        python: pythonDisponible ? 'disponible' : 'no disponible'
    });
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📚 Diccionarios: Listo (Español, Náhuatl, Maya, Zapoteco, Mixteco, Totonaco, Huichol)`);
    console.log(`🤖 Sistema: ${pythonDisponible ? 'Python IA activado' : 'Búsqueda JavaScript'}`);
    console.log(`\n🌐 Abre: http://localhost:${PORT}\n`);
});
