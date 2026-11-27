
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
    price NUMERIC(10,2) NOT NULL CHECK (price > 0),
    category_id INTEGER REFERENCES categories(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
    email VARCHAR(254) NOT NULL CHECK (
        email = lower(email)
        AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ),
    phone VARCHAR(11) NOT NULL CHECK (phone ~ '^[0-9]{10,11}$'),
    password_hash TEXT NOT NULL CHECK (length(password_hash) > 0),
    role VARCHAR(20) NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer', 'admin')),
    address_street VARCHAR(150) NOT NULL CHECK (length(trim(address_street)) > 0),
    address_number VARCHAR(20) NOT NULL CHECK (length(trim(address_number)) > 0),
    address_city VARCHAR(100) NOT NULL CHECK (length(trim(address_city)) > 0),
    address_state CHAR(2) NOT NULL CHECK (
        address_state IN (
            'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
            'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
            'RS','RO','RR','SC','SP','SE','TO'
        )
    ),
    address_neighborhood VARCHAR(100) NOT NULL
        CHECK (length(trim(address_neighborhood)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_phone_key UNIQUE (phone)
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON sessions(user_id);
