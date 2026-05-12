
-- Volunteers: full manage on lessons
DROP POLICY IF EXISTS "Volunteers can add lessons" ON public.lessons;
CREATE POLICY "Volunteers can manage lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (private.is_limited_volunteer(auth.uid()))
WITH CHECK (private.is_limited_volunteer(auth.uid()));

-- Volunteers: full manage on lesson_content (videos)
CREATE POLICY "Volunteers can manage lesson content"
ON public.lesson_content
FOR ALL
TO authenticated
USING (private.is_limited_volunteer(auth.uid()))
WITH CHECK (private.is_limited_volunteer(auth.uid()));

-- Volunteers: full manage on quiz_questions
CREATE POLICY "Volunteers can manage quiz questions"
ON public.quiz_questions
FOR ALL
TO authenticated
USING (private.is_limited_volunteer(auth.uid()))
WITH CHECK (private.is_limited_volunteer(auth.uid()));
