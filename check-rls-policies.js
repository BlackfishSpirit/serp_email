// Script to check RLS policies using direct PostgreSQL connection
const { Client } = require('pg');

// Using local Docker PostgreSQL connection
const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'shipsmind_speckit_development',
  user: 'speckit_user',
  password: 'speckit_password'
});

async function checkPolicies() {
  try {
    await client.connect();
    console.log('Connected to local PostgreSQL database\n');
    console.log('Checking RLS policies on user_accounts table...\n');

    const query = `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles::text as roles,
        cmd,
        qual::text as using_clause,
        with_check::text as with_check_clause
      FROM pg_policies
      WHERE tablename = 'user_accounts'
      ORDER BY policyname;
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      console.log('No RLS policies found on user_accounts table');
      return;
    }

    console.log(`Found ${result.rows.length} RLS policies:\n`);
    result.rows.forEach((policy, i) => {
      console.log(`\n${i + 1}. Policy: ${policy.policyname}`);
      console.log(`   Command: ${policy.cmd}`);
      console.log(`   Permissive: ${policy.permissive}`);
      console.log(`   Roles: ${policy.roles}`);
      console.log(`   USING clause: ${policy.using_clause}`);
      console.log(`   WITH CHECK clause: ${policy.with_check_clause || 'N/A'}`);

      // Check for UUID issues
      if (policy.using_clause && policy.using_clause.includes('uuid')) {
        console.log('   ⚠️  WARNING: USING clause contains "uuid"');
      }
      if (policy.with_check_clause && policy.with_check_clause.includes('uuid')) {
        console.log('   ⚠️  WARNING: WITH CHECK clause contains "uuid"');
      }
      if (policy.using_clause && policy.using_clause.includes('auth.uid()')) {
        console.log('   ⚠️  WARNING: USING clause uses auth.uid() which returns UUID');
      }
      if (policy.with_check_clause && policy.with_check_clause.includes('auth.uid()')) {
        console.log('   ⚠️  WARNING: WITH CHECK clause uses auth.uid() which returns UUID');
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkPolicies();
