"""Registro, validación y persistencia de usuarios en JSON."""

import json
import os
import re
from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash
from zxcvbn import zxcvbn

from ubicaciones import buscar_residencia

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
USUARIOS_PATH = os.path.join(DATA_DIR, "usuarios.json")

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
PASSWORD_MIN_SCORE = 2  # 0-4 en zxcvbn

# Roles de la aplicación. `guest` es el visitante sin sesión y no se guarda.
ROLES = ("cliente", "empleado", "admin")
ROL_POR_DEFECTO = "cliente"
ROL_ADMIN = "admin"

USUARIO_PATTERN = re.compile(r"^[A-Za-z0-9._-]{3,30}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")

# zxcvbn devuelve sus mensajes en inglés; el frontend muestra español.
MENSAJES_ZXCVBN = {
    "Straight rows of keys are easy to guess": "Las filas de teclas son fáciles de adivinar.",
    "Short keyboard patterns are easy to guess": "Los patrones cortos de teclado son fáciles de adivinar.",
    "Repeats like \"aaa\" are easy to guess": "Las repeticiones como «aaa» son fáciles de adivinar.",
    "Repeats like \"abcabcabc\" are only slightly harder to guess than \"abc\"": "Las repeticiones como «abcabc» son fáciles de adivinar.",
    "Sequences like \"abc\" or \"6543\" are easy to guess": "Las secuencias como «abc» o «6543» son fáciles de adivinar.",
    "Recent years are easy to guess": "Los años recientes son fáciles de adivinar.",
    "Dates are often easy to guess": "Las fechas suelen ser fáciles de adivinar.",
    "This is a top-10 common password": "Es una de las 10 contraseñas más comunes.",
    "This is a top-100 common password": "Es una de las 100 contraseñas más comunes.",
    "This is a very common password": "Es una contraseña muy común.",
    "This is similar to a commonly used password": "Se parece a una contraseña muy usada.",
    "A word by itself is easy to guess": "Una sola palabra es fácil de adivinar.",
    "Names and surnames by themselves are easy to guess": "Los nombres y apellidos solos son fáciles de adivinar.",
    "Common names and surnames are easy to guess": "Los nombres y apellidos comunes son fáciles de adivinar.",
    "Use a few words, avoid common phrases": "Combina varias palabras y evita frases comunes.",
    "No need for symbols, digits, or uppercase letters": "No hace falta usar símbolos ni mayúsculas: suma palabras.",
    "Add another word or two. Uncommon words are better.": "Agrega una o dos palabras más, mejor si son poco comunes.",
    "Capitalization doesn't help very much": "Las mayúsculas ayudan poco.",
    "All-uppercase is almost as easy to guess as all-lowercase": "Escribir todo en mayúsculas no la hace más segura.",
    "Reversed words aren't much harder to guess": "Las palabras al revés son casi igual de fáciles de adivinar.",
    "Predictable substitutions like '@' instead of 'a' don't help very much": "Cambiar «a» por «@» no la hace mucho más segura.",
}

def normalizar_rol(valor):
    """Devuelve un rol válido; cualquier valor desconocido cae en cliente."""
    return valor if valor in ROLES else ROL_POR_DEFECTO


def normalizar_roles(usuarios):
    """Asegura que cada cuenta tenga rol y que siempre exista un admin.

    La primera cuenta registrada (el orden del JSON) es la fundadora: si el
    archivo viene de versiones anteriores sin roles, esa cuenta pasa a admin.
    """
    for usuario in usuarios:
        usuario["rol"] = normalizar_rol(usuario.get("rol"))

    if usuarios and not any(u.get("rol") == ROL_ADMIN for u in usuarios):
        usuarios[0]["rol"] = ROL_ADMIN

    return usuarios


def cargar_usuarios():
    try:
        with open(USUARIOS_PATH, "r", encoding="utf-8") as archivo:
            datos = json.load(archivo)
    except (FileNotFoundError, json.JSONDecodeError):
        return []
    if not isinstance(datos, list):
        return []
    usuarios = [
        usuario
        for usuario in datos
        if isinstance(usuario, dict) and usuario.get("usuario")
    ]
    return normalizar_roles(usuarios)


