set lock_timeout = '10s';
set statement_timeout = '5m';

drop index caelundas.calendar_events_categories_gin;

drop table calendar_events;
