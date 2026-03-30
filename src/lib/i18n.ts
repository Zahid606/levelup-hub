export type Language = 'en' | 'ur' | 'bn';

const translations: Record<string, Record<Language, string>> = {
  // Auth
  'auth.login': { en: 'Log In', ur: 'لاگ ان', bn: 'লগ ইন' },
  'auth.signup': { en: 'Sign Up', ur: 'سائن اپ', bn: 'সাইন আপ' },
  'auth.adminLogin': { en: 'Admin Login', ur: 'ایڈمن لاگ ان', bn: 'অ্যাডমিন লগইন' },
  'auth.email': { en: 'Email', ur: 'ای میل', bn: 'ইমেইল' },
  'auth.password': { en: 'Password', ur: 'پاس ورڈ', bn: 'পাসওয়ার্ড' },
  'auth.fullName': { en: 'Full Name', ur: 'پورا نام', bn: 'পুরো নাম' },
  'auth.noAccount': { en: "Don't have an account?", ur: 'اکاؤنٹ نہیں ہے؟', bn: 'অ্যাকাউন্ট নেই?' },
  'auth.hasAccount': { en: 'Already have an account?', ur: 'پہلے سے اکاؤنٹ ہے؟', bn: 'ইতিমধ্যে অ্যাকাউন্ট আছে?' },
  'auth.logout': { en: 'Log Out', ur: 'لاگ آؤٹ', bn: 'লগ আউট' },
  
  // Nav
  'nav.lessons': { en: 'Lessons', ur: 'اسباق', bn: 'পাঠ' },
  'nav.leaderboard': { en: 'Leaderboard', ur: 'لیڈر بورڈ', bn: 'লিডারবোর্ড' },
  'nav.admin': { en: 'Admin Panel', ur: 'ایڈمن پینل', bn: 'অ্যাডমিন প্যানেল' },
  'nav.profile': { en: 'Profile', ur: 'پروفائل', bn: 'প্রোফাইল' },
  
  // Lessons
  'lessons.title': { en: 'Your Lessons', ur: 'آپ کے اسباق', bn: 'আপনার পাঠ' },
  'lessons.lesson': { en: 'Lesson', ur: 'سبق', bn: 'পাঠ' },
  'lessons.completed': { en: 'Completed', ur: 'مکمل', bn: 'সম্পন্ন' },
  'lessons.start': { en: 'Start Lesson', ur: 'سبق شروع کریں', bn: 'পাঠ শুরু করুন' },
  'lessons.continue': { en: 'Continue', ur: 'جاری رکھیں', bn: 'চালিয়ে যান' },
  
  // Quiz
  'quiz.title': { en: 'Quiz', ur: 'کوئز', bn: 'কুইজ' },
  'quiz.submit': { en: 'Submit Answer', ur: 'جواب جمع کریں', bn: 'উত্তর জমা দিন' },
  'quiz.correct': { en: 'Correct! 🎉', ur: 'صحیح! 🎉', bn: 'সঠিক! 🎉' },
  'quiz.wrong': { en: 'Wrong answer', ur: 'غلط جواب', bn: 'ভুল উত্তর' },
  'quiz.next': { en: 'Next Question', ur: 'اگلا سوال', bn: 'পরবর্তী প্রশ্ন' },
  
  // Points
  'points.total': { en: 'Total Points', ur: 'کل پوائنٹس', bn: 'মোট পয়েন্ট' },
  'points.rank': { en: 'Rank', ur: 'درجہ', bn: 'র‍্যাঙ্ক' },
  
  // Admin
  'admin.dashboard': { en: 'Admin Dashboard', ur: 'ایڈمن ڈیش بورڈ', bn: 'অ্যাডমিন ড্যাশবোর্ড' },
  'admin.manageLessons': { en: 'Manage Lessons', ur: 'اسباق کا انتظام', bn: 'পাঠ পরিচালনা' },
  'admin.manageUsers': { en: 'Manage Users', ur: 'صارفین کا انتظام', bn: 'ব্যবহারকারী পরিচালনা' },
  'admin.addLesson': { en: 'Add Lesson', ur: 'سبق شامل کریں', bn: 'পাঠ যোগ করুন' },
  'admin.addVideo': { en: 'Add Video', ur: 'ویڈیو شامل کریں', bn: 'ভিডিও যোগ করুন' },
  'admin.addQuiz': { en: 'Add Quiz Question', ur: 'کوئز سوال شامل کریں', bn: 'কুইজ প্রশ্ন যোগ করুন' },
  'admin.giveGift': { en: 'Give Gift', ur: 'تحفہ دیں', bn: 'উপহার দিন' },
  'admin.students': { en: 'Students', ur: 'طلباء', bn: 'শিক্ষার্থী' },
  'admin.progress': { en: 'Progress', ur: 'ترقی', bn: 'অগ্রগতি' },
  'admin.manageEmployees': { en: 'Manage Employees', ur: 'ملازمین کا انتظام', bn: 'কর্মচারী পরিচালনা' },
  
  // General
  'general.save': { en: 'Save', ur: 'محفوظ کریں', bn: 'সংরক্ষণ' },
  'general.cancel': { en: 'Cancel', ur: 'منسوخ', bn: 'বাতিল' },
  'general.delete': { en: 'Delete', ur: 'حذف', bn: 'মুছুন' },
  'general.edit': { en: 'Edit', ur: 'ترمیم', bn: 'সম্পাদনা' },
  'general.loading': { en: 'Loading...', ur: 'لوڈ ہو رہا ہے...', bn: 'লোড হচ্ছে...' },
  'general.darkMode': { en: 'Dark Mode', ur: 'ڈارک موڈ', bn: 'ডার্ক মোড' },
  'general.language': { en: 'Language', ur: 'زبان', bn: 'ভাষা' },
  'general.gifts': { en: 'Gifts', ur: 'تحائف', bn: 'উপহার' },
  'general.welcome': { en: 'Welcome back', ur: 'خوش آمدید', bn: 'স্বাগতম' },
};

export function t(key: string, lang: Language = 'en'): string {
  return translations[key]?.[lang] || translations[key]?.en || key;
}

export const languageNames: Record<Language, string> = {
  en: 'English',
  ur: 'اردو',
  bn: 'বাংলা',
};