def guardar_usuarios(usuarios):
    os.makedirs(DATA_DIR, exist_ok=True)
    ruta_temporal = f"{USUARIOS_PATH}.tmp"
    with open(ruta_temporal, "w", encoding="utf-8") as archivo:
        json.dump(usuarios, archivo, ensure_ascii=False, indent=2)
    os.replace(ruta_temporal, USUARIOS_PATH)


def buscar_usuario(usuarios, nombre):
    buscado = str(nombre or "").strip().casefold()
    for usuario in usuarios:
        if usuario["usuario"].casefold() == buscado:
            return usuario
    return None


def usuario_publico(usuario):
    return {
        "usuario": usuario.get("usuario", ""),
        "nombres": usuario.get("nombres", ""),
        "apellidos": usuario.get("apellidos", ""),
        "residencia": usuario.get("residencia", ""),
        "email": usuario.get("email", ""),
        "creado": usuario.get("creado", ""),
        "rol": normalizar_rol(usuario.get("rol")),
    }


def crear_usuario(
    nombres,
    apellidos,
    usuario,
    residencia,
    email,
    password,
    rol=ROL_POR_DEFECTO,
):
    return {
        "usuario": usuario,
        "nombres": nombres,
        "apellidos": apellidos,
        "residencia": residencia,
        "email": email,
        "password_hash": generate_password_hash(password),
        "creado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rol": normalizar_rol(rol),
    }


def verificar_password(usuario, password):
    if not usuario or not isinstance(password, str) or not password:
        return False
    return check_password_hash(usuario.get("password_hash", ""), password)


def evaluar_password(password, datos_personales=()):
    """Valida la contraseña con zxcvbn (fuerza y datos del usuario)."""
    if not isinstance(password, str) or not password:
        return {
            "valida": False,
            "score": 0,
            "mensaje": "Ingresa una contraseña.",
        }

    if len(password) < PASSWORD_MIN_LENGTH:
        return {
            "valida": False,
            "score": 0,
            "mensaje": f"Usa al menos {PASSWORD_MIN_LENGTH} caracteres.",
        }

    if len(password) > PASSWORD_MAX_LENGTH:
        return {
            "valida": False,
            "score": 0,
            "mensaje": f"Usa como máximo {PASSWORD_MAX_LENGTH} caracteres.",
        }

    contexto = [
        str(dato).strip()
        for dato in datos_personales
        if isinstance(dato, str) and dato.strip()
    ]
    resultado = zxcvbn(password, user_inputs=contexto)
    score = int(resultado.get("score", 0))
    feedback = resultado.get("feedback") or {}
    aviso = feedback.get("warning") or ""
    sugerencias = [
        MENSAJES_ZXCVBN.get(item, "")
        for item in (feedback.get("suggestions") or [])
    ]
    sugerencias = [item for item in sugerencias if item]

    if score >= PASSWORD_MIN_SCORE:
        return {"valida": True, "score": score, "mensaje": ""}

    mensaje = MENSAJES_ZXCVBN.get(aviso, "")
    if not mensaje:
        mensaje = "La contraseña es fácil de adivinar."
    if sugerencias:
        mensaje = f"{mensaje} {sugerencias[0]}"
    return {"valida": False, "score": score, "mensaje": mensaje}


