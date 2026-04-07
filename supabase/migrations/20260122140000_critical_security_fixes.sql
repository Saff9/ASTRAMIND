-- CRITICAL SECURITY FIXES - PRODUCTION BLOCKERS
-- These fixes are MANDATORY before any production deployment

-- =========================================
-- PHASE 1: DATABASE SECURITY (ABSOLUTE PRIORITY)
-- =========================================

-- CRITICAL: Enable RLS on ALL tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS file_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assistant_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assistant_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_models ENABLE ROW LEVEL SECURITY;

-- DROP ALL EXISTING POLICIES (clean slate for security)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can access workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can access folders in their workspaces" ON folders;
DROP POLICY IF EXISTS "Users can access files in their workspaces" ON files;
DROP POLICY IF EXISTS "Users can access file items for their files" ON file_items;
-- Add more DROP statements as needed...

-- =========================================
-- ZERO TRUST: PROFILES (Users can ONLY access their own data)
-- =========================================

CREATE POLICY "profiles_strict_own_access" ON profiles
    FOR ALL USING (auth.uid() = id);

-- =========================================
-- ZERO TRUST: WORKSPACES (Complex role-based access)
-- =========================================

-- Workspace owners have full access
CREATE POLICY "workspaces_owner_full_access" ON workspaces
    FOR ALL USING (owner_id = auth.uid());

-- Workspace admins have full access
CREATE POLICY "workspaces_admin_full_access" ON workspaces
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workspace_users wu
            WHERE wu.workspace_id = workspaces.id
            AND wu.user_id = auth.uid()
            AND wu.role IN ('owner', 'admin')
        )
    );

-- Workspace members have read/write access (no delete)
CREATE POLICY "workspaces_member_limited_access" ON workspaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_users wu
            WHERE wu.workspace_id = workspaces.id
            AND wu.user_id = auth.uid()
            AND wu.role IN ('member', 'admin', 'owner')
        )
    );

CREATE POLICY "workspaces_member_update_only" ON workspaces
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_users wu
            WHERE wu.workspace_id = workspaces.id
            AND wu.user_id = auth.uid()
            AND wu.role IN ('member', 'admin', 'owner')
        )
    );

-- Read-only users can only view
CREATE POLICY "workspaces_readonly_view_only" ON workspaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_users wu
            WHERE wu.workspace_id = workspaces.id
            AND wu.user_id = auth.uid()
            AND wu.role = 'read-only'
        )
    );

-- =========================================
-- ZERO TRUST: FOLDERS
-- =========================================

CREATE POLICY "folders_workspace_member_access" ON folders
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workspace_users wu
                WHERE wu.workspace_id = workspaces.id
                AND wu.user_id = auth.uid()
            )
        )
    );

-- =========================================
-- ZERO TRUST: FILES
-- =========================================

CREATE POLICY "files_workspace_member_access" ON files
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workspace_users wu
                WHERE wu.workspace_id = workspaces.id
                AND wu.user_id = auth.uid()
            )
        )
    );

-- =========================================
-- ZERO TRUST: CHATS
-- =========================================

CREATE POLICY "chats_workspace_member_access" ON chats
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workspace_users wu
                WHERE wu.workspace_id = workspaces.id
                AND wu.user_id = auth.uid()
            )
        )
    );

-- =========================================
-- ZERO TRUST: MESSAGES
-- =========================================

CREATE POLICY "messages_workspace_member_access" ON messages
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workspace_users wu
                WHERE wu.workspace_id = workspaces.id
                AND wu.user_id = auth.uid()
            )
        )
    );

-- =========================================
-- SECRETS MANAGEMENT (ENCRYPTED API KEYS)
-- =========================================

-- Create encrypted API keys table
CREATE TABLE IF NOT EXISTS encrypted_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'groq', 'openrouter', 'google', 'mistral')),
    encrypted_key TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_rotated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(user_id, workspace_id, provider)
);

-- Enable RLS
ALTER TABLE encrypted_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can ONLY access their own keys
CREATE POLICY "api_keys_own_access_only" ON encrypted_api_keys
    FOR ALL USING (auth.uid() = user_id);

-- =========================================
-- AI SAFETY CONTROLS
-- =========================================

-- System prompts table (immutable)
CREATE TABLE IF NOT EXISTS system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    prompt TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

-- ONLY service role can modify system prompts
CREATE POLICY "system_prompts_service_only" ON system_prompts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Public read access for active prompts
CREATE POLICY "system_prompts_public_read" ON system_prompts
    FOR SELECT USING (is_active = true);

-- Tool schemas table (strict validation)
CREATE TABLE IF NOT EXISTS tool_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    schema JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tool_schemas ENABLE ROW LEVEL SECURITY;

