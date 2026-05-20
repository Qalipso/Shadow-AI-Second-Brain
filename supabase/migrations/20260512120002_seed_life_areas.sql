-- 12 canonical life areas. Color hints match web/src/lib/seed-fallback.ts.

insert into public.life_areas (id, slug, name, description, order_index, color_hint) values
  (1,  'work',        'Work',        'Career, focus, output',         1,  '#C9A36A'),
  (2,  'money',       'Money',       'Income, spending, runway',      2,  '#6FBF8A'),
  (3,  'health',      'Health',      'Body, sleep, movement',         3,  '#E36161'),
  (4,  'energy',      'Energy',      'Daily fuel + recovery',         4,  '#E0B25C'),
  (5,  'food',        'Food',        'Eating + nutrition',            5,  '#A38BFF'),
  (6,  'mind',        'Mind',        'Thoughts, focus, learning',     6,  '#6D7BFF'),
  (7,  'creativity',  'Creativity',  'Making, ideas, expression',     7,  '#6BB7C9'),
  (8,  'social',      'Social',      'People, relationships',         8,  '#D58CA0'),
  (9,  'emotion',     'Emotion',     'Feeling, mood, processing',     9,  '#8FB46B'),
  (10, 'discipline',  'Discipline',  'Habits, follow-through',        10, '#C97A6A'),
  (11, 'environment', 'Environment', 'Space, surroundings',           11, '#7FA1C9'),
  (12, 'meaning',     'Meaning',     'Purpose, direction',            12, '#B86DFF')
on conflict (id) do update
set slug        = excluded.slug,
    name        = excluded.name,
    description = excluded.description,
    order_index = excluded.order_index,
    color_hint  = excluded.color_hint;
