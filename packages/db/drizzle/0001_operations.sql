ALTER TABLE promotions ADD COLUMN last_verification_coverage text;
ALTER TABLE verification_findings ADD COLUMN promotion_snapshot jsonb;
ALTER TABLE verification_findings ADD COLUMN baseline_updated_at timestamptz;
ALTER TABLE scrape_runs ADD COLUMN parent_run_id uuid;
ALTER TABLE scrape_runs ADD COLUMN cycle_id uuid;
ALTER TABLE scrape_runs ADD COLUMN cancel_requested_at timestamptz;
ALTER TABLE verification_runs ADD COLUMN parent_run_id uuid;
ALTER TABLE verification_runs ADD COLUMN cycle_id uuid;
ALTER TABLE verification_runs ADD COLUMN cancel_requested_at timestamptz;
--> statement-breakpoint
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), portal_id text NOT NULL,
 event_key text NOT NULL UNIQUE, action text NOT NULL, actor text NOT NULL,
 entity_type text NOT NULL, entity_id text NOT NULL, label text NOT NULL,
 run_id uuid, severity text NOT NULL DEFAULT 'info', "before" jsonb, "after" jsonb,
 message text NOT NULL, href text, notify boolean NOT NULL DEFAULT false,
 -- clock_timestamp(), not now(): several events can be written in one transaction and must still order.
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX audit_portal_time_idx ON audit_events(portal_id, created_at DESC, id);
CREATE INDEX audit_entity_idx ON audit_events(entity_id);
CREATE INDEX audit_run_idx ON audit_events(run_id);
CREATE TABLE notification_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
 event_id uuid NOT NULL REFERENCES audit_events(id), read_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, event_id)
);
CREATE TABLE portal_schedules (
 portal_id text PRIMARY KEY REFERENCES portals(id), enabled boolean NOT NULL DEFAULT false,
 interval_hours integer NOT NULL DEFAULT 24 CHECK(interval_hours BETWEEN 1 AND 168),
 coverage text NOT NULL DEFAULT 'quick' CHECK(coverage IN ('quick','full')),
 next_run_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text NOT NULL DEFAULT 'system', last_started_at timestamptz, last_outcome text,
 active_cycle_id uuid, scheduler_synced boolean NOT NULL DEFAULT false
);
CREATE TABLE schedule_cycles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), portal_id text NOT NULL REFERENCES portals(id),
 actor text NOT NULL, coverage text NOT NULL CHECK(coverage IN ('quick','full')),
 status text NOT NULL DEFAULT 'running', bootstrap boolean NOT NULL,
 first_run_id uuid, second_run_id uuid, due_at timestamptz NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
INSERT INTO portal_schedules(portal_id) SELECT id FROM portals;
--> statement-breakpoint
CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit events are append-only'; END;
$$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
--> statement-breakpoint
-- Database triggers keep the record write and its history in the same transaction.
-- No historical events are synthesized: these triggers start at this migration.
CREATE FUNCTION capture_operational_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
 n jsonb := to_jsonb(NEW); o jsonb;
 a text; actor_name text := 'system'; portal text; related uuid;
 severity_name text := 'info'; notification boolean := false; link text;
 entity_label text; entity_key text; ignored text[];
BEGIN
 IF TG_OP = 'UPDATE' THEN o := to_jsonb(OLD); END IF;
 portal := n->>'portal_id'; entity_key := n->>'id'; entity_label := COALESCE(n->>'title', n->>'name', entity_key);
 IF TG_TABLE_NAME IN ('scrape_runs','verification_runs') THEN
   related := (n->>'id')::uuid; actor_name := COALESCE(n->>'triggered_by','system');
   link := CASE WHEN TG_TABLE_NAME = 'scrape_runs' THEN '/app/runs/' ELSE '/app/verify/' END || entity_key;
   entity_label := CASE WHEN TG_TABLE_NAME = 'scrape_runs' THEN 'Scrape' ELSE 'Verification' END || ' ' || left(entity_key,8);
   IF TG_OP = 'INSERT' THEN a := 'run.launched';
   ELSIF n->>'cancel_requested_at' IS DISTINCT FROM o->>'cancel_requested_at' THEN a := 'run.cancellation_requested';
   ELSIF n->>'status' IS DISTINCT FROM o->>'status' THEN a := 'run.' || (n->>'status');
   ELSE RETURN NEW; END IF;
   notification := (n->>'status') IN ('completed','completed_with_errors','failed','stalled','cancelled');
   severity_name := CASE WHEN n->>'status' IN ('failed','stalled') THEN 'error' WHEN n->>'status' = 'completed_with_errors' THEN 'warning' WHEN n->>'status' = 'completed' THEN 'success' ELSE 'info' END;
 ELSIF TG_TABLE_NAME = 'promotions' THEN
   related := (n->>'last_scrape_run_id')::uuid;
   SELECT COALESCE(triggered_by,'system') INTO actor_name FROM scrape_runs WHERE id = related;
   link := '/app/promotions/' || entity_key;
   IF TG_OP = 'INSERT' THEN a := 'promotion.created';
   ELSIF n->>'source_id' IS DISTINCT FROM o->>'source_id' THEN a := 'promotion.identity_relinked';
   ELSIF n->>'removed_at' IS DISTINCT FROM o->>'removed_at' THEN a := CASE WHEN n->>'removed_at' IS NULL THEN 'promotion.reappeared' ELSE 'promotion.removed' END;
   ELSIF n->>'content_hash' IS DISTINCT FROM o->>'content_hash' THEN a := 'promotion.updated';
   ELSE RETURN NEW; END IF;
 ELSIF TG_TABLE_NAME = 'brands' THEN
   ignored := ARRAY['updated_at','last_seen_at','store_page_fetched_at','scraped_at','created_at'];
   IF TG_OP = 'UPDATE' AND (n - ignored) = (o - ignored) THEN RETURN NEW; END IF;
   a := CASE WHEN TG_OP = 'INSERT' THEN 'brand.created' ELSE 'brand.updated' END;
   link := '/app/brands/' || (n->>'slug');
 ELSIF TG_TABLE_NAME = 'verification_findings' THEN
   related := (n->>'run_id')::uuid;
   SELECT portal_id, COALESCE(triggered_by,'system') INTO portal, actor_name FROM verification_runs WHERE id = related;
   a := 'verification.observed'; entity_key := n->>'promotion_id';
   entity_label := COALESCE(n->'promotion_snapshot'->>'title',entity_key);
   link := '/app/verify/' || related::text;
 ELSE RETURN NEW; END IF;
 INSERT INTO audit_events(portal_id,event_key,action,actor,entity_type,entity_id,label,run_id,severity,"before","after",message,href,notify)
 VALUES(portal, gen_random_uuid()::text,a,COALESCE(actor_name,'system'),TG_TABLE_NAME,entity_key,entity_label,related,severity_name,o,n,replace(a,'.',' ') || ': ' || entity_label,link,notification);
 RETURN NEW;
END;
$$;
CREATE TRIGGER audit_scrape AFTER INSERT OR UPDATE ON scrape_runs FOR EACH ROW EXECUTE FUNCTION capture_operational_change();
CREATE TRIGGER audit_verify AFTER INSERT OR UPDATE ON verification_runs FOR EACH ROW EXECUTE FUNCTION capture_operational_change();
CREATE TRIGGER audit_promotions AFTER INSERT OR UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION capture_operational_change();
CREATE TRIGGER audit_brands AFTER INSERT OR UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION capture_operational_change();
CREATE TRIGGER audit_findings AFTER INSERT ON verification_findings FOR EACH ROW EXECUTE FUNCTION capture_operational_change();
