set lock_timeout = '10s';
set statement_timeout = '5m';

create type meanderaw.meanders_family_enum as enum (
    'dots',
    'lines',
    'bars',
    'mesh',
    'parallel',
    'cross',
    'arcade',
    'comb',
    'fork',
    'tree',
    'boxes',
    'chain',
    'double-chain',
    'waterfalls',
    'whirl',
    'swirl',
    'clasps',
    'snake',
    'stipple',
    'unclassified'
);

create table meanderaw.meanders (
    id uuid not null default uuidv7(),
    created_at timestamp with time zone not null default now(),
    created_by uuid,
    updated_at timestamp with time zone not null default now(),
    updated_by uuid,
    "characteristics" jsonb not null,
    code text not null,
    "columns" bigint not null,
    "family" meanderaw.meanders_family_enum not null,
    is_hardcoded boolean not null,
    lattice text not null,
    repeats bigint not null default '1',
    "rows" bigint not null,
    symmetrical_codes text not null default '',
    constraint "PK_3cc3fa006a39a4eb93550a14176" primary key (id)
);
comment on column meanderaw.meanders.id is 'Primary key, a uuidv7 the database assigns on insert';
comment on column meanderaw.meanders.created_at is 'Timestamp when the record was created';
comment on column meanderaw.meanders.created_by is 'Identifier of the user or process that created the record';
comment on column meanderaw.meanders.updated_at is 'Timestamp when the record was last updated';
comment on column meanderaw.meanders.updated_by is 'Identifier of the user or process that last updated the record';

create index "IDX_dd3b754ae6a08b7a3cd6e37fe8" on meanderaw.meanders ("family", "rows", "columns", code);

create unique index "IDX_c81def2dd79d9e0b6c15f6c023" on meanderaw.meanders (code);
