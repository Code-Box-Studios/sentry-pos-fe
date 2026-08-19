-- Mirrors the production topology described in landing-spec.md §5: the CMS gets its own schema and
-- its own login, so a compromised marketing-CMS credential reaches page copy and nothing else.
-- Tenant data will live in `public`, owned by the `sentry` role.

CREATE SCHEMA IF NOT EXISTS cms;

CREATE ROLE cms_user LOGIN PASSWORD 'cms_dev_password';

GRANT USAGE, CREATE ON SCHEMA cms TO cms_user;
ALTER ROLE cms_user SET search_path = cms;

-- The CMS role holds no rights in the schema where sales, payments and stock movements will live.
REVOKE ALL ON SCHEMA public FROM cms_user;
