-- 066_add_task_recurrence.sql
-- Migration: let a task repeat
-- Purpose: The design handoff's New task form offers "Repeats", and the
--   branch checks the board exists for — cold room temperature, the floor
--   walk, the restock round — are by nature daily work. `tasks` (012) had no
--   way to say so, so every day's copy had to be typed again.
--
-- How it works: a task carries its own recurrence, and completing it creates
--   the next occurrence (TaskService.completeTask). There is no scheduler in
--   this system and this migration does not add one: the chain advances only
--   when somebody actually finishes the work, which also means an unfinished
--   daily check stays on the board instead of being silently replaced.
--
-- Safety: additive only. The column defaults to 'none', so every existing row
--   keeps today's behaviour and no constraint or trigger changes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_recurrence_enum') THEN
    CREATE TYPE public.task_recurrence_enum AS ENUM (
      'none',
      'daily',
      'weekdays',
      'weekly'
    );
  END IF;
END$$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence public.task_recurrence_enum NOT NULL DEFAULT 'none';

COMMENT ON COLUMN public.tasks.recurrence IS 'How often this task comes back. Completing a repeating task creates its next occurrence; ''none'' is a one-off.';
