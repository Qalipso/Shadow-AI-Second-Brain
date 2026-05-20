insert into life_areas (id, slug, name, description, order_index) values
  (1,  'work',         'Work / Career',                       'Job, projects, output',                   1),
  (2,  'money',        'Money / Finance',                     'Income, spend, savings',                  2),
  (3,  'health',       'Health / Body',                       'Body state, training, recovery',          3),
  (4,  'energy',       'Energy / Sleep',                      'Sleep, fatigue, vitality',                4),
  (5,  'food',         'Food / Nutrition',                    'Eating, nutrition quality',               5),
  (6,  'mind',         'Mind / Learning',                     'Study, focus, knowledge',                 6),
  (7,  'creativity',   'Creativity / Projects',               'Side projects, creation',                 7),
  (8,  'social',       'Relationships / Social',              'People, partner, friends, family',        8),
  (9,  'emotion',      'Emotional State',                     'Mood, feelings',                          9),
  (10, 'discipline',   'Discipline / Habits',                 'Routines, willpower',                     10),
  (11, 'environment',  'Environment / Home',                  'Space, tools, surroundings',              11),
  (12, 'meaning',      'Meaning / Direction',                 'Long-term purpose, values',               12)
on conflict (id) do nothing;
