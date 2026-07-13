import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const app = express();
app.use(express.json());
const PORT = 3000;

const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    (req as any).adminId = user.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/admin/create-user', requireAdmin, async (req, res) => {
  try {
    const { username, customId, fullName, password, role } = req.body;

    const { data: byUsername } = await supabaseAdmin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (byUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const { data: byCustomId } = await supabaseAdmin.from('profiles').select('id').eq('custom_id', customId).maybeSingle();
    if (byCustomId) {
      return res.status(400).json({ error: 'ID already exists' });
    }

    const email = `${username}@debtapp.local`;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr || !created.user) throw createErr || new Error('Failed to create user');

    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id: created.user.id,
      username,
      custom_id: customId,
      full_name: fullName,
      role: role || 'user',
    });
    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw profileErr;
    }

    res.json({ success: true, uid: created.user.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reset-password', requireAdmin, async (req, res) => {
  try {
    const { identifier, newPassword } = req.body;
    let { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('username', identifier).maybeSingle();
    if (!profile) {
      ({ data: profile } = await supabaseAdmin.from('profiles').select('id').eq('custom_id', identifier).maybeSingle());
    }
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, { password: newPassword });
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/update-user', requireAdmin, async (req, res) => {
  try {
    const { uid, customId, fullName } = req.body;

    if (customId) {
      const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('custom_id', customId).maybeSingle();
      if (existing && existing.id !== uid) {
        return res.status(400).json({ error: 'ID already exists for another user' });
      }
    }

    const updateData: Record<string, any> = {};
    if (customId) updateData.custom_id = customId;
    if (fullName) updateData.full_name = fullName;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin.from('profiles').update(updateData).eq('id', uid);
      if (error) throw error;
    }

    if (fullName) {
      await supabaseAdmin.auth.admin.updateUserById(uid, { user_metadata: { full_name: fullName } });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/toggle-user-status', requireAdmin, async (req, res) => {
  try {
    const { uid, status } = req.body;
    if (status !== 'active' && status !== 'paused') {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (uid === (req as any).adminId) {
      return res.status(400).json({ error: 'Cannot pause your own account' });
    }

    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      ban_duration: status === 'paused' ? '87600h' : 'none',
    });
    if (banErr) throw banErr;

    const { error: profileErr } = await supabaseAdmin.from('profiles').update({ status }).eq('id', uid);
    if (profileErr) throw profileErr;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/delete-user', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.body;
    if (uid === (req as any).adminId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/factory-reset', requireAdmin, async (req, res) => {
  try {
    const { error: debtsErr } = await supabaseAdmin.from('debts').delete().not('id', 'is', null);
    if (debtsErr) throw debtsErr;

    const { error: listsErr } = await supabaseAdmin.from('settings')
      .update({ value: { recipients: [], departments: [], authorizers: [] } }).eq('key', 'lists');
    if (listsErr) throw listsErr;

    const { error: appErr } = await supabaseAdmin.from('settings')
      .update({ value: { delayTolerance: 5 } }).eq('key', 'app');
    if (appErr) throw appErr;

    const { data: nonAdmins, error: fetchErr } = await supabaseAdmin.from('profiles').select('id').eq('role', 'user');
    if (fetchErr) throw fetchErr;

    for (const profile of nonAdmins || []) {
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login-helper', async (req, res) => {
  try {
    const { identifier } = req.body;

    let { data: profile } = await supabaseAdmin.from('profiles').select('username, status').eq('username', identifier).maybeSingle();
    if (!profile) {
      ({ data: profile } = await supabaseAdmin.from('profiles').select('username, status').eq('custom_id', identifier).maybeSingle());
    }
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (profile.status === 'paused') {
      return res.status(403).json({ error: 'Account paused' });
    }

    const email = `${profile.username}@debtapp.local`;
    res.json({ email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function bootstrapAdmin() {
  const { count } = await supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true });
  if (!count) {
    console.log('No users found. Bootstrapping default admin account...');
    try {
      const email = 'admin@debtapp.local';
      const password = 'admin'; // default password
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Administrator' },
      });
      if (createErr || !created.user) throw createErr || new Error('Failed to create admin');

      await supabaseAdmin.from('profiles').insert({
        id: created.user.id,
        username: 'admin',
        custom_id: 'admin',
        full_name: 'Administrator',
        role: 'admin',
      });
      console.log('Default admin created. Username: admin, Password: admin');
    } catch (error) {
      console.error('Failed to bootstrap admin:', error);
    }
  }
}

async function startServer() {
  await bootstrapAdmin();
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
