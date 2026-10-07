set lock_timeout = '10s';
set statement_timeout = '5m';

drop index meanderaw."IDX_dd3b754ae6a08b7a3cd6e37fe8";

alter table meanderaw.meanders drop column "family";

drop type meanderaw.meanders_family_enum;

create index "IDX_71c06a26e0ba2b8cb1125d7fd5" on meanderaw.meanders ("rows", "columns", code);
