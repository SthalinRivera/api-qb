-- Los dos checks heredados solo coincidían con el actual en 'vale'.
-- Se conserva recuperaciones_jabas_tipo_recuperacion_check y la regla de cantidad.
-- No elimina ni transforma registros. Ejecución transaccional.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.recuperaciones_jabas'::regclass AND conname = 'recuperaciones_jabas_tipo_recuperacion_check' AND convalidated) THEN
    RAISE EXCEPTION 'Falta la restricción vigente validada de tipo_recuperacion';
  END IF;
END $$;
ALTER TABLE public.recuperaciones_jabas DROP CONSTRAINT IF EXISTS chk_tipo_recuperacion;
ALTER TABLE public.recuperaciones_jabas DROP CONSTRAINT IF EXISTS recuperacion_tipo_check;
COMMIT;
