/**
 * app.js — Sistema de Traducción de Lenguas Indígenas
 * Módulos: Normalizador · Motor · AnalizadorTexto · TTS · STT · UI
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. NORMALIZADOR
   ═══════════════════════════════════════════════════════════════ */

const Normalizador = {
  normalizar(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  },
  normalizarEstricto(str) {
    return this.normalizar(str).replace(/['\-]/g, '');
  },
  normalizarFrase(str) {
    return this.normalizar(str).replace(/[.,!?¿¡;:]/g, '');
  }
};


/* ═══════════════════════════════════════════════════════════════
   1b. REGLAS LINGÜÍSTICAS DEL NÁHUATL
   ═══════════════════════════════════════════════════════════════ */

const ReglasNahuatl = {

  prefijosAdjetivos: {
    'mi ': 'ni',
    'tu ': 'to',
    'su ': 'i',
    'nuestro ': 'ti',
    'vuestro ': 'am',
  },

  sufijosLocativos: {
    ' en ': 'co',
    ' sobre ': 'pan',
    ' entre ': 'tlan',
    ' dentro de ': 'yan',
    ' lugar de ': 'tlan',
  },

  sustantivos: {
    'agua': 'atl',
    'casa': 'calli',
    'día': 'tonalli',
    'hora': 'tonalli',
    'hombre': 'catl',
    'mujer': 'cihuatl',
    'piedra': 'tetl',
    'fuego': 'tletl',
    'serpiente': 'coatl',
  },

  adjetivos: {
    'bueno': 'cualli',
    'malo': 'nextlaoaliztli',
    'grande': 'huey',
    'pequeño': 'pitzin',
    'blanco': 'iztac',
    'negro': 'tliltic',
    'rojo': 'chichiltic',
    'azul': 'xiuhtic',
    'verde': 'xiuhtic',
    'amarillo': 'coztic',
  },

  transformarPreposiciones(texto) {
    return texto.replace(/\s+de\s+/gi, ' ');
  },

  aplicarReglasContexto(palabras, direccion) {
    if (direccion !== 'es_ind') return null;

    const texto = palabras.join(' ').toLowerCase().trim();

    if (/^buenos?\s+d[ií]as?$/i.test(texto)) return 'cualli tonalli';

    if (/^casa\s+de\s+(\w+)$/i.test(texto)) {
      const match = texto.match(/^casa\s+de\s+(\w+)$/i);
      if (match) return `${match[1]}calli`;
    }

    if (/^agua\s+de\s+(\w+)$/i.test(texto)) {
      const match = texto.match(/^agua\s+de\s+(\w+)$/i);
      if (match) return `${match[1]}atl`;
    }

    if (/^d[ií]a\s+(de\s+)?hoy$/i.test(texto)) return 'tonalli';

    if (/^lugar\s+de\s+(\w+)$/i.test(texto)) {
      const match = texto.match(/^lugar\s+de\s+(\w+)$/i);
      if (match) return `${match[1]}tlan`;
    }

    if (/^(hombre|mujer)\s+de\s+(\w+)$/i.test(texto)) {
      const match = texto.match(/^(hombre|mujer)\s+de\s+(\w+)$/i);
      if (match) {
        const tipo = match[1] === 'hombre' ? 'catl' : 'cihuatl';
        return `${match[2]}${tipo}`;
      }
    }

    if (/^sobre\s+(\w+)$/i.test(texto)) {
      const match = texto.match(/^sobre\s+(\w+)$/i);
      if (match) return `${match[1]}pan`;
    }

    if (/^en\s+(\w+)$/i.test(texto)) {
      const match = texto.match(/^en\s+(\w+)$/i);
      if (match && !['dia', 'tiempo'].includes(match[1])) return `${match[1]}co`;
    }

    return null;
  },

  procesarAdjetivoSustantivo(palabras) {
    const resultado = [];
    for (const palabra of palabras) {
      const lower = palabra.toLowerCase();
      if (this.adjetivos[lower]) {
        resultado.unshift(this.adjetivos[lower]);
      } else if (this.sustantivos[lower]) {
        resultado.push(this.sustantivos[lower]);
      } else {
        resultado.push(palabra);
      }
    }
    return resultado;
  },

  procesarFrase(frase, direccion = 'es_ind') {
    if (direccion !== 'es_ind') return frase;

    const palabras = frase.split(/\s+/);
    const contexto = this.aplicarReglasContexto(palabras, direccion);
    if (contexto && contexto !== frase) return contexto;

    return this.transformarPreposiciones(frase);
  }

};


/* ═══════════════════════════════════════════════════════════════
   2. MOTOR DE BÚSQUEDA MEJORADO
   ═══════════════════════════════════════════════════════════════ */

class Motor {
  constructor() {
    this._esAInd = {};
    this._indAEs = {};
    this._esAIndOriginal = {};
    this._indAEsOriginal = {};
    this._cargado = false;
  }

  cargar(data) {
    this._esAInd = {};
    this._indAEs = {};
    this._esAIndOriginal = {};
    this._indAEsOriginal = {};
    this._cargado = false;

    if (!Array.isArray(data) || data.length === 0) return;

    const claves = Object.keys(data[0]);
    this._claveEs  = claves.find(k => /^espa[nñ]ol$/i.test(k));
    this._claveInd = claves.find(k => !/^espa[nñ]ol$/i.test(k));

    if (!this._claveEs || !this._claveInd) {
      console.error('[Motor] Claves no detectadas:', claves);
      return;
    }

    for (const entrada of data) {
      const es  = String(entrada[this._claveEs]  || '').trim();
      const ind = String(entrada[this._claveInd] || '').trim();
      if (!es || !ind) continue;

      const nEs  = Normalizador.normalizar(es);
      const nInd = Normalizador.normalizar(ind);

      if (nEs) {
        this._esAInd[nEs] = ind;
        this._esAIndOriginal[nEs] = es;
      }
      if (nInd) {
        this._indAEs[nInd] = es;
        this._indAEsOriginal[nInd] = ind;
      }
    }

    this._cargado = true;
    console.log(`[Motor] ${Object.keys(this._esAInd).length} entradas (${this._claveInd})`);
  }

  get cargado() { return this._cargado; }

  _levenshtein(a, b) {
    const la = a.length, lb = b.length;
    if (la === 0) return lb;
    if (lb === 0) return la;
    let prev = Array.from({ length: lb + 1 }, (_, i) => i);
    let curr = new Array(lb + 1);
    for (let i = 1; i <= la; i++) {
      curr[0] = i;
      for (let j = 1; j <= lb; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + c);
      }
      [prev, curr] = [curr, prev];
    }
    return prev[lb];
  }

  _simLev(a, b) {
    if (a === b) return 1;
    const max = Math.max(a.length, b.length);
    return max === 0 ? 1 : 1 - this._levenshtein(a, b) / max;
  }

  _normFonetica(str) {
    return str
      .replace(/x/g, 'sh')
      .replace(/tz/g, 'ts')
      .replace(/qu([aeiou])/g, 'k$1')
      .replace(/z/g, 's')
      .replace(/hu([aeiou])/g, 'w$1');
  }

  _simFonetica(a, b) {
    return this._simLev(this._normFonetica(a), this._normFonetica(b));
  }

  buscar(query, dir = 'es_ind') {
    if (!this._cargado) return [];

    const mapa = dir === 'es_ind' ? this._esAInd : this._indAEs;
    const mapaOriginal = dir === 'es_ind' ? this._esAIndOriginal : this._indAEsOriginal;
    const q = Normalizador.normalizar(query);
    if (!q) return [];

    // FASE 1a: Coincidencia exacta directa
    if (mapa[q]) {
      return [{
        traduccion: mapa[q],
        confianza: 1.00,
        tipo: 'exacta',
        original: mapaOriginal[q] || q
      }];
    }

    // FASE 1b: Coincidencia sin apóstrofes/guiones
    const qStrip = Normalizador.normalizarEstricto(query);
    for (const [clave, val] of Object.entries(mapa)) {
      if (Normalizador.normalizarEstricto(clave) === qStrip) {
        return [{
          traduccion: val,
          confianza: 1.00,
          tipo: 'exacta',
          original: mapaOriginal[clave] || clave
        }];
      }
    }

    // FASE 1c: Palabra exacta dentro de entradas multi-valor (separadas por ; o ,)
    const resultadosExactos = [];
    for (const [clave, val] of Object.entries(mapa)) {
      const partes = clave.split(/[;,]/).map(p => p.trim()).filter(Boolean);
      for (const parte of partes) {
        if (Normalizador.normalizar(parte) === q) {
          resultadosExactos.push({
            traduccion: val,
            confianza: 1.00,
            tipo: 'exacta',
            original: mapaOriginal[clave] || clave
          });
          break;
        }
      }
    }

    if (resultadosExactos.length > 0) {
      const unicos = [];
      const vistos = new Set();
      for (const r of resultadosExactos) {
        if (!vistos.has(r.traduccion)) {
          vistos.add(r.traduccion);
          unicos.push(r);
        }
      }
      unicos.sort((a, b) => a.original.length - b.original.length);
      return unicos.slice(0, 5);
    }

    // FASE 2: Búsqueda aproximada (fuzzy)
    const UMBRAL = 0.60;
    const candidatos = [];
    for (const [clave, val] of Object.entries(mapa)) {
      const score = this._simFonetica(q, clave) * 0.6 + this._simLev(q, clave) * 0.4;
      if (score >= UMBRAL) {
        candidatos.push({
          traduccion: val,
          confianza: Math.round(score * 100) / 100,
          tipo: score >= 0.80 ? 'fonetica' : 'aproximada',
          original: mapaOriginal[clave] || clave,
        });
      }
    }

    candidatos.sort((a, b) =>
      Math.abs(b.confianza - a.confianza) > 0.005
        ? b.confianza - a.confianza
        : a.original.length - b.original.length
    );

    return candidatos.slice(0, 5);
  }

  traducirFrase(frase, dir = 'es_ind') {
    // PASO 0: Aplicar reglas lingüísticas del náhuatl
    // FIX: Si las reglas devuelven una traducción directa (ej. "cualli tonalli"
    // para "buen día"), se retorna inmediatamente SIN buscarla en el diccionario.
    // El bug original la buscaba en _esAInd donde no existe porque "cualli tonalli"
    // es la clave indígena, no la española — dando ~0% y "sin traducción".
    if (dir === 'es_ind') {
      const reglasAplicadas = ReglasNahuatl.procesarFrase(frase, dir);
      if (reglasAplicadas && reglasAplicadas !== frase) {
        return {
          frase: reglasAplicadas,
          confianza: 1.00,
          detalle: [{
            token: frase,
            traduccion: reglasAplicadas,
            confianza: 1.00,
            tipo: 'exacta',
            original: frase
          }],
        };
      }
    }

    // PASO 1: Buscar la frase completa en el diccionario
    const resCompleta = this.buscar(frase, dir);
    if (resCompleta.length > 0 && resCompleta[0].tipo === 'exacta') {
      return {
        frase: resCompleta[0].traduccion,
        confianza: 1.00,
        detalle: [{
          token: frase,
          traduccion: resCompleta[0].traduccion,
          confianza: 1.00,
          tipo: 'exacta',
          original: resCompleta[0].original
        }],
      };
    }

    // PASO 2: Dividir en tokens y traducir palabra por palabra
    const tokens = frase.match(/[\wÀ-ÿ'']+|[^\w\s]/g) || [];
    let confianzaAcum = 0, traducidas = 0;
    const detalle = [];

    const partes = tokens.map(token => {
      if (/^[^\wÀ-ÿ]$/.test(token)) {
        detalle.push({ token, traduccion: token, confianza: null });
        return token;
      }

      const res = this.buscar(token, dir);
      if (res.length > 0) {
        const mejor = res[0];
        confianzaAcum += mejor.confianza;
        traducidas++;
        detalle.push({ token, ...mejor, alternativas: res.slice(1, 3) });
        const t = mejor.traduccion;
        return /^[A-ZÁÉÍÓÚÑÜ]/.test(token) ? t[0].toUpperCase() + t.slice(1) : t;
      }

      detalle.push({ token, traduccion: token, confianza: 0, tipo: 'no_encontrada' });
      return token;
    });

    return {
      frase: partes.join(' ').replace(/ ([,;:.!?])/g, '$1'),
      confianza: traducidas > 0 ? Math.round((confianzaAcum / traducidas) * 100) / 100 : 0,
      detalle,
    };
  }
}


/* ═══════════════════════════════════════════════════════════════
   3. ANALIZADOR DE TEXTO
   ═══════════════════════════════════════════════════════════════ */

const AnalizadorTexto = {
  contarSilabas(palabra) {
    const m = palabra.match(/[aeiouáéíóúü]/gi);
    return m ? m.length : 1;
  },

  detectarTipoEntrada(texto) {
    const n = texto.trim().split(/\s+/).filter(Boolean).length;
    const esPregunta = /[¿?]/.test(texto) ||
      /^(qu[eé]|cu[aá]l|cu[aá]ndo|d[oó]nde|c[oó]mo|qui[eé]n)/i.test(texto.trim());
    if (n === 1) return esPregunta ? 'interjección' : 'palabra';
    if (n <= 4)  return esPregunta ? 'pregunta'     : 'frase';
    return esPregunta ? 'pregunta' : 'oración';
  },

  detectarClaseGramatical(p) {
    p = p.toLowerCase().trim();
    if (/^(el|la|los|las|un|una|unos|unas)$/.test(p))                return 'artículo';
    if (/^(yo|tú|él|ella|nosotros|ellos|me|te|se|nos)$/.test(p))    return 'pronombre';
    if (/^(en|de|a|por|para|con|sin|sobre|bajo|ante|tras)$/.test(p)) return 'preposición';
    if (/^(y|o|pero|sino|porque|pues|si|aunque)$/.test(p))           return 'conjunción';
    if (/(ar|er|ir)$/.test(p))                                        return 'verbo (infinitivo)';
    if (/(ción|sión|dad|tad|miento|ura|ez)$/.test(p))                return 'sustantivo';
    if (/(oso|osa|ible|able|al|il|ivo|iva)$/.test(p))                return 'adjetivo';
    if (/mente$/.test(p))                                             return 'adverbio';
    return 'desconocido';
  },

  analizar(texto) {
    const palabras = texto.trim().split(/\s+/).filter(Boolean);
    const numSilabas = palabras.reduce((s, p) => s + this.contarSilabas(p), 0);
    return {
      tipoEntrada:       this.detectarTipoEntrada(texto),
      numPalabras:       palabras.length,
      numSilabas,
      silabasPorPalabra: +(numSilabas / Math.max(palabras.length, 1)).toFixed(1),
      esPregunta:        /[¿?]/.test(texto),
      tieneTilde:        /[áéíóúü]/i.test(texto),
      claseGramatical:   this.detectarClaseGramatical(palabras[0] || ''),
      complejidad:       +Math.min(1, palabras.length * 0.08 + numSilabas / palabras.length / 10).toFixed(2),
    };
  },
};


/* ═══════════════════════════════════════════════════════════════
   4. TTS
   ═══════════════════════════════════════════════════════════════ */

class TTS {
  constructor() {
    this._synth = window.speechSynthesis || null;
    this._voces = [];
    this._disponible = !!this._synth;
    if (this._disponible) {
      const cargar = () => { this._voces = this._synth.getVoices(); };
      cargar();
      this._synth.onvoiceschanged = cargar;
    }
  }

  get disponible() { return this._disponible; }

  static REGLAS = {
    nahuatl:  [[/\bx/g,'sh'],[/x([aeiou])/gi,'sh$1'],[/tz/g,'ts'],[/qu([ae])/gi,'k$1'],[/hu([aeiou])/gi,'w$1'],[/z/g,'s']],
    maya:     [[/x/g,'sh'],[/tz/g,'ts'],[/pp/g,'p'],[/tt/g,'t'],[/kk/g,'k'],[/qu/g,'k']],
    zapoteco: [[/x/g,'sh'],[/zh/g,'y'],[/qu/g,'k']],
    mixteco:  [[/x/g,'sh'],[/tx/g,'tsh'],[/dx/g,'dsh'],[/ñ/g,'ny']],
    totonaco: [[/x/g,'sh'],[/tz/g,'ts'],[/lh/g,'l'],[/qu/g,'k']],
    huichol:  [[/ix/g,'ish'],[/xa/g,'sha'],[/x/g,'sh']],
  };

  static PARAMS = {
    español:  { rate: 1.00, pitch: 1.00 },
    nahuatl:  { rate: 0.75, pitch: 1.10 },
    maya:     { rate: 0.72, pitch: 1.15 },
    zapoteco: { rate: 0.75, pitch: 1.05 },
    mixteco:  { rate: 0.72, pitch: 1.12 },
    totonaco: { rate: 0.74, pitch: 1.08 },
    huichol:  { rate: 0.73, pitch: 1.10 },
  };

  _aplicarReglas(texto, idioma) {
    const reglas = TTS.REGLAS[idioma];
    if (!reglas) return texto;
    let s = texto.toLowerCase();
    for (const [p, r] of reglas) s = s.replace(p, r);
    return s;
  }

  _mejorVoz() {
    return this._voces.find(v => v.lang.startsWith('es-MX'))
        || this._voces.find(v => v.lang.startsWith('es'))
        || this._voces[0] || null;
  }

  hablar(texto, idioma = 'español') {
    return new Promise((resolve, reject) => {
      if (!this._disponible) return reject(new Error('TTS no disponible'));
      if (!texto.trim()) return resolve();
      this._synth.cancel();
      const textoFon = idioma !== 'español' ? this._aplicarReglas(texto, idioma) : texto;
      const u = new SpeechSynthesisUtterance(textoFon);
      u.lang   = 'es-MX';
      u.voice  = this._mejorVoz();
      const p  = TTS.PARAMS[idioma] || TTS.PARAMS['español'];
      u.rate   = p.rate;
      u.pitch  = p.pitch;
      u.volume = 1;
      u.onend   = () => resolve();
      u.onerror = e  => reject(e);
      this._synth.speak(u);
    });
  }

  detener() { this._synth?.cancel(); }
}


/* ═══════════════════════════════════════════════════════════════
   5. STT
   ═══════════════════════════════════════════════════════════════ */

class STT {
  constructor() {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this._disponible = !!Rec;
    this._escuchando = false;
    this._micDisponible = false;

    if (this._disponible) {
      this._rec = new Rec();
      this._rec.continuous      = false;
      this._rec.interimResults  = true;
      this._rec.maxAlternatives = 1;
      this._rec.lang            = 'es-MX';
      this._verificarMic();
    }
  }

  get disponible()    { return this._disponible; }
  get micDisponible() { return this._micDisponible; }
  get escuchando()    { return this._escuchando; }

  async _verificarMic() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
      this._micDisponible = true;
      window.app?._actualizarEstadoSistema();
    } catch {
      this._micDisponible = false;
    }
  }

  iniciar({ onParcial, onFinal, onError } = {}) {
    if (!this._disponible || !this._micDisponible) {
      onError?.('Micrófono no disponible o permiso denegado');
      return;
    }
    if (this._escuchando) return;

    this._escuchando = true;

    this._rec.onresult = (e) => {
      const ultimo = e.results[e.results.length - 1];
      const texto  = ultimo[0].transcript;
      if (ultimo.isFinal) {
        onFinal?.(texto.trim());
        this._escuchando = false;
      } else {
        onParcial?.(texto.trim());
      }
    };

    this._rec.onerror = (e) => {
      this._escuchando = false;
      const msgs = {
        'no-speech'   : 'No se detectó voz. Intenta de nuevo.',
        'not-allowed' : 'Permiso de micrófono denegado.',
        'network'     : 'Error de red.',
        'aborted'     : 'Captura cancelada.',
      };
      onError?.(msgs[e.error] || `Error: ${e.error}`);
    };

    this._rec.onend = () => { this._escuchando = false; };
    this._rec.start();
  }

  detener() {
    if (this._escuchando) {
      this._rec?.stop();
      this._escuchando = false;
    }
  }
}


