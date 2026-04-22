# 🤖 Arquitectura Técnica - Sistema Inteligente de Traducción

## Problema Original

El algoritmo de JavaScript original se confundía porque:
- Solo usaba **similitud Levenshtein** simple
- No entendía **patrones fonéticos** de lenguas indígenas
- No ofrecía **nivel de confianza** en traducciones
- No sugería **alternativas** plausibles

## Solución Implementada

### Componente 1: Motor Python (`inteligence.py`)

**Clase Principal:** `TraductorInteligente`

```
Funciones clave:
├─ _normalizar()              → Limpia texto (minúsculas, acentos)
├─ _similitud_levenshtein()   → Compara cadenas (0-1)
├─ _similitud_fonetica()      → Análisis fonético de lenguas indígenas
├─ _buscar_aproximadas()      → Busca múltiples coincidencias
└─ traducir()                 → Orquesta todo el proceso
```

**Algoritmo de Traducción:**

1. **Normalización**
   - Convierte a minúsculas
   - Elimina acentos (NFD normalization)
   - Limpia espacios

2. **Búsqueda Exacta** (Rápida)
   ```
   Si palabra_normalizada en diccionario:
       → Retorna confianza = 1.0 (100%)
   ```

3. **Búsqueda Aproximada** (Inteligente)
   ```
   Para cada palabra en diccionario:
       similitud = Levenshtein(palabra_busqueda, palabra_dict)
       
       Si tiene patrones fonéticos comunes:
           similitud += bonus_fonetico (0.05)
       
       Si similitud >= umbral (0.60):
           agregar a resultados
   
   Ordenar resultados por puntuación descendente
   ```

4. **Reglas Fonéticas Implementadas**
   ```
   x  ↔ ['sh', 'ch', 'ks']
   tz ↔ ['ts', 'z']
   tl ↔ ['t-l', 'tl']
   qu ↔ ['k', 'qu', 'kw']
   ch ↔ ['tch', 'ch']
   h  ↔ ['j', 'h']
   z  ↔ ['s', 'z']
   ```

### Componente 2: Servidor Express (`server.js`)

**Endpoints:**

```
POST /api/traducir
├─ Recibe: diccionario, palabra, dirección
├─ Carga diccionario JSON (con caché)
├─ Llama Python via child_process
└─ Retorna: traducción + confianza + alternativas

POST /api/traducir-frase
├─ Traduce palabra por palabra
└─ Calcula confianza promedio
```

**Optimizaciones:**
- Cache de diccionarios en memoria
- Carga lazy de archivos JSON
- Comunicación por stdin/stdout con Python

### Componente 3: Cliente JavaScript (`traductor-inteligente.js`)

**Clase:** `TraductorInteligenteCliente`

```javascript
traductorInteligente.traducirPalabra(palabra, diccionario, direccion)
traductorInteligente.traducirFrase(frase, diccionario, direccion)
```

**Métodos de Utilidad:**
- `formatearResultado()` → Prepara datos para UI
- `crearIndicadorConfianza()` → Genera HTML de barra
- `obtenerColorConfianza()` → Color según puntuación
- `obtenerEtiquetaTipo()` → Etiqueta descriptiva

### Componente 4: Estilos CSS (`style.css`)

```css
.confianza-container
├─ Barra visual de confianza
├─ Colores: Rojo → Naranja → Amarillo → Verde
└─ Label con porcentaje

.alternativas-list
├─ Muestra opciones adicionales
└─ Con nivel de confianza individual
```

## Flujo de Datos Completo

```
1. Usuario escribe "gato" en input
   ↓
2. Frontend captura evento y llama:
   traductorInteligente.traducirPalabra("gato", "nahuatl.JSON", "es_ind")
   ↓
3. JavaScript hace POST a /api/traducir con JSON:
   { diccionario: "nahuatl.JSON", palabra: "gato", direccion: "es_ind" }
   ↓
4. Express recibe, carga diccionario y llama Python:
   python inteligence.py < data.json
   ↓
5. Python procesa:
   - Normaliza "gato" → "gato"
   - Busca en mapa exacto → No encuentra
   - Busca aproximadas con umbral 0.60
   - Encuentra "miztli" con similitud 0.95
   - Retorna JSON con resultado
   ↓
6. Express devuelve respuesta JSON:
   {
     "éxito": true,
     "traduccion": "miztli",
     "confianza": 0.95,
     "alternativas": [],
     "tipo": "aproximada"
   }
   ↓
7. Frontend formatea y actualiza UI:
   - Muestra "miztli"
   - Barra de confianza al 95% (color verde)
   - Etiqueta: "✓✓ Muy buena coincidencia"
```

## Métricas de Confianza

| Rango | Interpretación | Acción |
|-------|---|---|
| 1.00 | Exacta | Mostrar sin dudas |
| 0.85-0.99 | Muy buena | Destacar en verde |
| 0.70-0.84 | Buena | Mostrar en amarillo |
| 0.60-0.69 | Aproximada | Mostrar con cautela |
| < 0.60 | No confiable | Rechazar/Mostrar alternativas |

## Complejidad Algorítmica

- **Búsqueda exacta**: O(1) - lookup directo en diccionario
- **Búsqueda aproximada**: O(n) donde n = palabras en diccionario
- **Similitud Levenshtein**: O(m·k) donde m,k = largo de palabras
- **Análisis fonético**: O(1) - comparación de patrones fijos

## Ventajas de esta Arquitectura

✅ **Modular**: Componentes independientes  
✅ **Escalable**: Fácil agregar nuevas reglas fonéticas  
✅ **Eficiente**: Caché de diccionarios  
✅ **Explicable**: Cada traducción tiene confianza  
✅ **Agnóstica del idioma**: Funciona con cualquier diccionario  
✅ **Sin dependencias pesadas**: Solo Python y Express

## Posibles Mejoras Futuras

### Corto Plazo
- [ ] Agregar más reglas fonéticas por idioma
- [ ] Implementar fuzzy matching mejorado (Jaro-Winkler)
- [ ] Análisis de contexto en frases

### Mediano Plazo
- [ ] Embeddings con FastText o Word2Vec
- [ ] Machine Learning para weights dinámicos
- [ ] API de OpenAI/Google para contexto semántico

### Largo Plazo
- [ ] Reconocimiento de voz (speech-to-text)
- [ ] Síntesis de voz mejorada (TTS)
- [ ] Modelo de transformer finetuned
- [ ] Base de datos de retroalimentación de usuarios

---

**Arquitectura diseñada para ser:**
- 🎯 **Precisa**: Múltiples algoritmos de búsqueda
- 🚀 **Rápida**: Caché y optimizaciones
- 🔧 **Mantenible**: Código bien documentado
- 📈 **Escalable**: Fácil de extender
