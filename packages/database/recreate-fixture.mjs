import pg from 'pg';
import fs from 'node:fs';
const envText = fs.readFileSync('C:/Users/DELL/Music/ShiftOS/.env', 'utf8');
const env = Object.fromEntries(envText.split('\n').filter(l => l.includes('=')).map(l => {
  const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()];
}));
const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const ORG_ID = '98fdbe03-36f6-4195-841a-4a882164723a';
const BRANCH_ID = 'a21b9394-e73c-4464-aa69-3fbb1c696e69';
const EMPLOYEE_ID = '51d51b67-f3e1-49f0-8875-0cba84418184';
const OWNER_AUTH_USER_ID = '0c533edb-210c-474e-83bb-20bd3b82ccc5';

try {
  await client.query('BEGIN');

  // Guard: refuse to run if any fixture row already exists (idempotency / no accidental double-insert).
  const existing = await client.query('SELECT id FROM organizations WHERE id = $1', [ORG_ID]);
  if (existing.rows.length > 0) {
    console.log('Fixture organization already exists — nothing to do.');
    await client.query('ROLLBACK');
    process.exit(0);
  }

  await client.query(
    "INSERT INTO organizations (id, name, slug) VALUES ($1, 'ShiftOS Test Org', 'shiftostestorg1')",
    [ORG_ID]
  );

  const userResult = await client.query(
    `INSERT INTO users (auth_user_id, first_name, last_name, email)
     VALUES ($1, 'toluwani', 'Laioke', 'undeify2026+shiftostest1@gmail.com')
     RETURNING id`,
    [OWNER_AUTH_USER_ID]
  );
  const ownerUserId = userResult.rows[0].id;

  const roleResult = await client.query(
    `INSERT INTO roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
     VALUES ($1, 'Owner', true, true, true)
     RETURNING id`,
    [ORG_ID]
  );
  const ownerRoleId = roleResult.rows[0].id;

  await client.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT $1, p.id FROM permissions p WHERE p.is_active = true
     ON CONFLICT (role_id, permission_id) DO NOTHING`,
    [ownerRoleId]
  );

  await client.query(
    `INSERT INTO organization_memberships (organization_id, user_id, role_id, is_active)
     VALUES ($1, $2, $3, true)`,
    [ORG_ID, ownerUserId, ownerRoleId]
  );

  await client.query('SELECT ensure_standard_roles($1)', [ORG_ID]);

  await client.query(
    "INSERT INTO branches (id, organization_id, name) VALUES ($1, $2, 'Main Branch')",
    [BRANCH_ID, ORG_ID]
  );

  await client.query(
    `INSERT INTO employees (id, organization_id, branch_id, employee_number, first_name, last_name, hire_date)
     VALUES ($1, $2, $3, '#EMP-0001', 'Ada', 'Test', CURRENT_DATE)`,
    [EMPLOYEE_ID, ORG_ID, BRANCH_ID]
  );

  await client.query('COMMIT');
  console.log('Fixture recreated successfully:');
  console.log('  organization:', ORG_ID);
  console.log('  branch:', BRANCH_ID);
  console.log('  employee:', EMPLOYEE_ID);
  console.log('  owner user id (public.users.id):', ownerUserId, '/ auth_user_id:', OWNER_AUTH_USER_ID);
  console.log('  owner role id:', ownerRoleId);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('FAILED, rolled back:', err);
  process.exit(1);
} finally {
  await client.end();
}
