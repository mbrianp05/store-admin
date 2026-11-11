"""Limitador de intentos en memoria para proteger el login."""

import math
import threading
import time


class LimitadorIntentos:
    """Cuenta fallos por clave dentro de una ventana y bloquea al superarlos.

    El estado vive en memoria del proceso: alcanza para el servidor de
    desarrollo de este proyecto. Si se ejecuta con varios workers, cada uno
    tendría su propio contador.
    """

    def __init__(self, max_intentos=5, ventana=900, bloqueo=900):
        self.max_intentos = max(1, int(max_intentos))
        self.ventana = max(1, int(ventana))
        self.bloqueo = max(1, int(bloqueo))
        self._intentos = {}
        self._bloqueos = {}
        self._candado = threading.Lock()

    def espera(self, clave):
        """Segundos que faltan para poder reintentar (0 si no está bloqueado)."""
        if not clave:
            return 0

        ahora = time.monotonic()
        with self._candado:
            hasta = self._bloqueos.get(clave, 0)
            if hasta <= ahora:
                if hasta:
                    self._bloqueos.pop(clave, None)
                return 0
            return max(1, math.ceil(hasta - ahora))

    def registrar_fallo(self, clave):
        if not clave:
            return

        ahora = time.monotonic()
        with self._candado:
            intentos = [
                momento
                for momento in self._intentos.get(clave, [])
                if ahora - momento < self.ventana
            ]
            intentos.append(ahora)

            if len(intentos) >= self.max_intentos:
                self._bloqueos[clave] = ahora + self.bloqueo
                self._intentos.pop(clave, None)
            else:
                self._intentos[clave] = intentos

            self._limpiar(ahora)

    def limpiar(self, clave):
        """Borra el historial de una clave tras un login exitoso."""
        if not clave:
            return
        with self._candado:
            self._intentos.pop(clave, None)
            self._bloqueos.pop(clave, None)

    def reiniciar(self):
        with self._candado:
            self._intentos.clear()
            self._bloqueos.clear()

    def _limpiar(self, ahora):
        """Evita que los diccionarios crezcan sin límite."""
        if len(self._intentos) < 1000 and len(self._bloqueos) < 1000:
            return

        self._intentos = {
            clave: [
                momento
                for momento in momentos
                if ahora - momento < self.ventana
            ]
            for clave, momentos in self._intentos.items()
        }
        self._intentos = {
            clave: momentos for clave, momentos in self._intentos.items() if momentos
        }
        self._bloqueos = {
            clave: hasta for clave, hasta in self._bloqueos.items() if hasta > ahora
        }
