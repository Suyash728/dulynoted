insert into audiences (label, year, branch, division, size) values
 ('TE AI&DS A','TE','AI&DS','A',64), ('TE AI&DS B','TE','AI&DS','B',62),
 ('TE COMP A','TE','COMP','A',66),   ('TE IT A','TE','IT','A',60),
 ('BE AI&DS A','BE','AI&DS','A',58), ('SE AI&DS A','SE','AI&DS','A',65);
insert into calendar_events (title, starts_at, ends_at, audience_label) values
 ('Unit Test 2 — Machine Learning', (current_date + 2 + time '10:00') at time zone 'Asia/Kolkata', (current_date + 2 + time '11:30') at time zone 'Asia/Kolkata', 'TE AI&DS A'),
 ('Unit Test 2 — Machine Learning', (current_date + 2 + time '10:00') at time zone 'Asia/Kolkata', (current_date + 2 + time '11:30') at time zone 'Asia/Kolkata', 'TE AI&DS B'),
 ('Mini Project Review', (current_date + 6 + time '14:00') at time zone 'Asia/Kolkata', (current_date + 6 + time '16:00') at time zone 'Asia/Kolkata', 'TE COMP A');
