-- Estrutura do banco do Cardápio Digital
-- Pode ser executado várias vezes (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(60) NOT NULL,
  slug       VARCHAR(70) NOT NULL UNIQUE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id                SERIAL PRIMARY KEY,
  category_id       INTEGER       NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name              VARCHAR(120)  NOT NULL,
  short_description VARCHAR(160),
  description       TEXT,
  ingredients       TEXT,
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url         TEXT,
  -- grupos de opções (tamanho, sabor, adicionais...) no formato descrito na documentação da API
  options           JSONB         NOT NULL DEFAULT '[]'::jsonb,
  available         BOOLEAN       NOT NULL DEFAULT true,
  sort_order        INTEGER       NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);

CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL PRIMARY KEY,
  tracking_code UUID          NOT NULL UNIQUE,
  customer_name VARCHAR(80)   NOT NULL,
  table_number  VARCHAR(10)   NOT NULL,
  notes         VARCHAR(300),
  status        VARCHAR(20)   NOT NULL DEFAULT 'recebido'
                CHECK (status IN ('recebido', 'em_preparo', 'pronto', 'entregue')),
  total         NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- SET NULL: se o item sair do cardápio, o pedido antigo continua com o nome e o preço gravados
  menu_item_id INTEGER       REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name    VARCHAR(120)  NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL,
  quantity     INTEGER       NOT NULL CHECK (quantity > 0),
  options      JSONB         NOT NULL DEFAULT '[]'::jsonb,
  notes        VARCHAR(200),
  subtotal     NUMERIC(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Histórico de mudanças de status (RF008)
CREATE TABLE IF NOT EXISTS order_status_history (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER     NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL,
  changed_by      INTEGER     REFERENCES admins(id) ON DELETE SET NULL,
  changed_by_name VARCHAR(80) NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_order ON order_status_history(order_id);
