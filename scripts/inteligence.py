"""
Sistema de Traducción Inteligente para Lenguas Indígenas
Utiliza NLP y similitud semántica para mejorar las traducciones
"""

import json
import os
import sys
import unicodedata
from difflib import SequenceMatcher
from typing import List, Dict, Tuple

class TraductorInteligente:
    """
    Traductor inteligente que mejora el matching de palabras
    usando múltiples estrategias de similitud
    """
    
    def __init__(self, diccionario: List[Dict]):
        """
        Inicializa el traductor con un diccionario
        
        Args:
            diccionario: Lista de diccionarios con 'español' e idioma indígena
        """
        self.diccionario = diccionario
        self.mapa_es_ind = {}
        self.mapa_ind_es = {}
        self._construir_mapas()
        
    def _construir_mapas(self):
        """Construye mapas bidireccionales del diccionario"""
        for entrada in self.diccionario:
            # Obtener claves dinámicamente (puede variar por idioma)
            claves = list(entrada.keys())
            
            if len(claves) >= 2:
                # Primera clave: español
                es_palabra = self._normalizar(entrada[claves[0]])
                # Segunda clave: palabra indígena
                ind_palabra = self._normalizar(entrada[claves[1]])
                
                self.mapa_es_ind[es_palabra] = entrada[claves[1]]
                self.mapa_ind_es[ind_palabra] = entrada[claves[0]]
    
    def _normalizar(self, texto: str) -> str:
        """
        Normaliza texto: minúsculas, elimina acentos y espacios
        """
        if not isinstance(texto, str):
            return ""
        
        # Minúsculas
        texto = texto.lower().strip()
        
        # Eliminar acentos
        texto = unicodedata.normalize('NFD', texto)
        texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
        
        return texto
    
    def _similitud_levenshtein(self, s1: str, s2: str) -> float:
        """
        Calcula similitud usando distancia Levenshtein (0 a 1)
        1.0 = idénticas
        """
        return SequenceMatcher(None, s1, s2).ratio()
    
    def _similitud_fonetica(self, palabra_busqueda: str, palabra_dict: str) -> float:
        """
        Mejora la similitud considerando características fonéticas
        de las lenguas indígenas
        """
        # Reglas de proximidad fonética para lenguas indígenas
        sustituciones_comunes = {
            'x': ['sh', 'ch', 'ks'],
            'tz': ['ts', 'z'],
            'tl': ['t-l', 'tl'],
            'qu': ['k', 'qu', 'kw'],
            'ch': ['tch', 'ch'],
            'h': ['j', 'h'],
            'z': ['s', 'z'],
        }
        
        puntuacion = self._similitud_levenshtein(palabra_busqueda, palabra_dict)
        
        # Bonus si comparten patrones fonéticos
        for patron, variantes in sustituciones_comunes.items():
            if patron in palabra_busqueda:
                for variante in variantes:
                    if variante in palabra_dict:
                        puntuacion += 0.05
        
        return min(puntuacion, 1.0)
    
    def _buscar_aproximadas(self, palabra: str, mapa: Dict, 
                           umbral: float = 0.6, top_n: int = 5) -> List[Tuple[str, float]]:
        """
        Busca coincidencias aproximadas en el diccionario
        
        Args:
            palabra: Palabra a buscar
            mapa: Mapa de búsqueda (español->indígena o viceversa)
            umbral: Similitud mínima requerida (0-1)
            top_n: Número máximo de resultados
            
        Returns:
            Lista de tuplas (palabra_encontrada, puntuación)
        """
        palabra_norm = self._normalizar(palabra)
        resultados = []
        
        for clave_dict in mapa.keys():
            similitud = self._similitud_fonetica(palabra_norm, clave_dict)
            
            if similitud >= umbral:
                resultados.append((mapa[clave_dict], similitud))
        
        # Ordenar por puntuación descendente
        resultados.sort(key=lambda x: x[1], reverse=True)
        
        return resultados[:top_n]
    
    def traducir(self, palabra: str, direccion: str = 'es_ind') -> Dict:
        """
        Traduce una palabra con inteligencia
        
        Args:
            palabra: Palabra a traducir
            direccion: 'es_ind' (español->indígena) o 'ind_es' (indígena->español)
            
        Returns:
            Diccionario con traducción y confianza
        """
        palabra_norm = self._normalizar(palabra)
        
        if not palabra_norm:
            return {
                'éxito': False,
                'traduccion': None,
                'confianza': 0.0,
                'alternativas': []
            }
        
        # Seleccionar mapa según dirección
        mapa_principal = self.mapa_es_ind if direccion == 'es_ind' else self.mapa_ind_es
        
        # Búsqueda exacta primero
        if palabra_norm in mapa_principal:
            return {
                'éxito': True,
                'traduccion': mapa_principal[palabra_norm],
                'confianza': 1.0,
                'alternativas': [],
                'tipo': 'exacta'
            }
        
        # Búsqueda aproximada
        alternativas = self._buscar_aproximadas(palabra, mapa_principal, 
                                              umbral=0.60, top_n=5)
        
        if alternativas:
            mejor_resultado = alternativas[0]
            confianza = mejor_resultado[1]
            
            return {
                'éxito': True,
                'traduccion': mejor_resultado[0],
                'confianza': round(confianza, 2),
                'alternativas': [
                    {'palabra': alt[0], 'confianza': round(alt[1], 2)} 
                    for alt in alternativas[1:3]  # Top 2 alternativas
                ],
                'tipo': 'aproximada'
            }
        
        # No se encontró nada
        return {
            'éxito': False,
            'traduccion': None,
            'confianza': 0.0,
            'alternativas': [],
            'tipo': 'no_encontrada'
        }
    
    def traducir_frase(self, frase: str, direccion: str = 'es_ind') -> Dict:
        """
        Traduce una frase palabra por palabra
        """
        palabras = frase.split()
        traducciones = []
        confianza_total = 0.0
        
        for palabra in palabras:
            resultado = self.traducir(palabra.strip('.,!?;:'), direccion)
            if resultado['éxito']:
                traducciones.append(resultado['traduccion'])
                confianza_total += resultado['confianza']
            else:
                traducciones.append(palabra)  # Mantener palabra original
        
        confianza_promedio = (
            confianza_total / len(palabras) 
            if palabras else 0.0
        )
        
        return {
            'éxito': len(traducciones) > 0,
            'frase_traducida': ' '.join(traducciones),
            'confianza': round(confianza_promedio, 2),
            'palabras_traducidas': len([t for t in traducciones 
                                       if t not in palabras])
        }


def main():
    """Función principal para procesar desde stdin"""
    try:
        # Leer entrada desde stdin
        entrada_json = sys.stdin.read()
        entrada = json.loads(entrada_json)
        
        diccionario = entrada.get('diccionario', [])
        palabra = entrada.get('palabra', '')
        direccion = entrada.get('direccion', 'es_ind')
        
        # Crear traductor
        traductor = TraductorInteligente(diccionario)
        
        # Traducir
        resultado = traductor.traducir(palabra, direccion)
        
        # Enviar resultado a stdout
        print(json.dumps(resultado, ensure_ascii=False))
        
    except Exception as e:
        error_resultado = {
            'éxito': False,
            'error': str(e),
            'traduccion': None,
            'confianza': 0.0
        }
        print(json.dumps(error_resultado, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
