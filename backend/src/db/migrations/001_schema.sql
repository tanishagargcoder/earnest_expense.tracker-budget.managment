-- =====================================================================
-- 001 - Core schema: users, refresh tokens, categories, expenses, budgets
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- Keeps updated_at current on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(100) NOT NULL,
  email         varchar(255) NOT NULL,
  password_hash text         NOT NULL,
  currency      char(3)      NOT NULL DEFAULT 'INR',
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT users_name_not_blank CHECK (length(btrim(name)) > 0)
);

-- Case-insensitive uniqueness for e-mail addresses.
CREATE UNIQUE INDEX users_email_lower_uidx ON users (lower(email));

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- refresh_tokens
--   Only a SHA-256 hash of each opaque token is stored. Tokens are rotated
--   on every refresh; all tokens issued from one login share a family_id
--   so that re-use of a rotated token can revoke the whole family.
-- ---------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  char(64)    NOT NULL UNIQUE,
  family_id   uuid        NOT NULL,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  replaced_by uuid        REFERENCES refresh_tokens (id) ON DELETE SET NULL,
  user_agent  varchar(255),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_idx   ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);

-- ---------------------------------------------------------------------
-- categories (per user)
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       varchar(50) NOT NULL,
  color      char(7)     NOT NULL DEFAULT '#6366F1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT categories_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Target for the composite foreign keys below: guarantees an expense or
  -- budget can only reference a category owned by the same user.
  CONSTRAINT categories_id_user_uk UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX categories_user_name_uidx ON categories (user_id, lower(name));

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------
CREATE TABLE expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id  uuid          NOT NULL,
  amount       numeric(12,2) NOT NULL,
  description  varchar(255)  NOT NULL,
  expense_date date          NOT NULL,
  notes        text,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT expenses_amount_positive CHECK (amount > 0),
  CONSTRAINT expenses_description_not_blank CHECK (length(btrim(description)) > 0),
  -- A category that still has expenses cannot be deleted.
  CONSTRAINT expenses_category_fk FOREIGN KEY (category_id, user_id)
    REFERENCES categories (id, user_id) ON DELETE RESTRICT
);

-- Main access path: a user's expenses ordered / ranged by date.
CREATE INDEX expenses_user_date_idx ON expenses (user_id, expense_date DESC);
-- Per-category aggregation for dashboards, budgets and reports.
CREATE INDEX expenses_user_category_date_idx ON expenses (user_id, category_id, expense_date);

CREATE TRIGGER expenses_set_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- budgets: one monthly limit per user + category + month
-- ---------------------------------------------------------------------
CREATE TABLE budgets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id uuid          NOT NULL,
  month       date          NOT NULL,
  amount      numeric(12,2) NOT NULL,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT budgets_amount_positive CHECK (amount > 0),
  CONSTRAINT budgets_month_first_day CHECK (EXTRACT(DAY FROM month) = 1),
  CONSTRAINT budgets_category_fk FOREIGN KEY (category_id, user_id)
    REFERENCES categories (id, user_id) ON DELETE CASCADE,
  -- Also serves as the (user_id, month) lookup index.
  CONSTRAINT budgets_user_month_category_uk UNIQUE (user_id, month, category_id)
);

CREATE TRIGGER budgets_set_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
