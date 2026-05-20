-- 20 seeded questions with category, question_type, time_of_day, emotional_depth.
-- depth: 1 surface, 2 middle, 3 deep/shadow.

insert into questions (text, category, question_type, time_of_day, emotional_depth, frequency_weight, is_active) values
  ('Что сегодня занимает больше всего места в голове?',         'mind',         'morning',  'morning',  1, 8, true),
  ('Какое одно дело сегодня действительно важно?',              'productivity', 'morning',  'morning',  1, 9, true),
  ('Как ты оцениваешь энергию от 1 до 10?',                     'energy',       'checkin',  'any',      1, 9, true),
  ('Что сегодня может тебя перегрузить?',                       'overload',     'morning',  'morning',  2, 7, true),
  ('Что ты хочешь почувствовать к концу дня?',                  'emotion',      'morning',  'morning',  2, 6, true),
  ('Что ты откладываешь?',                                      'discipline',   'reflect',  'any',      2, 7, true),
  ('Какая мысль повторяется последние дни?',                    'shadow',       'reflect',  'evening',  3, 5, true),
  ('Что сегодня было самым неприятным?',                        'emotion',      'evening',  'evening',  2, 6, true),
  ('Что сегодня было самым живым?',                             'emotion',      'evening',  'evening',  2, 6, true),
  ('На что ты потратил больше всего внимания?',                 'mind',         'evening',  'evening',  1, 7, true),
  ('Как ты сегодня относился к своему телу?',                   'body',         'evening',  'evening',  2, 6, true),
  ('Был ли сегодня момент, когда ты потерял контроль?',         'discipline',   'evening',  'evening',  3, 5, true),
  ('Что сегодня приблизило тебя к долгосрочной цели?',          'goals',        'evening',  'evening',  2, 7, true),
  ('Какой паттерн ты замечаешь за собой?',                      'shadow',       'reflect',  'any',      3, 5, true),
  ('Что стоило бы отпустить?',                                  'shadow',       'reflect',  'any',      3, 4, true),
  ('Кому или чему ты сегодня уделил внимание?',                 'social',       'evening',  'evening',  1, 6, true),
  ('Что сегодня дало энергию?',                                 'energy',       'evening',  'evening',  1, 7, true),
  ('Что сегодня забрало энергию?',                              'energy',       'evening',  'evening',  2, 7, true),
  ('Что ты сделал из уважения к будущему себе?',                'meaning',      'evening',  'evening',  3, 7, true),
  ('Что ты сделал импульсивно?',                                'discipline',   'evening',  'evening',  2, 6, true);
