    -- 004_create_shift_templates.sql
    -- Migration: create shift_templates table
    -- Implements: DB-005, DB-006, DB-007, DB-008, SEC-004, SCH-002, SHIFT-004
    -- This migration creates the reusable shift_templates table used by scheduling.

    -- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
    END IF;
    END$$;

    -- Create shift template status enum if not exists
    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_template_status_enum') THEN
        CREATE TYPE public.shift_template_status_enum AS ENUM (
        'active',
        'archived'
        );
    END IF;
    END$$;

    -- Create shift_templates table
    CREATE TABLE IF NOT EXISTS public.shift_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name text NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    duration interval NOT NULL,
    crosses_midnight boolean NOT NULL DEFAULT false,
    notes text,
    status public.shift_template_status_enum NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
    );

    -- Ensure branch tenancy integrity
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.contype = 'u' AND t.relname = 'branches' AND c.conname = 'uq_branches_id_organization_id')
    THEN
        ALTER TABLE public.branches
        ADD CONSTRAINT uq_branches_id_organization_id UNIQUE (id, organization_id);
    END IF;
    END$$;

    -- Foreign keys
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.contype = 'f' AND t.relname = 'shift_templates' AND c.conname = 'fk_shift_templates_organization')
    THEN
        ALTER TABLE public.shift_templates
        ADD CONSTRAINT fk_shift_templates_organization FOREIGN KEY (organization_id)
            REFERENCES public.organizations (id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.contype = 'f' AND t.relname = 'shift_templates' AND c.conname = 'fk_shift_templates_branch')
    THEN
        ALTER TABLE public.shift_templates
        ADD CONSTRAINT fk_shift_templates_branch FOREIGN KEY (branch_id, organization_id)
            REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
    END IF;
    END$$;

    -- Unique case-insensitive template name per organization and branch for active templates only
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relname = 'uq_shift_templates_org_branch_lower_name')
    THEN
        CREATE UNIQUE INDEX uq_shift_templates_org_branch_lower_name
          ON public.shift_templates (organization_id, branch_id, lower(name))
          WHERE deleted_at IS NULL;
    END IF;
    END$$;

    -- Validate shift template data
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'shift_templates' AND c.conname = 'chk_shift_templates_name_not_empty')
    THEN
        ALTER TABLE public.shift_templates
        ADD CONSTRAINT chk_shift_templates_name_not_empty CHECK (
            name IS NOT NULL
            AND trim(name) <> ''
            AND name = trim(name)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'shift_templates' AND c.conname = 'chk_shift_templates_duration_positive')
    THEN
        ALTER TABLE public.shift_templates
        ADD CONSTRAINT chk_shift_templates_duration_positive CHECK (
            duration IS NOT NULL
            AND duration > interval '00:00:00'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'shift_templates' AND c.conname = 'chk_shift_templates_duration_maximum')
    THEN
        ALTER TABLE public.shift_templates
        ADD CONSTRAINT chk_shift_templates_duration_maximum CHECK (
            duration <= interval '24:00:00'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'shift_templates' AND c.conname = 'chk_shift_templates_duration_matches_time_range')
    THEN
        ALTER TABLE public.shift_templates
        ADD CONSTRAINT chk_shift_templates_duration_matches_time_range CHECK (
            (crosses_midnight = false AND end_time > start_time AND duration = end_time - start_time)
            OR (crosses_midnight = true AND end_time < start_time AND duration = end_time + interval '24 hours' - start_time)
        );
    END IF;
    END$$;

    -- Indexes
    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_templates_organization_id') THEN
        CREATE INDEX idx_shift_templates_organization_id ON public.shift_templates (organization_id);
    END IF;
    END$$;

    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_templates_branch_id') THEN
        CREATE INDEX idx_shift_templates_branch_id ON public.shift_templates (branch_id);
    END IF;
    END$$;

    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_templates_status') THEN
        CREATE INDEX idx_shift_templates_status ON public.shift_templates (status);
    END IF;
    END$$;

    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_templates_lower_name') THEN
        CREATE INDEX idx_shift_templates_lower_name ON public.shift_templates (organization_id, lower(name));
    END IF;
    END$$;

    COMMENT ON TABLE public.shift_templates IS 'Reusable branch-scoped shift templates owned by an organization.';
    COMMENT ON COLUMN public.shift_templates.name IS 'Template name used for scheduling and display.';
    COMMENT ON COLUMN public.shift_templates.start_time IS 'Default shift start time for the template.';
    COMMENT ON COLUMN public.shift_templates.end_time IS 'Default shift end time for the template.';
    COMMENT ON COLUMN public.shift_templates.duration IS 'Expected shift duration for the template. The application may use this as a default when creating actual shifts.';
    COMMENT ON COLUMN public.shift_templates.crosses_midnight IS 'Indicates whether the template crosses midnight. If true, end_time must be earlier than start_time.';
    COMMENT ON COLUMN public.shift_templates.notes IS 'Optional operational notes or instructions for the shift template.';
    COMMENT ON COLUMN public.shift_templates.status IS 'Template lifecycle state. Archived templates remain for history but are not used for new shifts.';
    COMMENT ON COLUMN public.shift_templates.branch_id IS 'Branch scope for the template. Templates are scoped to a specific branch and organization.';

    -- Row-Level Security (RLS)
    -- RLS is enabled to prevent accidental public access. Tenant-aware policies will be added later
    -- when membership and schedule authorization rules exist.
    ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

    -- Attach `updated_at` trigger to shift_templates
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
        WHERE t.tgname = 'trg_shift_templates_set_updated_at' AND c.relname = 'shift_templates')
    THEN
        CREATE TRIGGER trg_shift_templates_set_updated_at
        BEFORE UPDATE ON public.shift_templates
        FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
    END IF;
    END$$;
