-- Expand question bank to ~10 questions per category.
-- Adds to: mind, productivity, overload, emotion, discipline, shadow,
--           body, goals, social, energy, meaning, state, work, creativity, relationships

insert into public.question_bank
  (text, category, type, time_of_day, emotional_depth, weight, is_active, is_state_question, state_key)
values

  -- ── mind ──────────────────────────────────────────────────────────────────
  ('What thought did you keep returning to today?',              'mind', 'open', 'evening', 2, 0.8, true, false, null),
  ('What did you fail to decide today?',                         'mind', 'open', 'evening', 2, 0.7, true, false, null),
  ('What belief shaped how you acted today?',                    'mind', 'open', 'any',     3, 0.6, true, false, null),
  ('What conversation is still replaying in your head?',         'mind', 'open', 'evening', 2, 0.7, true, false, null),
  ('What did you understand today that you didn''t before?',     'mind', 'open', 'evening', 2, 0.7, true, false, null),
  ('What question doesn''t leave you alone right now?',          'mind', 'open', 'any',     3, 0.6, true, false, null),
  ('What feels unresolved in your head tonight?',                'mind', 'open', 'evening', 2, 0.7, true, false, null),
  ('What are you overthinking?',                                 'mind', 'open', 'any',     2, 0.7, true, false, null),

  -- ── emotion ───────────────────────────────────────────────────────────────
  ('What emotion showed up most today?',                         'emotion', 'open', 'evening', 2, 0.7, true, false, null),
  ('What did you suppress or push past today?',                  'emotion', 'open', 'evening', 3, 0.6, true, false, null),
  ('Was there a moment today that felt heavier than expected?',  'emotion', 'open', 'evening', 2, 0.7, true, false, null),
  ('What are you carrying right now that has no name yet?',      'emotion', 'open', 'any',     3, 0.5, true, false, null),
  ('When did you feel most like yourself today?',                'emotion', 'open', 'any',     2, 0.7, true, false, null),
  ('What gave you even a small spark today?',                    'emotion', 'open', 'evening', 1, 0.8, true, false, null),
  ('What did you avoid feeling today?',                          'emotion', 'open', 'evening', 3, 0.5, true, false, null),

  -- ── body ──────────────────────────────────────────────────────────────────
  ('How did your body feel when you woke up?',                   'body', 'open', 'morning', 1, 0.7, true, false, null),
  ('Did you move enough today? What held you back?',             'body', 'open', 'evening', 1, 0.7, true, false, null),
  ('Where did you feel tension in your body today?',             'body', 'open', 'evening', 2, 0.6, true, false, null),
  ('What did you eat and how did it affect you?',                'body', 'open', 'evening', 1, 0.6, true, false, null),
  ('How is your sleep affecting you right now?',                 'body', 'open', 'evening', 2, 0.7, true, false, null),
  ('When did your body signal that it needed something?',        'body', 'open', 'any',     2, 0.6, true, false, null),
  ('What would your body ask for right now?',                    'body', 'open', 'evening', 2, 0.6, true, false, null),
  ('Did you rest or just stop today?',                           'body', 'open', 'evening', 2, 0.6, true, false, null),
  ('How fast or slow did time feel in your body today?',         'body', 'open', 'evening', 2, 0.5, true, false, null),

  -- ── shadow ────────────────────────────────────────────────────────────────
  ('What did you avoid looking at directly today?',              'shadow', 'open', 'evening', 3, 0.5, true, false, null),
  ('What version of yourself showed up today?',                  'shadow', 'open', 'evening', 3, 0.5, true, false, null),
  ('What did you pretend not to notice?',                        'shadow', 'open', 'evening', 3, 0.4, true, false, null),
  ('What reaction surprised you today?',                         'shadow', 'open', 'any',     3, 0.5, true, false, null),
  ('What do you keep telling yourself that might not be true?',  'shadow', 'open', 'any',     3, 0.4, true, false, null),
  ('What would you do differently if no one was watching?',      'shadow', 'open', 'any',     3, 0.4, true, false, null),
  ('What are you defending that no longer needs defending?',     'shadow', 'open', 'any',     3, 0.4, true, false, null),

  -- ── discipline ────────────────────────────────────────────────────────────
  ('What habit slipped today and why?',                          'discipline', 'open', 'evening', 2, 0.6, true, false, null),
  ('Where did resistance win today?',                            'discipline', 'open', 'evening', 2, 0.6, true, false, null),
  ('What did you do that you said you would?',                   'discipline', 'open', 'evening', 1, 0.7, true, false, null),
  ('What small thing did you keep delaying?',                    'discipline', 'open', 'any',     2, 0.7, true, false, null),
  ('What distraction cost you the most time today?',             'discipline', 'open', 'evening', 1, 0.7, true, false, null),
  ('What rule did you break with yourself today?',               'discipline', 'open', 'evening', 2, 0.5, true, false, null),
  ('What would discipline look like for you tomorrow?',          'discipline', 'open', 'evening', 2, 0.6, true, false, null),

  -- ── energy ────────────────────────────────────────────────────────────────
  ('At what point today did your energy shift?',                 'energy', 'open', 'evening', 1, 0.8, true, false, null),
  ('What drained you without any visible reason?',               'energy', 'open', 'evening', 2, 0.7, true, false, null),
  ('What task felt effortless today?',                           'energy', 'open', 'evening', 1, 0.7, true, false, null),
  ('How did caffeine, food or rest affect your output today?',   'energy', 'open', 'evening', 1, 0.6, true, false, null),
  ('What gave you a second wind today?',                         'energy', 'open', 'evening', 1, 0.7, true, false, null),
  ('What are you running on right now?',                         'energy', 'open', 'evening', 2, 0.6, true, false, null),
  ('What would fill you up right now?',                          'energy', 'open', 'evening', 1, 0.7, true, false, null),
  ('When did you feel most present and charged today?',          'energy', 'open', 'evening', 1, 0.7, true, false, null),

  -- ── goals ─────────────────────────────────────────────────────────────────
  ('What did you do today that your future self will thank you for?', 'goals', 'open', 'evening', 2, 0.7, true, false, null),
  ('What goal felt closer today?',                               'goals', 'open', 'evening', 1, 0.8, true, false, null),
  ('What goal felt further away and why?',                       'goals', 'open', 'evening', 2, 0.6, true, false, null),
  ('What are you building, even slowly?',                        'goals', 'open', 'any',     2, 0.7, true, false, null),
  ('What would a 1% better version of you do tomorrow?',         'goals', 'open', 'evening', 2, 0.7, true, false, null),
  ('What goal are you secretly giving up on?',                   'goals', 'open', 'any',     3, 0.5, true, false, null),
  ('What outcome do you actually want — not what you say you want?', 'goals', 'open', 'any', 3, 0.5, true, false, null),
  ('What small win happened today that you almost ignored?',     'goals', 'open', 'evening', 1, 0.8, true, false, null),
  ('What would make tomorrow a success?',                        'goals', 'open', 'evening', 1, 0.8, true, false, null),

  -- ── social ────────────────────────────────────────────────────────────────
  ('Who did you give real attention to today?',                  'social', 'open', 'evening', 1, 0.7, true, false, null),
  ('Who did you pull away from today?',                          'social', 'open', 'evening', 2, 0.6, true, false, null),
  ('What conversation left a mark on you today?',                'social', 'open', 'evening', 2, 0.7, true, false, null),
  ('Who do you owe a response or presence to?',                  'social', 'open', 'any',     1, 0.6, true, false, null),
  ('Did you feel seen today? By whom or by what?',               'social', 'open', 'evening', 2, 0.6, true, false, null),
  ('What did someone do for you today that you barely noticed?', 'social', 'open', 'evening', 2, 0.6, true, false, null),
  ('Who or what are you isolating from right now?',              'social', 'open', 'any',     3, 0.5, true, false, null),
  ('What did you hold back from saying today?',                  'social', 'open', 'evening', 2, 0.6, true, false, null),
  ('What relationship needs more of your attention?',            'social', 'open', 'any',     2, 0.6, true, false, null),

  -- ── meaning ───────────────────────────────────────────────────────────────
  ('What mattered most to you today and why?',                   'meaning', 'open', 'evening', 3, 0.6, true, false, null),
  ('What felt pointless today?',                                 'meaning', 'open', 'evening', 2, 0.6, true, false, null),
  ('What are you here for, when you forget?',                    'meaning', 'open', 'any',     3, 0.4, true, false, null),
  ('What would make this period of your life worth it?',         'meaning', 'open', 'any',     3, 0.5, true, false, null),
  ('What do you keep doing that contradicts your values?',       'meaning', 'open', 'any',     3, 0.4, true, false, null),
  ('What would you regret not doing this year?',                 'meaning', 'open', 'any',     3, 0.5, true, false, null),
  ('What are you trading your time for right now?',              'meaning', 'open', 'any',     2, 0.6, true, false, null),
  ('What would feel deeply meaningful to finish?',               'meaning', 'open', 'any',     2, 0.6, true, false, null),
  ('What story about yourself are you living right now?',        'meaning', 'open', 'any',     3, 0.4, true, false, null),

  -- ── work ──────────────────────────────────────────────────────────────────
  ('What were you most focused on today?',                       'work', 'open', 'evening', 1, 0.8, true, false, null),
  ('What decision did you make at work today?',                  'work', 'open', 'evening', 1, 0.7, true, false, null),
  ('What task felt like it was going nowhere?',                  'work', 'open', 'evening', 2, 0.7, true, false, null),
  ('What are you proud of producing today?',                     'work', 'open', 'evening', 1, 0.8, true, false, null),
  ('What work task is following you home?',                      'work', 'open', 'evening', 2, 0.6, true, false, null),
  ('What didn''t get done and why?',                             'work', 'open', 'evening', 1, 0.7, true, false, null),
  ('What part of work felt meaningful today?',                   'work', 'open', 'evening', 2, 0.7, true, false, null),
  ('What would make tomorrow''s work feel easier?',              'work', 'open', 'evening', 1, 0.7, true, false, null),
  ('What skill are you actually building right now?',            'work', 'open', 'any',     2, 0.6, true, false, null),
  ('What would you remove from your work if you could?',         'work', 'open', 'any',     2, 0.6, true, false, null),

  -- ── creativity ────────────────────────────────────────────────────────────
  ('What idea arrived today that you almost dismissed?',         'creativity', 'open', 'any',     2, 0.6, true, false, null),
  ('What are you itching to make but not starting?',             'creativity', 'open', 'any',     2, 0.6, true, false, null),
  ('What bored you today that might actually be interesting?',   'creativity', 'open', 'any',     2, 0.5, true, false, null),
  ('What would you build if you weren''t afraid of it being bad?','creativity','open', 'any',     2, 0.6, true, false, null),
  ('What sparked your imagination today?',                       'creativity', 'open', 'any',     1, 0.7, true, false, null),
  ('What pattern did you notice today that no one else might?',  'creativity', 'open', 'any',     2, 0.6, true, false, null),
  ('What would you experiment with tomorrow?',                   'creativity', 'open', 'evening', 1, 0.7, true, false, null),
  ('When did you feel most creative today?',                     'creativity', 'open', 'any',     1, 0.7, true, false, null),
  ('What are you making right now, even in small pieces?',       'creativity', 'open', 'any',     1, 0.7, true, false, null),
  ('What unfinished creative thing is waiting for you?',         'creativity', 'open', 'any',     2, 0.6, true, false, null),

  -- ── state extras ──────────────────────────────────────────────────────────
  ('How is your stress level right now (1–10)?',                 'state', 'numeric', 'any', 1, 1.0, true, true,  'stress'),
  ('How sharp is your focus right now (1–10)?',                  'state', 'numeric', 'any', 1, 1.0, true, true,  'cognitive_load')

on conflict do nothing;
