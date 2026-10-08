set lock_timeout = '10s';
set statement_timeout = '5m';

drop index meanderaw."IDX_c81def2dd79d9e0b6c15f6c023";

drop index meanderaw."IDX_dd3b754ae6a08b7a3cd6e37fe8";

drop table meanderaw.meanders;

drop type meanderaw.meanders_family_enum;
