set lock_timeout = '10s';
set statement_timeout = '5m';

drop index meanderaw."IDX_71c06a26e0ba2b8cb1125d7fd5";

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

alter table meanderaw.meanders add "family" meanderaw.meanders_family_enum not null;

create index "IDX_dd3b754ae6a08b7a3cd6e37fe8" on meanderaw.meanders ("family", "rows", "columns", code);
