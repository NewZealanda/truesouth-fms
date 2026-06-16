# Leave Management Setup

## 1. Run SQL migration in Supabase
Go to Supabase → SQL Editor → paste contents of `leave_migration.sql` → Run

## 2. Deploy Resend email Edge Function (after you get your Resend key)
```bash
# Install Supabase CLI if needed: brew install supabase/tap/supabase
supabase login
supabase link --project-ref wgycephyuwwfogggcbye
supabase secrets set RESEND_API_KEY=your_resend_key_here
supabase functions deploy send-leave-email
```

## 3. Role setup
- Assign "CX Manager" role to CX staff via Admin → People
- Desk/Ground Staff leave requests will route to CX Manager for approval
- Pilot/Maintenance requests route to Admin

## 4. What's live after SQL + deploy
- Leave section in hamburger nav (all roles)
- Employees can submit Annual/Sick/Unpaid/Other leave
- Managers see Approvals tab with pending queue + overlap warnings
- In-app notification bell (🔔) shows unread count
- Email notifications via Resend (once key is added)
