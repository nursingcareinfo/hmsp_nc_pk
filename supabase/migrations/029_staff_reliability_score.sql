-- Migration 029: Staff Reliability Score View
-- Created: 2026-04-09
-- Purpose: Calculate all-time attendance reliability score per staff member
--          for use in Compensation table display and StaffMatchingModal ranking.
--
-- Formula: (present + late + half_day) / total_marked_days * 100
-- Where total_marked_days excludes on_leave (neutral, neither positive nor negative)
-- late = 0.5 credit, half_day = 0.5 credit (partial attendance)

-- Drop existing view if present (idempotent)
DROP VIEW IF EXISTS public.staff_reliability_scores CASCADE;

-- Create the reliability score view
CREATE VIEW public.staff_reliability_scores AS
SELECT
    staff_id,
    COUNT(*) AS total_marked_days,
    COUNT(*) FILTER (WHERE status = 'present') AS present_days,
    COUNT(*) FILTER (WHERE status = 'absent') AS absent_days,
    COUNT(*) FILTER (WHERE status = 'late') AS late_days,
    COUNT(*) FILTER (WHERE status = 'half_day') AS half_day_days,
    COUNT(*) FILTER (WHERE status = 'on_leave') AS on_leave_days,
    -- Weighted attendance: present=1.0, late=0.5, half_day=0.5
    (
        COUNT(*) FILTER (WHERE status = 'present')::NUMERIC +
        COUNT(*) FILTER (WHERE status = 'late')::NUMERIC * 0.5 +
        COUNT(*) FILTER (WHERE status = 'half_day')::NUMERIC * 0.5
    ) AS weighted_present,
    -- Total working days (excludes on_leave)
    (
        COUNT(*) FILTER (WHERE status != 'on_leave')
    ) AS total_working_days,
    -- Reliability percentage (0-100), 0 if no working days
    CASE
        WHEN COUNT(*) FILTER (WHERE status != 'on_leave') = 0 THEN 0
        ELSE ROUND(
            (
                (
                    COUNT(*) FILTER (WHERE status = 'present')::NUMERIC +
                    COUNT(*) FILTER (WHERE status = 'late')::NUMERIC * 0.5 +
                    COUNT(*) FILTER (WHERE status = 'half_day')::NUMERIC * 0.5
                ) / COUNT(*) FILTER (WHERE status != 'on_leave')::NUMERIC
            ) * 100
        )::INTEGER
    END AS reliability_score
FROM public.attendance_records
GROUP BY staff_id;

-- Grant read access to anon and authenticated roles
GRANT SELECT ON public.staff_reliability_scores TO anon;
GRANT SELECT ON public.staff_reliability_scores TO authenticated;
