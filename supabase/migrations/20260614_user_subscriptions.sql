-- #54a: One subscription row per auth user (implicit free when no row)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id uuid PRIMARY KEY
    REFERENCES auth.users(id) ON DELETE CASCADE,

  plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'elite')),

  billing_period text
    CHECK (
      billing_period IS NULL
      OR billing_period IN ('monthly', 'yearly', 'lifetime')
    ),

  status text
    CHECK (
      status IS NULL
      OR status IN ('active', 'canceled', 'past_due')
    ),

  current_period_end timestamptz,
  -- lifetime: NULL = 永久有效（配合 billing_period = 'lifetime'）

  stripe_customer_id text,
  stripe_subscription_id text,
  -- lifetime 一次性付款通常无 subscription id，允许 NULL

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Webhook 按 Stripe customer 反查用户
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer
  ON user_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 到期扫描 / cron 清理（可选，#54 后期用）
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end
  ON user_subscriptions (current_period_end)
  WHERE current_period_end IS NOT NULL;

-- 自动维护 updated_at（与项目其它表风格一致）
CREATE OR REPLACE FUNCTION set_user_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_subscriptions_updated_at();

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 用户只能读自己的订阅信息（Pro 到期日、plan 展示等）
DROP POLICY IF EXISTS user_subscriptions_select_own ON user_subscriptions;
CREATE POLICY user_subscriptions_select_own ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 故意不为 authenticated / anon 创建 INSERT/UPDATE/DELETE policy
-- 写入仅 service_role（Stripe webhook、admin 脚本）
