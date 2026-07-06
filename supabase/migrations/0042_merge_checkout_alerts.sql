-- 0042: merge the two open-checkout alerts into one (owner, 2026-07-06).
-- "Missed-checkout grace" and "Still checked-in alert" fired on the same condition an hour apart,
-- double-posting the admin feed. One threshold now drives one alert (employee reminder + admin
-- feed entry). The alert_type enum keeps 'overtime_warning' so historical alerts_log rows remain
-- readable; no new rows of that type are produced.

alter table company_settings drop column if exists overtime_warning_hours;
