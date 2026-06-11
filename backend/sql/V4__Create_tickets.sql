CREATE TABLE tickets (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sprint_id           UUID         REFERENCES sprints(id) ON DELETE SET NULL,
    subject             VARCHAR(200) NOT NULL,
    description         TEXT,
    estimate            DECIMAL(5,2),
    assignee_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
    status              VARCHAR(20)  NOT NULL,
    board_order         INTEGER      NOT NULL DEFAULT 0,
    created_by_user_id  UUID         NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_tickets_project_sprint ON tickets(project_id, sprint_id);
CREATE INDEX ix_tickets_status_order   ON tickets(project_id, status, board_order);
