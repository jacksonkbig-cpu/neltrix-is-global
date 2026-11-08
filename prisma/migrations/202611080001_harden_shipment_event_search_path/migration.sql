-- The trigger only raises an exception and does not need application objects.
-- Pin the search path to pg_catalog to prevent search_path hijacking.
ALTER FUNCTION public.prevent_shipment_event_mutation() SET search_path = pg_catalog;
