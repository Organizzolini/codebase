set lock_timeout = '10s';
set statement_timeout = '5m';

create table calendar_events (
    id uuid not null default uuidv7(),
    created_at timestamp with time zone not null default now(),
    created_by uuid,
    updated_at timestamp with time zone not null default now(),
    updated_by uuid,
    categories text array not null,
    color text,
    description text not null,
    "end" timestamp with time zone not null,
    latitude numeric(8, 6) not null,
    "location" text,
    longitude numeric(9, 6) not null,
    "start" timestamp with time zone not null,
    "summary" text not null,
    constraint calendar_events_natural_key unique ("summary", "start", latitude, longitude),
    constraint "PK_faf5391d232322a87cdd1c6f30c" primary key (id)
);
comment on column calendar_events.id is 'Primary key, a uuidv7 the database assigns on insert';
comment on column calendar_events.created_at is 'Timestamp when the record was created';
comment on column calendar_events.created_by is 'Identifier of the user or process that created the record';
comment on column calendar_events.updated_at is 'Timestamp when the record was last updated';
comment on column calendar_events.updated_by is 'Identifier of the user or process that last updated the record';
comment on column calendar_events.categories is 'Category tags for filtering, such as aspects, major, and moon';
comment on column calendar_events.color is 'Color hint for calendar display';
comment on column calendar_events.description is 'Detailed description with additional context';
comment on column calendar_events."end" is 'When the event ends';
comment on column calendar_events.latitude is 'Observer latitude in degrees the event was computed for';
comment on column calendar_events."location" is 'Human-readable location of the event';
comment on column calendar_events.longitude is 'Observer longitude in degrees the event was computed for';
comment on column calendar_events."start" is 'When the event starts';
comment on column calendar_events."summary" is 'Brief event title shown in calendar views';

create index calendar_events_categories_gin on calendar_events using gin (categories);