/* ═══════════════════════════════════════════════════════════════
   6. UI
   ═══════════════════════════════════════════════════════════════ */

const IDIOMAS = [
  { archivo: 'nahuatl.JSON',  label: 'Náhuatl'  },
  { archivo: 'maya.JSON',     label: 'Maya'      },
  { archivo: 'zapoteco.JSON', label: 'Zapoteco'  },
  { archivo: 'mixteco.JSON',  label: 'Mixteco'   },
  { archivo: 'totonaco.JSON', label: 'Totonaco'  },
  { archivo: 'huichol.JSON',  label: 'Huichol'   },
];

const RUTAS_DATOS = ['./data/', './JSON/', './'];

class UI {
  constructor() {
    this.motor = new Motor();
    this.tts   = new TTS();
    this.stt   = new STT();

    this.idiomaActual      = '';
    this.ultimaTraduccion  = '';
    this.ultimoTextoOrigen = '';

    this._bindDOM();
    this._poblarIdiomas();
    this._bindEventos();
    this._actualizarEstadoSistema();
  }

  _bindDOM() {
    const g = id => document.getElementById(id);
    this.idiomaSelect    = g('idioma_select');
    this.direccionSelect = g('direccion_select');
    this.textoEntrada    = g('texto_entrada');
    this.traducirBtn     = g('traducir-btn');
    this.resultadoOut    = g('traduccion-texto');
    this.statusDot       = g('status-dot');
    this.statusTxt       = g('status');
    this.contadorPalabras = g('contador-palabras');
    this.controlesAudio  = g('controles-audio');
    this.btnAudioOrig    = g('btn-audio-original');
    this.btnAudioTrad    = g('btn-audio-traducido');
    this.btnMic          = g('btn-iniciar-micrófono');
    this.btnDetenerMic   = g('btn-detener-micrófono');
    this.statusMic       = g('microfono-status');
    this.btnPronunciar   = g('btn-pronunciar-traduccion');
    this.btnAnalizar     = g('btn-analizar');
    this.panelAnalisis   = g('analisis-resultado');
    this.sliderVeloc     = g('slider-velocidad');
    this.valorVeloc      = g('valor-velocidad');
    this.panelVeloc      = g('velocidad-pronunciacion');
    this.statusTTS       = g('status-tts');
    this.statusSTT       = g('status-stt');
    this.statusMicInd    = g('status-microphone');
    this.statusTrad      = g('status-traduccion');
    this.btnConfig       = g('btn-abrir-configuracion');
    this.panelConfig     = g('panel-configuracion');
  }