-- ONLY service role can modify tool schemas
CREATE POLICY "tool_schemas_service_only" ON tool_schemas
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Public read access for active schemas
CREATE POLICY "tool_schemas_public_read" ON tool_schemas
    FOR SELECT USING (is_active = true);

-- =========================================
-- COST CONTROL & USAGE TRACKING
-- =========================================

CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_used INTEGER NOT NULL CHECK (tokens_used >= 0),
    cost_cents INTEGER NOT NULL CHECK (cost_cents >= 0),
    response_time_ms INTEGER CHECK (response_time_ms >= 0),
    success BOOLEAN NOT NULL DEFAULT true,
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_type TEXT,
    error_message TEXT
);

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "usage_own_view" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

-- Workspace admins can view workspace usage
CREATE POLICY "usage_workspace_admin_view" ON usage_tracking
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workspace_users wu
                WHERE wu.workspace_id = workspaces.id
                AND wu.user_id = auth.uid()
                AND wu.role IN ('admin', 'owner')
            )
        )
    );

-- =========================================
-- SPENDING LIMITS
-- =========================================

CREATE TABLE IF NOT EXISTS spending_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    daily_limit_cents INTEGER NOT NULL DEFAULT 500 CHECK (daily_limit_cents >= 0),
    monthly_limit_cents INTEGER NOT NULL DEFAULT 5000 CHECK (monthly_limit_cents >= 0),
    model_limits JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT spending_limits_scope CHECK (
        (user_id IS NOT NULL AND workspace_id IS NULL) OR
        (user_id IS NULL AND workspace_id IS NOT NULL)
    )
);

ALTER TABLE spending_limits ENABLE ROW LEVEL SECURITY;

-- Users manage their own limits
CREATE POLICY "spending_limits_own_management" ON spending_limits
    FOR ALL USING (auth.uid() = user_id);

-- Workspace owners/admins manage workspace limits
CREATE POLICY "spending_limits_workspace_management" ON spending_limits
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workspace_users wu
                WHERE wu.workspace_id = workspaces.id
                AND wu.user_id = auth.uid()
                AND wu.role IN ('admin', 'owner')
            )
        )
    );

-- =========================================
-- AUDIT LOGGING (CRITICAL FOR COMPLIANCE)
-- =========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "audit_logs_own_view" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Workspace admins can view workspace audit logs
CREATE POLICY "audit_logs_workspace_admin_view" ON audit_logs
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workspace_users wu
                WHERE wu.workspace_id = workspaces.id
                AND wu.user_id = auth.uid()
                AND wu.role IN ('admin', 'owner')
            )
        )
    );

-- =========================================
-- DATA RETENTION POLICIES
-- =========================================

CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    message_retention_days INTEGER NOT NULL DEFAULT 365 CHECK (message_retention_days > 0),
    file_retention_days INTEGER NOT NULL DEFAULT 365 CHECK (file_retention_days > 0),
    usage_retention_days INTEGER NOT NULL DEFAULT 365 CHECK (usage_retention_days > 0),
    auto_cleanup BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT retention_policies_scope CHECK (
        (user_id IS NOT NULL AND workspace_id IS NULL) OR
        (user_id IS NULL AND workspace_id IS NOT NULL)
    )
);

ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;

-- Users manage their own retention policies
CREATE POLICY "retention_policies_own_management" ON retention_policies
    FOR ALL USING (auth.uid() = user_id);

-- Workspace owners/admins manage workspace policies
CREATE POLICY "retention_policies_workspace_management" ON retention_policies
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM workspace_users wu
                WHERE wu.workspace_id = workspaces.id
                AND wu.user_id = auth.uid()
                AND wu.role IN ('admin', 'owner')
            )
        )
    );

-- =========================================
-- ABUSE DETECTION
-- =========================================

CREATE TABLE IF NOT EXISTS abuse_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    violation_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE abuse_detection ENABLE ROW LEVEL SECURITY;

-- ONLY service role can access abuse detection
CREATE POLICY "abuse_detection_service_only" ON abuse_detection
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =========================================
-- UTILITY FUNCTIONS
-- =========================================

