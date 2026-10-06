-- Sequential (left-packed) badge showcase.
--
-- The showcase renders five fixed slots and pins must occupy them in order:
-- no "slot 1 filled, slot 2 empty, slot 3 filled" arrangements. The RPC now
-- strips NULL entries from the incoming array before validating, so storage
-- stays compact no matter what a client sends; a one-time cleanup below
-- left-packs rows stored while the NULL-gap model was live.
--
-- Slot availability itself (min(5, earned count)) is enforced by
-- construction: every pin must exist in student_badges and duplicates are
-- rejected, so a student can never pin more badges than they have earned.

CREATE OR REPLACE FUNCTION public.update_pinned_badges(p_badge_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_compact text[];
  v_pinned_count integer;
  v_distinct_count integer;
BEGIN
  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  -- Left-pack: drop NULL gap entries, preserving order.
  SELECT array_agg(b.id ORDER BY b.ord)
    INTO v_compact
  FROM unnest(p_badge_ids) WITH ORDINALITY AS b(id, ord)
  WHERE b.id IS NOT NULL;

  SELECT count(*), count(DISTINCT u.id)
    INTO v_pinned_count, v_distinct_count
  FROM unnest(v_compact) AS u(id);

  IF v_pinned_count > 5 THEN
    RAISE EXCEPTION 'Showcase holds at most 5 badges';
  END IF;

  IF v_pinned_count <> v_distinct_count THEN
    RAISE EXCEPTION 'A badge cannot occupy two showcase slots';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_compact) AS u(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.student_badges sb
      WHERE sb.student_id = v_student_id
        AND sb.badge_id = u.id
    )
  ) THEN
    RAISE EXCEPTION 'Badge not earned yet';
  END IF;

  UPDATE public.student_gamification_profile
  SET pinned_badge_ids = COALESCE(v_compact, '{}'::text[]),
      updated_at = now()
  WHERE student_id = v_student_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_pinned_badges(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pinned_badges(text[]) TO authenticated;

-- One-time normalization: left-pack any rows stored with NULL gaps.
UPDATE public.student_gamification_profile
SET pinned_badge_ids = COALESCE(
  (SELECT array_agg(x.id ORDER BY x.ord)
   FROM unnest(pinned_badge_ids) WITH ORDINALITY AS x(id, ord)
   WHERE x.id IS NOT NULL),
  '{}'::text[]
)
WHERE EXISTS (
  SELECT 1 FROM unnest(pinned_badge_ids) AS y(id) WHERE y.id IS NULL
);
