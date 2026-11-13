# Estudio de contenido

Abre «Editar contenido» en el pie. Permite seleccionar una ficha, editar campos editoriales permitidos, revisar el resultado y conservar/exportar un borrador local. No altera los documentos fuente ni habilita una experiencia para compra.

Los archivos de `src/domain/editorial` validan límites y campos. El cliente de `src/features/cms/api.ts` separa borradores locales, registros publicados y revisión administrativa. Los borradores guardados no se presentan como publicación pública.

La migración `202611130003_editorial.sql` prepara la revisión con autorización administrativa y control de revisiones. Debe aplicarse y probarse en un proyecto Supabase antes de usar el flujo alojado. Sin configuración se utiliza el modo de borrador local. La publicación comercial permanece bloqueada por la revisión legal pendiente.

Las demás migraciones presentes en el repositorio son trabajo en curso concurrente; las pruebas locales comprueban su aplicación y RLS. Esto no certifica un despliegue remoto ni todos los recorridos de producción.
