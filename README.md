# نظام ديون المالية

نظام مالي لإدارة الديون للموظفين مع لوحة تحكم إدارية، مبني على React + Vite + Express + Supabase.

## التشغيل محلياً

**المتطلبات:** Node.js

1. تثبيت الحزم:
   `npm install`
2. أنشئ ملف `.env` (راجع `.env.example`) وضع فيه:
   - `GEMINI_API_KEY` — مفتاح Gemini API
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — للخادم (سري)
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — للواجهة
   - `DATABASE_URL` — اتصال Postgres المباشر (لتشغيل ملفات الهجرة في `supabase/migrations`)
3. تشغيل التطبيق:
   `npm run dev`
# findeb
