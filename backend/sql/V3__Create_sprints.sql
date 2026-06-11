CREATE TABLE sprints (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    start_date  DATE,
    end_date    DATE,
    is_active   BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Enforce at most one active sprint per project
CREATE UNIQUE INDEX uix_sprints_one_active_per_project ON sprints(project_id) WHERE is_active = true;
