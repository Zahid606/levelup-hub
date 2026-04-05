-- ============================================================
-- 1. Remove all current students (non-admin, non-employee)
-- ============================================================
DELETE FROM public.quiz_answers
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'student'
);

DELETE FROM public.user_progress
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'student'
);

DELETE FROM public.user_points
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'student'
);

DELETE FROM public.gifts
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'student'
);

DELETE FROM public.profiles
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'student'
);

DELETE FROM auth.users
WHERE id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'student'
);

-- user_roles rows for students auto-deleted by cascade after auth.users delete

-- ============================================================
-- 2. Add Muslim students
-- ============================================================
DO $$
DECLARE
  student_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
  names TEXT[] := ARRAY[
    'Ahmed Hassan', 'Fatima Al-Rashid', 'Omar Abdullah', 'Aisha Malik',
    'Yusuf Ibrahim', 'Zainab Ahmed', 'Muhammad Ali', 'Khadijah Siddiqui'
  ];
  emails TEXT[] := ARRAY[
    'ahmed.hassan@example.com', 'fatima.alrashid@example.com', 'omar.abdullah@example.com', 'aisha.malik@example.com',
    'yusuf.ibrahim@example.com', 'zainab.ahmed@example.com', 'muhammad.ali@example.com', 'khadijah.siddiqui@example.com'
  ];
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud
    ) VALUES (
      student_ids[i],
      '00000000-0000-0000-0000-000000000000',
      emails[i],
      crypt('Student123!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('full_name', names[i]),
      false, 'authenticated', 'authenticated'
    );
    -- handle_new_user trigger auto-creates profile and assigns 'student' role
  END LOOP;
END $$;

-- ============================================================
-- 3. Kabeerah Lesson - Add quiz questions
--    Matches lesson title containing 'kabeer', 'kabir', 'major sin', 'کبیرہ'
-- ============================================================
DO $$
DECLARE
  v_lesson_id UUID;
BEGIN
  SELECT id INTO v_lesson_id
  FROM public.lessons
  WHERE
    title ILIKE '%kabeer%' OR title ILIKE '%kabir%' OR
    title ILIKE '%major sin%' OR title ILIKE '%kab%ir%' OR
    title_ur ILIKE '%کبیرہ%' OR title_ur ILIKE '%کبیر%'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_lesson_id IS NULL THEN
    RAISE NOTICE 'Kabeerah lesson not found - skipping kabeerah questions';
    RETURN;
  END IF;

  -- Clear existing quiz questions for this lesson to avoid duplicates
  DELETE FROM public.quiz_questions WHERE lesson_id = v_lesson_id;

  -- Q1: Surah An-Nisa 31
  INSERT INTO public.quiz_questions (lesson_id, question, question_ur, question_bn, options, correct_answer, points, sort_order)
  VALUES (
    v_lesson_id,
    'According to Surah An-Nisa ayat 31, if a person avoids major sins, what will Allah do?',
    'سورۃ النساء آیت 31 کے مطابق اگر انسان بڑے گناہوں سے بچتا رہے تو اللہ تعالیٰ کیا کرے گا؟',
    'সূরা নিসা আয়াত ৩১ অনুযায়ী যদি মানুষ বড় গুনাহ থেকে বেঁচে থাকে, তাহলে আল্লাহ কী করবেন?',
    jsonb_build_array(
      'Only increase in sustenance | صرف رزق میں اضافہ کرے گا | শুধু রিজিক বৃদ্ধি করবেন',
      'Forgive minor sins and admit to an honorable place | چھوٹے گناہ معاف کر دے گا اور عزت والی جگہ داخل کرے گا | ছোট গুনাহ ক্ষমা করবেন এবং সম্মানিত স্থানে প্রবেশ করাবেন',
      'Make wealthy in this world | دنیا میں مالدار بنا دے گا | দুনিয়ায় ধনী বানিয়ে দেবেন',
      'Immediately grant paradise | فوراً جنت دے دے گا | সঙ্গে সঙ্গে জান্নাতে প্রবেশ করাবেন'
    ),
    1, 10, 0
  );

  -- Q2: How many destructive sins
  INSERT INTO public.quiz_questions (lesson_id, question, question_ur, question_bn, options, correct_answer, points, sort_order)
  VALUES (
    v_lesson_id,
    'How many destructive sins did the Prophet ﷺ command to avoid?',
    'نبی ﷺ نے کتنے تباہ کن گناہوں سے بچنے کا حکم دیا؟',
    'নবী ﷺ কতটি ধ্বংসাত্মক গুনাহ থেকে বাঁচতে বলেছেন?',
    jsonb_build_array('5', '7', '9', '10'),
    1, 10, 1
  );

  -- Q3: Greatest destructive sin
  INSERT INTO public.quiz_questions (lesson_id, question, question_ur, question_bn, options, correct_answer, points, sort_order)
  VALUES (
    v_lesson_id,
    'According to the hadith, what is the greatest destructive sin?',
    'حدیث کے مطابق سب سے بڑا تباہ کن گناہ کون سا ہے؟',
    'হাদিস অনুযায়ী সবচেয়ে বড় ধ্বংসাত্মক গুনাহ কোনটি?',
    jsonb_build_array(
      'Lying | جھوٹ بولنا | মিথ্যা বলা',
      'Associating partners with Allah (Shirk) | اللہ کے ساتھ شرک کرنا | আল্লাহর সাথে শিরক করা',
      'Getting angry | غصہ کرنا | রাগ করা',
      'Useless talk | فضول باتیں کرنا | অপ্রয়োজনীয় কথা বলা'
    ),
    1, 10, 2
  );

  -- Q4: Which is a destructive sin
  INSERT INTO public.quiz_questions (lesson_id, question, question_ur, question_bn, options, correct_answer, points, sort_order)
  VALUES (
    v_lesson_id,
    'According to the hadith, which of the following is among the destructive sins?',
    'حدیث میں درج ذیل میں سے کون سا گناہ تباہ کن گناہوں میں شامل ہے؟',
    'হাদিস অনুযায়ী নিচের কোনটি ধ্বংসাত্মক গুনাহের মধ্যে রয়েছে?',
    jsonb_build_array(
      'Consuming an orphan''s wealth | یتیم کا مال کھانا | এতিমের সম্পদ খাওয়া',
      'Sleeping too much | زیادہ سونا | বেশি ঘুমানো',
      'Eating too much | زیادہ کھانا | বেশি খাওয়া',
      'Travelling | سفر کرنا | ভ্রমণ করা'
    ),
    0, 10, 3
  );

  -- Q5: False accusation against chaste women
  INSERT INTO public.quiz_questions (lesson_id, question, question_ur, question_bn, options, correct_answer, points, sort_order)
  VALUES (
    v_lesson_id,
    'According to the hadith, what is making false accusations against chaste believing women called?',
    'حدیث میں پاکدامن مؤمن عورتوں پر جھوٹا الزام لگانے کو کیا قرار دیا گیا ہے؟',
    'হাদিস অনুযায়ী পবিত্র ঈমানদার নারীদের উপর মিথ্যা অপবাদ দেওয়াকে কী বলা হয়েছে?',
    jsonb_build_array(
      'A minor sin | چھوٹا گناہ | ছোট গুনাহ',
      'A recommended act | مستحب عمل | মুস্তাহাব আমল',
      'A great destructive sin | تباہ کن بڑا گناہ | ধ্বংসাত্মক বড় গুনাহ',
      'A permissible act | مباح عمل | মুবাহ কাজ'
    ),
    2, 10, 4
  );

  RAISE NOTICE 'Kabeerah questions added successfully to lesson: %', v_lesson_id;
END $$;

-- ============================================================
-- 4. Add questions to OTHER lessons (Salah, Quran, Aqeedah, etc.)
--    Only adds if the lesson has no questions yet
-- ============================================================
DO $$
DECLARE
  v_lesson RECORD;
BEGIN
  FOR v_lesson IN
    SELECT l.id, l.title
    FROM public.lessons l
    WHERE
      l.title NOT ILIKE '%kabeer%' AND l.title NOT ILIKE '%kabir%' AND
      l.title NOT ILIKE '%major sin%' AND l.title_ur NOT ILIKE '%کبیرہ%'
      AND NOT EXISTS (SELECT 1 FROM public.quiz_questions q WHERE q.lesson_id = l.id)
  LOOP

    -- Salah / Prayer lesson
    IF v_lesson.title ILIKE '%salah%' OR v_lesson.title ILIKE '%prayer%' OR v_lesson.title ILIKE '%namaz%' THEN
      INSERT INTO public.quiz_questions (lesson_id, question, question_ur, question_bn, options, correct_answer, points, sort_order)
      VALUES
      (v_lesson.id, 'How many times a day are Muslims obligated to pray?',
       'مسلمانوں پر دن میں کتنی بار نماز فرض ہے؟', 'মুসলমানদের দিনে কতবার নামাজ ফরজ?',
       jsonb_build_array('3', '4', '5', '6'), 2, 10, 0),
      (v_lesson.id, 'Which prayer is performed at dawn?',
       'فجر کی نماز کس وقت ادا کی جاتی ہے؟', 'ফজরের নামাজ কোন সময় পড়া হয়?',
       jsonb_build_array('Midnight | آدھی رات | মধ্যরাত', 'Dawn | فجر کے وقت | ভোরবেলা', 'Noon | ظہر کے وقت | দুপুরে', 'Sunset | غروب آفتاب | সূর্যাস্তে'), 1, 10, 1),
      (v_lesson.id, 'What is said at the beginning of every prayer?',
       'ہر نماز کے شروع میں کیا پڑھا جاتا ہے؟', 'প্রতিটি নামাজের শুরুতে কী বলা হয়?',
       jsonb_build_array('Alhamdulillah | الحمد للہ | আলহামদুলিল্লাহ', 'Allahu Akbar (Takbeer) | اللہ اکبر (تکبیر) | আল্লাহু আকবর', 'SubhanAllah | سبحان اللہ | সুবহানাল্লাহ', 'Bismillah | بسم اللہ | বিসমিল্লাহ'), 1, 10, 2);

    -- Zakat lesson
    ELSIF v_lesson.title ILIKE '%zakat%' OR v_lesson.title ILIKE '%zakah%' THEN
      INSERT INTO public.quiz_questions (lesson_id, question, question_ur, question_bn, options, correct_answer, points, sort_order)
      VALUES
      (v_lesson.id, 'What percentage of savings is given as Zakat?',
       'زکاۃ بچت کا کتنا فیصد دیا جاتا ہے؟', 'সঞ্চয়ের কত শতাংশ যাকাত দেওয়া হয়?',
       jsonb_build_array('1%', '2.5%', '5%', '10%'), 1, 10, 0),
      (v_lesson.id, 'Zakat is obligatory on whom?',
       'زکاۃ کس پر فرض ہے؟', 'যাকাত কার উপর ফরজ?',
       jsonb_build_array('Every Muslim | ہر مسلمان پر | প্রতিটি মুসলমানের উপর', 'Muslims who own nisab | نصاب والے مسلمان پر | নিসাব পরিমাণ সম্পদের মালিকের উপর', 'Only men | صرف مردوں پر | শুধু পুরুষদের উপর', 'Only the rich | صرف امیروں پر | শুধু ধনীদের উপর'), 1, 10, 1);

    -- Quran lesson
    ELSIF v_lesson.title ILIKE '%quran%' OR v_lesson.title ILIKE '%qur%an%' OR v_lesson.title ILIKE '%قران%' THEN
      INSERT INTO public.quiz_questions (lesson_id, question, question_ur, question_bn, options, correct_answer, points, sort_order)
      VALUES
      (v_lesson.id, 'How many surahs (chapters) are in the Quran?',
       'قرآن میں کتنی سورتیں ہیں؟', 'কুরআনে কতটি সূরা আছে?',
       jsonb_build_array('99', '100', '114', '120'), 2, 10, 0),
      (v_lesson.id, 'Which surah is known as the heart of the Quran?',
       'کون سی سورت قرآن کا دل کہلاتی ہے؟', 'কোন সূরাকে কুরআনের হৃদয় বলা হয়?',
       jsonb_build_array('Surah Al-Fatiha | سورۃ الفاتحہ | সূরা আল-ফাতিহা', 'Surah Ya-Sin | سورۃ یٰسین | সূরা ইয়াসিন', 'Surah Al-Baqarah | سورۃ البقرہ | সূরা আল-বাকারা', 'Surah Al-Ikhlas | سورۃ الاخلاص | সূরা আল-ইখলাস'), 1, 10, 1),
      (v_lesson.id, 'In which month was the Quran first revealed?',
       'قرآن پہلی بار کس مہینے میں نازل ہوا؟', 'কুরআন প্রথম কোন মাসে নাযিল হয়েছিল?',
       jsonb_build_array('Rajab | رجب | রজব', 'Muharram | محرم | মুহররম', 'Ramadan | رمضان | রমজান', 'Shawwal | شوال | শাওয়াল'), 2, 10, 2);

    -- General Islamic lesson (default for any other lesson)
    ELSE
      INSERT INTO public.quiz_questions (lesson_id, question, question_ur, question_bn, options, correct_answer, points, sort_order)
      VALUES
      (v_lesson.id, 'What are the five pillars of Islam?',
       'اسلام کے پانچ ارکان کون سے ہیں؟', 'ইসলামের পাঁচ স্তম্ভ কী কী?',
       jsonb_build_array(
         'Shahadah, Prayer, Zakat, Fasting, Hajj | شہادت، نماز، زکاۃ، روزہ، حج | শাহাদাহ, নামাজ, যাকাত, রোজা, হজ',
         'Prayer, Fasting, Jihad, Zakat, Hajj | نماز، روزہ، جہاد، زکاۃ، حج | নামাজ, রোজা, জিহাদ, যাকাত, হজ',
         'Shahadah, Prayer, Zakat, Jihad, Hajj | شہادت، نماز، زکاۃ، جہاد، حج | শাহাদাহ, নামাজ, যাকাত, জিহাদ, হজ',
         'Fasting, Prayer, Zakat, Hajj, Dua | روزہ، نماز، زکاۃ، حج، دعا | রোজা, নামাজ, যাকাত, হজ, দোয়া'
       ), 0, 10, 0),
      (v_lesson.id, 'Who is the last Prophet of Islam?',
       'اسلام کے آخری نبی کون ہیں؟', 'ইসলামের শেষ নবী কে?',
       jsonb_build_array(
         'Prophet Isa (AS) | حضرت عیسیٰ علیہ السلام | নবী ঈসা (আ)',
         'Prophet Musa (AS) | حضرت موسیٰ علیہ السلام | নবী মূসা (আ)',
         'Prophet Muhammad ﷺ | حضرت محمد ﷺ | নবী মুহাম্মাদ ﷺ',
         'Prophet Ibrahim (AS) | حضرت ابراہیم علیہ السلام | নবী ইবরাহীম (আ)'
       ), 2, 10, 1),
      (v_lesson.id, 'What does "Islam" mean in Arabic?',
       'عربی میں "اسلام" کا کیا مطلب ہے؟', 'আরবিতে "ইসলাম" শব্দের অর্থ কী?',
       jsonb_build_array(
         'Peace through submission | اطاعت کے ذریعے امن | আনুগত্যের মাধ্যমে শান্তি',
         'Faith and belief | ایمان اور یقین | বিশ্বাস ও আস্থা',
         'Worship of God | اللہ کی عبادت | আল্লাহর ইবাদত',
         'Holy journey | مقدس سفر | পবিত্র যাত্রা'
       ), 0, 10, 2);
    END IF;

  END LOOP;
END $$;
