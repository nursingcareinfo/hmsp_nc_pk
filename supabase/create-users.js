/**
 * Create THEO and ATIF ALVI auth users in Supabase
 * Uses Supabase Auth Admin API via the service role key
 */

const SUPABASE_URL = 'https://euxzitqllnltlteckeyq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Set SUPABASE_SERVICE_KEY env var first');
  process.exit(1);
}

const users = [
  { email: 'theo@hmsp.local', password: 'changeme123', displayName: 'THEO' },
  { email: 'atif@hmsp.local', password: 'changeme123', displayName: 'ATIF ALVI' },
];

async function createUser(user) {
  const url = `${SUPABASE_URL}/auth/v1/admin/users`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: user.displayName },
    }),
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (response.ok && data.id) {
    console.log(`✅ Created: ${user.displayName} (${user.email})`);
  } else if (data.error_code === 'user_already_exists') {
    console.log(`⚠️  Already exists: ${user.email}`);
  } else {
    console.error(`❌ Failed for ${user.email}:`, data.message || text);
  }
}

(async () => {
  console.log('Creating auth users...');
  for (const user of users) {
    await createUser(user);
  }
  console.log('\n✅ Done! Passwords are set to: changeme123');
})();
