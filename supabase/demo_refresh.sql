-- Keeps the seeded demo timetable relative to "today" (IST) so the live demo works on any day.
-- The workshop sample always says "in 2 days, 10 AM", so Unit Test 2 must always be at D+2 10:00 IST.
-- Only rows with source = 'seed' are touched; anything else in calendar_events is left alone.
create or replace function public.refresh_demo_timetable() returns void
language sql
security definer
set search_path = public
as $$
  delete from calendar_events where source = 'seed';
  insert into calendar_events (title, starts_at, ends_at, audience_label, source)
  select v.title,
         (((now() at time zone 'Asia/Kolkata')::date + v.day_offset) + v.starts) at time zone 'Asia/Kolkata',
         (((now() at time zone 'Asia/Kolkata')::date + v.day_offset) + v.ends) at time zone 'Asia/Kolkata',
         v.audience_label, 'seed'
  from (values
    ('Unit Test 2 — Machine Learning', 2, time '10:00', time '11:30', 'TE AI&DS A'),
    ('Unit Test 2 — Machine Learning', 2, time '10:00', time '11:30', 'TE AI&DS B'),
    ('Mini Project Review',            6, time '14:00', time '16:00', 'TE COMP A')
  ) as v(title, day_offset, starts, ends, audience_label);
$$;

revoke all on function public.refresh_demo_timetable() from public, anon, authenticated;

-- Every 15 minutes (idempotent); also catches the IST midnight rollover within 15 minutes.
select cron.schedule('dulynoted-demo-timetable', '*/15 * * * *', 'select public.refresh_demo_timetable()');