def validar_perfil(datos, usuarios, cuenta):
    """Valida los datos editables del perfil: usuario, residencia y correo."""
    datos = datos if isinstance(datos, dict) else {}

    usuario = str(datos.get("usuario") or "").strip()
    residencia = str(datos.get("residencia") or "").strip()
    email = str(datos.get("email") or "").strip()
    actual = str(cuenta.get("usuario") or "").strip()

    errores = {}

    if not usuario:
        errores["usuario"] = "Elige un nombre de usuario."
    elif not USUARIO_PATTERN.match(usuario):
        errores["usuario"] = (
            "El usuario debe tener entre 3 y 30 caracteres y usar solo letras, "
            "números, puntos, guiones o guiones bajos."
        )
    elif usuario.casefold() != actual.casefold() and buscar_usuario(usuarios, usuario):
        errores["usuario"] = "Ese usuario ya está en uso."

    if not residencia:
        errores["residencia"] = "Indica dónde vives."
    else:
        residencia_canonica = buscar_residencia(residencia)
        if not residencia_canonica:
            errores["residencia"] = "Elige un municipio de Cuba de la lista."
        else:
            residencia = residencia_canonica

    if email:
        if len(email) > 254 or not EMAIL_PATTERN.match(email):
            errores["email"] = "Ingresa un correo electrónico válido."

    valores = {
        "usuario": usuario,
        "residencia": residencia,
        "email": email,
    }
    return valores, errores


def validar_cambio_password(datos, cuenta):
    """Valida el cambio de contraseña de una cuenta existente."""
    datos = datos if isinstance(datos, dict) else {}

    actual = datos.get("password_actual")
    nueva = datos.get("password_nueva")
    errores = {}

    if not isinstance(actual, str) or not actual:
        errores["password_actual"] = "Ingresa tu contraseña actual."
    elif not verificar_password(cuenta, actual):
        errores["password_actual"] = "La contraseña actual no es correcta."

    evaluacion = evaluar_password(
        nueva,
        datos_personales=[
            cuenta.get("usuario"),
            cuenta.get("nombres"),
            cuenta.get("apellidos"),
            cuenta.get("residencia"),
            cuenta.get("email"),
        ],
    )
    if not evaluacion["valida"]:
        errores["password_nueva"] = evaluacion["mensaje"]
    elif isinstance(actual, str) and actual == nueva:
        errores["password_nueva"] = "Usa una contraseña distinta a la actual."

    return {"password_actual": actual, "password_nueva": nueva}, errores


def actualizar_password(cuenta, password):
    cuenta["password_hash"] = generate_password_hash(password)


def validar_registro(datos, usuarios):
    """Devuelve (valores_normalizados, errores_por_campo)."""
    datos = datos if isinstance(datos, dict) else {}

    nombres = str(datos.get("nombres") or "").strip()
    apellidos = str(datos.get("apellidos") or "").strip()
    usuario = str(datos.get("usuario") or "").strip()
    residencia = str(datos.get("residencia") or "").strip()
    email = str(datos.get("email") or "").strip()
    password = datos.get("password")

    errores = {}

    if not nombres:
        errores["nombres"] = "Ingresa tus nombres."
    elif len(nombres) > 80:
        errores["nombres"] = "Los nombres son demasiado largos."

    if not apellidos:
        errores["apellidos"] = "Ingresa tus apellidos."
    elif len(apellidos) > 80:
        errores["apellidos"] = "Los apellidos son demasiado largos."

    if not usuario:
        errores["usuario"] = "Elige un nombre de usuario."
    elif not USUARIO_PATTERN.match(usuario):
        errores["usuario"] = (
            "El usuario debe tener entre 3 y 30 caracteres y usar solo letras, "
            "números, puntos, guiones o guiones bajos."
        )
    elif buscar_usuario(usuarios, usuario):
        errores["usuario"] = "Ese usuario ya está en uso."

    if not residencia:
        errores["residencia"] = "Indica dónde vives."
    else:
        residencia = buscar_residencia(residencia)
        if not residencia:
            errores["residencia"] = "Elige un municipio de Cuba de la lista."

    if email:
        if len(email) > 254 or not EMAIL_PATTERN.match(email):
            errores["email"] = "Ingresa un correo electrónico válido."

    evaluacion = evaluar_password(
        password,
        datos_personales=[usuario, nombres, apellidos, residencia, email],
    )
    if not evaluacion["valida"]:
        errores["password"] = evaluacion["mensaje"]

    valores = {
        "nombres": nombres,
        "apellidos": apellidos,
        "usuario": usuario,
        "residencia": residencia,
        "email": email,
        "password": password,
    }
    return valores, errores
