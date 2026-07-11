-- 0054_company_name_softonoma.sql — the company name is fixed branding (not UI-editable), but prod was
-- bootstrapped clean and still carries the template placeholder 'Your Company'. Set it to the real name
-- and change the column default so any fresh install starts branded correctly. Idempotent.
alter table company_settings alter column company_name set default 'Softonoma';
update company_settings
   set company_name = 'Softonoma'
 where id = 1
   and (company_name is null or company_name = 'Your Company' or company_name = '');