-- Function to check spending limits
CREATE OR REPLACE FUNCTION check_spending_limit(
    p_user_id UUID,
    p_workspace_id UUID DEFAULT NULL,
    p_cost_cents INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_used INTEGER := 0;
    monthly_used INTEGER := 0;
    daily_limit INTEGER := 500;
    monthly_limit INTEGER := 5000;
    current_month DATE;
BEGIN
    current_month := DATE_TRUNC('month', NOW())::DATE;

    -- Get spending limits
    SELECT daily_limit_cents, monthly_limit_cents
    INTO daily_limit, monthly_limit
    FROM spending_limits
    WHERE (user_id = p_user_id AND workspace_id IS NULL)
       OR (workspace_id = p_workspace_id AND user_id IS NULL)
    LIMIT 1;

    -- Calculate current usage
    SELECT
        COALESCE(SUM(cost_cents) FILTER (WHERE DATE(request_timestamp) = CURRENT_DATE), 0),
        COALESCE(SUM(cost_cents) FILTER (WHERE DATE_TRUNC('month', request_timestamp) = current_month), 0)
    INTO daily_used, monthly_used
    FROM usage_tracking
    WHERE user_id = p_user_id
      AND (workspace_id = p_workspace_id OR p_workspace_id IS NULL);

    -- Check limits
    IF daily_used + p_cost_cents > daily_limit THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'daily_limit_exceeded',
            'daily_used', daily_used,
            'daily_limit', daily_limit,
            'requested', p_cost_cents
        );
    END IF;

    IF monthly_used + p_cost_cents > monthly_limit THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'monthly_limit_exceeded',
            'monthly_used', monthly_used,
            'monthly_limit', monthly_limit,
            'requested', p_cost_cents
        );
    END IF;

    RETURN json_build_object('allowed', true);
END;
$$;

-- Function to log audit events
CREATE OR REPLACE FUNCTION audit_log_event(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_workspace_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, workspace_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent, session_id
    ) VALUES (
        p_user_id, p_workspace_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, p_ip_address, p_user_agent, p_session_id
    );
END;
$$;

-- Function to validate workspace access
CREATE OR REPLACE FUNCTION validate_workspace_access(
    p_user_id UUID,
    p_workspace_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    is_owner BOOLEAN := false;
BEGIN
    -- Check if user is owner
    SELECT (owner_id = p_user_id) INTO is_owner
    FROM workspaces
    WHERE id = p_workspace_id;

    IF is_owner THEN
        RETURN json_build_object(
            'has_access', true,
            'role', 'owner',
            'workspace_id', p_workspace_id
        );
    END IF;

    -- Check workspace membership
    SELECT role INTO user_role
    FROM workspace_users
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id;

    IF user_role IS NOT NULL THEN
        RETURN json_build_object(
            'has_access', true,
            'role', user_role,
            'workspace_id', p_workspace_id
        );
    END IF;

    RETURN json_build_object(
        'has_access', false,
        'reason', 'not_a_member',
        'workspace_id', p_workspace_id
    );
END;
$$;

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_messages_workspace_created ON messages(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_workspace_user ON chats(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_files_workspace_created ON files(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, DATE(request_timestamp));
CREATE INDEX IF NOT EXISTS idx_usage_tracking_workspace_date ON usage_tracking(workspace_id, DATE(request_timestamp));
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_timestamp ON audit_logs(workspace_id, timestamp DESC);

-- =========================================
-- DEFAULT SYSTEM PROMPTS
-- =========================================

INSERT INTO system_prompts (name, prompt, version, is_active) VALUES
('astramind_default', 'You are ASTRAMIND AI, a helpful AI assistant with ASTRAMIND personality. You respond with enthusiasm, use emojis, and keep it real! 🔥 You are built by ASTRAMIND and love helping users with their questions and tasks.', 1, true)
ON CONFLICT (name) DO NOTHING;

-- =========================================
-- CLEANUP TRIGGERS
-- =========================================

-- Function to automatically clean up expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    retention_record RECORD;
BEGIN
    -- Clean up messages based on retention policies
    FOR retention_record IN
        SELECT user_id, workspace_id, message_retention_days
        FROM retention_policies
        WHERE auto_cleanup = true
    LOOP
        IF retention_record.user_id IS NOT NULL THEN
            -- User-level cleanup
            DELETE FROM messages
            WHERE user_id = retention_record.user_id
              AND created_at < NOW() - INTERVAL '1 day' * retention_record.message_retention_days;
        ELSIF retention_record.workspace_id IS NOT NULL THEN
            -- Workspace-level cleanup
            DELETE FROM messages
            WHERE workspace_id = retention_record.workspace_id
              AND created_at < NOW() - INTERVAL '1 day' * retention_record.message_retention_days;
        END IF;
    END LOOP;

    -- Clean up old usage data
    DELETE FROM usage_tracking
    WHERE request_timestamp < NOW() - INTERVAL '365 days';

    -- Clean up old audit logs
    DELETE FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '365 days';

    -- Log cleanup
    INSERT INTO audit_logs (action, resource_type, details)
    VALUES ('system_cleanup', 'maintenance', json_build_object('cleanup_type', 'expired_data'));
END;
$$;