-- Notifies the "sprint_active_changed" channel when the active sprint for a project is
-- affected, so API instances can evict their local in-memory cache entry for that project.
--
-- Only fires when the result of GetActiveSprintAsync could actually have changed:
--   INSERT: a new sprint arrives already active
--   DELETE: the currently-active sprint is removed
--   UPDATE: is_active changed (activation / deactivation), OR any field changed on an
--           already-active sprint (the cached Sprint entity would otherwise hold stale data)
CREATE OR REPLACE FUNCTION notify_sprint_active_changed() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.is_active)
    OR (TG_OP = 'DELETE' AND OLD.is_active)
    OR (TG_OP = 'UPDATE' AND (NEW.is_active OR OLD.is_active))
    THEN
        PERFORM pg_notify('sprint_active_changed', COALESCE(NEW.project_id, OLD.project_id)::text);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sprint_active_changed ON sprints;

CREATE TRIGGER trg_sprint_active_changed
    AFTER INSERT OR UPDATE OR DELETE ON sprints
    FOR EACH ROW
    EXECUTE FUNCTION notify_sprint_active_changed();
