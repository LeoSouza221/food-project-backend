CREATE TABLE categories (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL check (length(trim(name)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL check (length(trim(name)) > 0),
    price NUMERIC(10,2) NOT NULL check (price > 0),
    category_id INTEGER REFERENCES categories(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL check (length(trim(name)) > 0),
    phone VARCHAR(11) NOT NULL check (phone ~ '^[0-9]{10,11}$'),
    address_street VARCHAR(150) NOT NULL check (length(trim(address_street)) > 0),
    address_number VARCHAR(20) NOT NULL check (length(trim(address_number)) > 0),
    address_city VARCHAR(100) NOT NULL check (length(trim(address_city)) > 0),
    address_state CHAR(2) NOT NULL check (address_state IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
    address_neighborhood VARCHAR(100) NOT NULL check (length(trim(address_neighborhood)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
