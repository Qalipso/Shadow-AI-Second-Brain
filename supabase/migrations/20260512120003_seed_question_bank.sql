-- Seed question_bank. 3 state questions + 20 reflection questions.
-- Schema column names differ from db/seeds/question_bank.sql:
--   question_type → type
--   frequency_weight (1..10) → weight (numeric)

insert into public.question_bank
  (text, category, type, time_of_day, emotional_depth, weight, is_active, is_state_question, state_key) values
  -- Three state questions used by Dashboard meters.
  ('How is your mood right now (1–10)?',                   'state',        'numeric', 'any',     1, 1.0, true, true,  'mood'),
  ('How is your energy right now (1–10)?',                 'state',        'numeric', 'any',     1, 1.0, true, true,  'energy'),
  ('How is your stress right now (1–10)?',                 'state',        'numeric', 'any',     1, 1.0, true, true,  'stress'),

  -- Reflection / capture (translated from db/seeds/question_bank.sql).
  ('What is occupying your mind most right now?',          'mind',         'open',    'morning', 1, 0.8, true, false, null),
  ('What is the one thing you must do today?',             'productivity', 'open',    'morning', 1, 0.9, true, false, null),
  ('What could overload you today?',                       'overload',     'open',    'morning', 2, 0.7, true, false, null),
  ('What do you want to feel by the end of the day?',      'emotion',      'open',    'morning', 2, 0.6, true, false, null),
  ('What are you postponing?',                             'discipline',   'open',    'any',     2, 0.7, true, false, null),
  ('Which thought keeps repeating these days?',            'shadow',       'open',    'evening', 3, 0.5, true, false, null),
  ('What was most unpleasant today?',                      'emotion',      'open',    'evening', 2, 0.6, true, false, null),
  ('What was most alive today?',                           'emotion',      'open',    'evening', 2, 0.6, true, false, null),
  ('Where did you spend the most attention?',              'mind',         'open',    'evening', 1, 0.7, true, false, null),
  ('How did you treat your body today?',                   'body',         'open',    'evening', 2, 0.6, true, false, null),
  ('Was there a moment today you lost control?',           'discipline',   'open',    'evening', 3, 0.5, true, false, null),
  ('What moved you closer to a long-term goal today?',     'goals',        'open',    'evening', 2, 0.7, true, false, null),
  ('What pattern are you noticing in yourself?',           'shadow',       'open',    'any',     3, 0.5, true, false, null),
  ('What would be worth letting go of?',                   'shadow',       'open',    'any',     3, 0.4, true, false, null),
  ('Who or what did you give attention to today?',         'social',       'open',    'evening', 1, 0.6, true, false, null),
  ('What gave you energy today?',                          'energy',       'open',    'evening', 1, 0.7, true, false, null),
  ('What took your energy today?',                         'energy',       'open',    'evening', 2, 0.7, true, false, null),
  ('What did you do out of respect for your future self?', 'meaning',      'open',    'evening', 3, 0.7, true, false, null),
  ('What did you do impulsively?',                         'discipline',   'open',    'evening', 2, 0.6, true, false, null)
on conflict do nothing;
