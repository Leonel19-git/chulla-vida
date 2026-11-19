# Acceso independiente del equipo

## Uso

La dirección de entrada es `/equipo`; `/administracion` conserva compatibilidad y abre la misma aplicación independiente. La pantalla solo pide **usuario y contraseña**. No monta el menú, registro, intro, consentimiento ni perfil de viajeros. La bandeja de solicitudes y documentos conserva sus controles, motivos e historial.

Cada acceso pertenece a un actor individual. El rol `admin` tiene alcance administrativo; `reviewer` se vincula exclusivamente al rol de verificación. Ambos pueden revisar negocios; el revisor no obtiene administración financiera, de roles ni del editor. El acceso aparece en este dashboard y no en el perfil de viajeros.

Las contraseñas iniciales son aleatorias y deben sustituirse al entrar por primera vez. Nunca se guardan en el código, la documentación pública o las tablas de la aplicación. La autenticación y sus hashes permanecen en Supabase Auth. Los nombres concretos y las claves entregadas al propietario no forman parte de este documento.

## Identidades y recuperación

Supabase Auth usa internamente un identificador técnico bajo el dominio reservado `staff.chulla-vida.invalid`, derivado del usuario. No es un correo personal ni una dirección de contacto: no recibe verificaciones, mensajes ni recuperación por correo. La activación la realiza el propietario mediante aprovisionamiento administrativo. No representa una validación de identidad de viajero.

La recuperación o sustitución de un acceso corresponde al propietario del proyecto mediante la administración confiable de Supabase. No se ofrece registro público de personal ni recuperación a direcciones inexistentes. Deshabilitar `staff_accounts.active` revoca el acceso a la bandeja y las decisiones incluso con tokens anteriores; los roles deben retirarse también al revocar definitivamente un puesto.

## Implementación y límites

- Cliente Auth independiente, con clave de sesión `chullavida:staff:auth`; no comparte ni cierra la sesión de viajeros.
- El registro normal impide usar identidades técnicas de equipo. Las cuentas del equipo no se consideran cuentas verificadas de viajeros para solicitudes de negocio y compras.
- `is_admin` e `is_reviewer` comprueban cuenta activa, cambio inicial de clave y sesión. Los metadatos editables del usuario no asignan roles.
- Tras cambiar la contraseña, el servidor registra un corte de credenciales con el reloj de la base. Solo sesiones Auth posteriores pueden ejercer los permisos del equipo. El cliente inicia una sesión nueva al completar el cambio.
- Crear accesos requiere una autorización de propietario de un solo uso y diez minutos, ligada a un nombre y rol concretos. Solo su hash se guarda en la base. La función del servidor consume la autorización y utiliza la clave administrativa de Supabase dentro de Vercel; esa clave no se descarga, devuelve ni incluye en el frontend.
- Cada alta y cambio de contraseña registra su actor y acción sin incluir contraseñas. Las respuestas administrativas usan `Cache-Control: no-store`.
- Aprobar negocios sigue exigiendo revisión humana, documentación, comprobaciones y motivo. Aprobar identidad no publica ofertas ni activa ventas.

## Validación

La comprobación completa pasa 1008 pruebas en 97 archivos, además de compilación web/API y verificaciones de dominio y traducciones. Se comprueban autorizaciones de un solo uso, bloqueo de autoasignación, cambio inicial obligatorio, sesiones anteriores, aislamiento entre usuarios y alcance del revisor. El navegador se revisa en escritorio y WebKit con tamaño de iPhone; las pruebas de interfaz usan datos ficticios.

Fuentes de implementación: [Supabase: creación administrativa de usuarios](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [inicio con contraseña](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) y [sesiones y relación con `auth.sessions`](https://supabase.com/docs/guides/auth/sessions).
