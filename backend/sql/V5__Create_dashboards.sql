CREATE TABLE dashboards (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id         UUID         NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    name               VARCHAR(100) NOT NULL,
    created_by_user_id UUID         NOT NULL REFERENCES users(id),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
