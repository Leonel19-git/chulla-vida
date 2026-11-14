-- Endurecimiento posterior a la auditoría de seguridad del 13-11-2026 (docs/SEGURIDAD.md).
-- Las funciones de disparador con SECURITY DEFINER no deben poder invocarse por RPC.
-- PostgreSQL ya impide llamarlas fuera de un disparador, pero retiramos el permiso EXECUTE
-- heredado de PUBLIC (y de los roles por defecto de Supabase) como defensa en profundidad.
-- Los disparadores siguen funcionando: el permiso EXECUTE no se comprueba al disparar.

revoke execute on function
  public.audit_user_roles(),
  public.add_owner_membership(),
  public.audit_verification_request(),
  public.audit_organization_verification(),
  public.sync_experience_operator_status(),
  public.bookings_capacity(),
  public.bookings_history(),
  public.sync_profile_consent()
from public, anon, authenticated;
