-- Migration 005: Subscription Lifecycle Columns
-- Adds is_paused and valid_until to subscriptions table to support pause/resume and expiration semantics.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS valid_until DATE;

COMMENT ON COLUMN subscriptions.is_paused IS 'Whether the subscription is currently paused from recurring billing cycles';
COMMENT ON COLUMN subscriptions.valid_until IS 'The expiration or validity cut-off date for quotations or fixed-term subscriptions';
