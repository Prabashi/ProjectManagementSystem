CREATE TABLE IF NOT EXISTS projects (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    created_by_user_id  UUID        NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID      NOT NULL REFERENCES users(id),
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id)
);