  _poblarIdiomas() {
    if (!this.idiomaSelect) return;
    while (this.idiomaSelect.options.length > 1) {
      this.idiomaSelect.remove(1);
    }
    IDIOMAS.forEach(({ archivo, label }) => {
      const opt = document.createElement('option');
      opt.value       = archivo;
      opt.textContent = label;
      this.idiomaSelect.appendChild(opt);
    });
  }

  _bindEventos() {
    this.idiomaSelect?.addEventListener('change', () => this._cargarDiccionario());

    document.querySelectorAll('.dir-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.direccionSelect) this.direccionSelect.value = btn.dataset.value;
      });
    });

    document.getElementById('translator-form')
      ?.addEventListener('submit', e => { e.preventDefault(); this._traducir(); });

    this.textoEntrada?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this._traducir(); }
    });

    this.btnAudioOrig?.addEventListener('click',  () => this._reproducir('original'));
    this.btnAudioTrad?.addEventListener('click',  () => this._reproducir('traduccion'));
    this.btnPronunciar?.addEventListener('click', () => this._reproducir('traduccion'));
    this.btnMic?.addEventListener('click',        () => this._iniciarMic());
    this.btnDetenerMic?.addEventListener('click', () => this._detenerMic());
    this.btnAnalizar?.addEventListener('click',   () => this._analizarTexto());
    this.btnConfig?.addEventListener('click',     () => this._toggleConfig());

    this.sliderVeloc?.addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (this.valorVeloc) this.valorVeloc.textContent = `${v.toFixed(1)}x`;
      TTS.PARAMS[this.idiomaActual || 'español'].rate = v;
    });
  }

  _toggleConfig() {
    if (this.panelConfig) {
      this.panelConfig.style.display =
        this.panelConfig.style.display === 'none' ? 'block' : 'none';
    }
  }

  async _cargarDiccionario() {
    const archivo = this.idiomaSelect?.value;
    if (!archivo) {
      this._setStatus('', 'idle');
      if (this.traducirBtn) this.traducirBtn.disabled = true;
      this._ocultarAudio();
      return;
    }

    this._setStatus('Cargando diccionario...', 'loading');
    if (this.traducirBtn) this.traducirBtn.disabled = true;

    let data = null;
    for (const ruta of RUTAS_DATOS) {
      try {
        const res = await fetch(ruta + archivo);
        if (res.ok) { data = await res.json(); break; }
      } catch { /* intenta siguiente ruta */ }
    }

    if (!data) {
      this._setStatus(`No se encontró: ${archivo}`, 'error');
      console.error(`[UI] No se encontró en ninguna ruta: ${archivo}`);
      return;
    }

    this.motor.cargar(data);

    if (!this.motor.cargado) {
      this._setStatus('Error al procesar el diccionario', 'error');
      return;
    }

    const n = Object.keys(this.motor._esAInd).length;
    this.idiomaActual = archivo.replace(/\.json$/i, '').toLowerCase();
    this._setStatus(`${n} palabras cargadas`, 'ok');
    if (this.contadorPalabras) this.contadorPalabras.textContent = `(${n} palabras)`;
    if (this.traducirBtn)  this.traducirBtn.disabled = false;
    if (this.resultadoOut) this.resultadoOut.textContent = '¡Listo para traducir!';
    this._ocultarAudio();
  }

  _traducir() {
    const texto = this.textoEntrada?.value.trim();
    if (!texto) {
      if (this.resultadoOut) this.resultadoOut.innerHTML = '<em>Escribe algo para traducir.</em>';
      return;
    }
    if (!this.motor.cargado) {
      if (this.resultadoOut) this.resultadoOut.innerHTML = '<em>Selecciona un diccionario primero.</em>';
      return;
    }

    const dir     = this.direccionSelect?.value === 'espanol' ? 'es_ind' : 'ind_es';
    const palabras = texto.split(/\s+/).filter(Boolean);
    let html = '', textoPlano = '';

    if (palabras.length === 1) {
      const res = this.motor.buscar(texto, dir);

      if (res.length === 0) {
        html = '<em class="sin-resultado">No se encontró traducción.</em>';
      } else {
        const mejor = res[0];
        textoPlano   = mejor.traduccion;
        const pct    = Math.round(mejor.confianza * 100);

        let badgeClase = 'badge-exacta';
        let badgeTexto = 'exacta';

        if (mejor.tipo === 'exacta_en_frase') {
          badgeClase = 'badge-frase';
          badgeTexto = `en frase (${pct}%)`;
        } else if (mejor.tipo === 'prefijo') {
          badgeClase = 'badge-prefijo';
          badgeTexto = `prefijo (${pct}%)`;
        } else if (mejor.tipo === 'contiene') {
          badgeClase = 'badge-contiene';
          badgeTexto = `contiene (${pct}%)`;
        } else if (mejor.tipo !== 'exacta') {
          badgeClase = 'badge-aprox';
          badgeTexto = `~${pct}%`;
        }

        html = `<span class="trad-principal">${mejor.traduccion}</span><span class="${badgeClase}">${badgeTexto}</span>`;

        if (mejor.original && mejor.original !== texto.toLowerCase()) {
          html += `<div class="trad-original">Original: "${mejor.original}"</div>`;
        }

        if (res.length > 1) {
          html += `<div class="trad-alternativas">También: ${
            res.slice(1).map(r =>
              `<span class="alt-item">${r.traduccion} <small>(${Math.round(r.confianza * 100)}%)</small></span>`
            ).join(' ')
          }</div>`;
        }
      }
    } else {
      const { frase, confianza, detalle } = this.motor.traducirFrase(texto, dir);
      textoPlano = frase;
      const pct  = Math.round(confianza * 100);

      html = `<span class="trad-principal">${frase}</span><span class="badge-aprox">~${pct}%</span>`;

      const sinTrad = detalle.filter(d => d.tipo === 'no_encontrada');
      if (sinTrad.length > 0) {
        html += `<div class="trad-alternativas">Sin traducción: ${
          sinTrad.map(d => `<em>${d.token}</em>`).join(', ')
        }</div>`;
      }

      html += `<details class="detalle-frase">
        <summary>Ver palabra por palabra</summary>
        <table class="tabla-detalle">
          <tr><th>Original</th><th>Traducción</th><th>Tipo</th></tr>
          ${detalle.filter(d => d.confianza !== null).map(d => {
            let tipoTexto = d.tipo || '';
            if (d.tipo === 'exacta')               tipoTexto = '✓ Exacta';
            else if (d.tipo === 'exacta_en_frase') tipoTexto = '📖 En frase';
            else if (d.tipo === 'prefijo')         tipoTexto = '🔤 Prefijo';
            else if (d.tipo === 'contiene')        tipoTexto = '🔍 Contiene';
            else if (d.tipo === 'fonetica')        tipoTexto = '🎵 Fonética';
            else tipoTexto = `~${Math.round(d.confianza * 100)}%`;
            return `
          <tr>
            <td>${d.token}</td>
            <td><strong>${d.traduccion}</strong></td>
            <td>${tipoTexto}</td>
          </tr>`;
          }).join('')}
        </table>
      </details>`;
    }

    if (this.resultadoOut) this.resultadoOut.innerHTML = html;
    this.ultimaTraduccion  = textoPlano;
    this.ultimoTextoOrigen = texto;

    if (textoPlano) {
      this._mostrarAudio();
      if (this.btnPronunciar) this.btnPronunciar.disabled = false;
      if (this.btnAnalizar)   this.btnAnalizar.disabled   = false;
      if (this.panelVeloc)    this.panelVeloc.style.display = 'flex';
    } else {
      this._ocultarAudio();
    }
  }

  async _reproducir(cual) {
    if (!this.tts.disponible) {
      alert('Tu navegador no soporta síntesis de voz.\nPrueba con Chrome, Edge o Safari.');
      return;
    }

    const esOrigen = cual === 'original';
    const texto    = esOrigen ? this.ultimoTextoOrigen : this.ultimaTraduccion;
    if (!texto) return;

    const dir    = this.direccionSelect?.value === 'espanol' ? 'es_ind' : 'ind_es';
    const idioma = esOrigen
      ? (dir === 'es_ind' ? 'español' : this.idiomaActual)
      : (dir === 'es_ind' ? this.idiomaActual : 'español');

    const btn = esOrigen ? this.btnAudioOrig : (this.btnAudioTrad || this.btnPronunciar);
    const txtOriginal = btn?.textContent || '';
    if (btn) { btn.disabled = true; btn.textContent = '▶ Reproduciendo...'; }

    try {
      await this.tts.hablar(texto, idioma);
    } catch (e) {
      console.error('[TTS]', e);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = txtOriginal; }
    }
  }

  _iniciarMic() {
    if (!this.stt.disponible) {
      alert('Tu navegador no soporta reconocimiento de voz.\nPrueba con Chrome.');
      return;
    }

    if (this.btnMic)    this.btnMic.disabled = true;
    if (this.statusMic) this.statusMic.style.display = 'flex';

    this.stt.iniciar({
      onParcial: texto => {
        const span = this.statusMic?.querySelector('.status-text');
        if (span) span.textContent = `"${texto}"`;
      },
      onFinal: texto => {
        if (this.textoEntrada) this.textoEntrada.value = texto;
        if (this.statusMic)   this.statusMic.style.display = 'none';
        if (this.btnMic)      this.btnMic.disabled = false;
        this._traducir();
      },
      onError: msg => {
        alert(msg);
        if (this.statusMic) this.statusMic.style.display = 'none';
        if (this.btnMic)    this.btnMic.disabled = false;
      },
    });
  }

  _detenerMic() {
    this.stt.detener();
    if (this.statusMic) this.statusMic.style.display = 'none';
    if (this.btnMic)    this.btnMic.disabled = false;
  }

  _analizarTexto() {
    const texto = this.textoEntrada?.value.trim();
    if (!texto) { alert('Escribe algo para analizar.'); return; }

    const a = AnalizadorTexto.analizar(texto);
    const detalles = this.panelAnalisis?.querySelector('.analysis-details');

    if (detalles) {
      detalles.innerHTML = [
        ['Tipo de entrada',  a.tipoEntrada],
        ['Palabras',         a.numPalabras],
        ['Sílabas totales',  a.numSilabas],
        ['Sílabas/palabra',  a.silabasPorPalabra],
        ['Clase gramatical', a.claseGramatical],
        ['Es pregunta',      a.esPregunta ? 'Sí' : 'No'],
        ['Tiene tilde',      a.tieneTilde ? 'Sí' : 'No'],
        ['Complejidad',      `${Math.round(a.complejidad * 100)}%`],
      ].map(([label, val]) => `
        <div class="analysis-item">
          <div class="analysis-item-label">${label}</div>
          <div class="analysis-item-value">${val}</div>
        </div>`).join('');
    }

    if (this.panelAnalisis) this.panelAnalisis.style.display = 'block';
  }

  _actualizarEstadoSistema() {
    this._setIndicador(this.statusTTS,    this.tts.disponible    ? 'ok' : 'off');
    this._setIndicador(this.statusSTT,    this.stt.disponible    ? 'ok' : 'off');
    this._setIndicador(this.statusMicInd, this.stt.micDisponible ? 'ok' : 'off');
    this._setIndicador(this.statusTrad,   true);
    if (this.btnMic) this.btnMic.disabled = !this.stt.micDisponible;
  }

  _setIndicador(el, estado) {
    if (!el) return;
    const dot    = el.querySelector('.status-dot');
    const strong = el.querySelector('strong');
    if (strong) strong.textContent = estado === 'ok' ? 'Operacional' : 'No disponible';
    if (dot)    dot.classList.toggle('offline', estado === 'off');
  }

  _setStatus(msg, estado) {
    if (this.statusTxt) this.statusTxt.textContent = msg;
    if (this.statusDot) {
      this.statusDot.className = 'status-dot';
      if (estado === 'loading') this.statusDot.classList.add('loading');
      if (estado === 'ok')      this.statusDot.classList.add('loaded');
      if (estado === 'error')   this.statusDot.classList.add('error');
    }
  }

  _mostrarAudio() { if (this.controlesAudio) this.controlesAudio.style.display = 'block'; }
  _ocultarAudio() { if (this.controlesAudio) this.controlesAudio.style.display = 'none';  }
}


/* ═══════════════════════════════════════════════════════════════
   INICIO
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  window.app = new UI();
});
