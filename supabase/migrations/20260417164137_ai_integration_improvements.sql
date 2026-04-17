-- AI Integration Improvements for HMSP Nursing Care Dashboard
-- Purpose: Better structure data for AI queries and marketplace features

-- 1. AI Conversations Table - Persist chat history for context
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    conversation_type TEXT NOT NULL DEFAULT 'general',
    title TEXT,
    message JSONB NOT NULL,
    response JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for ai_conversations
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conversations_own_read" ON public.ai_conversations;
CREATE POLICY "ai_conversations_own_read" ON public.ai_conversations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_own_insert" ON public.ai_conversations;
CREATE POLICY "ai_conversations_own_insert" ON public.ai_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_own_delete" ON public.ai_conversations;
CREATE POLICY "ai_conversations_own_delete" ON public.ai_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- 2. Service Requests Table - Track patient service needs for AI matching
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    required_skills TEXT[],
    required_category TEXT,
    shift_type TEXT,
    district TEXT,
    budget_min INTEGER,
    budget_max INTEGER,
    urgency TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    assigned_staff_id UUID REFERENCES public.staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- RLS for service_requests
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_own_read" ON public.service_requests;
CREATE POLICY "service_requests_own_read" ON public.service_requests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_requests_own_insert" ON public.service_requests;
CREATE POLICY "service_requests_own_insert" ON public.service_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_requests_own_update" ON public.service_requests;
CREATE POLICY "service_requests_own_update" ON public.service_requests
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_requests_own_delete" ON public.service_requests;
CREATE POLICY "service_requests_own_delete" ON public.service_requests
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Staff Performance Metrics Table - Track metrics for AI recommendations
CREATE TABLE IF NOT EXISTS public.staff_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_shifts INTEGER DEFAULT 0,
    completed_shifts INTEGER DEFAULT 0,
    missed_shifts INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),
    patient_feedback_count INTEGER DEFAULT 0,
    punctuality_score DECIMAL(5,2) DEFAULT 0,
    reliability_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, period_start)
);

-- RLS for staff_metrics
ALTER TABLE public.staff_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_metrics_auth_read" ON public.staff_metrics;
CREATE POLICY "staff_metrics_auth_read" ON public.staff_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "staff_metrics_service_write" ON public.staff_metrics;
CREATE POLICY "staff_metrics_service_write" ON public.staff_metrics
    FOR ALL USING (auth.role() = 'service_role');

-- 4. Indexes for AI Query Optimization
CREATE INDEX IF NOT EXISTS idx_staff_category_district ON public.staff(category, official_district);
CREATE INDEX IF NOT EXISTS idx_staff_status_available ON public.staff(status, availability);
CREATE INDEX IF NOT EXISTS idx_patients_district_status ON public.patients(district, status);
CREATE INDEX IF NOT EXISTS idx_duty_assignments_date ON public.duty_assignments(duty_date);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, created_at DESC);

-- 5. Add marketplace-specific columns to staff table (for future marketplace)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS marketplace_visible BOOLEAN DEFAULT false;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS hourly_rate INTEGER;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- 6. Add marketplace columns to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS hiring_history JSONB DEFAULT '[]';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

COMMENT ON TABLE public.ai_conversations IS 'Stores AI chat conversations for context and history';
COMMENT ON TABLE public.service_requests IS 'Tracks patient service requests for AI-powered nurse matching';
COMMENT ON TABLE public.staff_metrics IS 'Aggregated performance metrics for AI recommendations';