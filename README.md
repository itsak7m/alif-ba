# دكّانة عُلا 🏪

تجربة تعلّم رياضيات للصفوف 1–3. الطفل بيدير دكانة حارة: بيعدّ، وبيجمع، وبيرجّع الباقي. التطبيق بيكتشف غلطته بالزبط، وبيعطي الأهل مهمة الليلة، وبيورجي المعلم خريطة أغلاط الصف.

- التصميم: `docs/superpowers/specs/2026-10-27-dukkanat-ula-design.md`
- خطة البناء: `docs/superpowers/plans/2026-10-27-dukkanat-ula.md`
- نص التسجيل الصوتي: `docs/recording-script.md`

## تشغيل محلي

```bash
python3 -m http.server 8080      # بعدها افتح http://localhost:8080
npm test                          # اختبارات المحرك (node --test)
node tools/smoke.cjs              # فحص كامل بالمتصفح (لازم السيرفر يكون شغّال)
```

## بعد أي تعديل على الملفات

```bash
npm run bank       # إذا تغيّرت قواعد توليد الأسئلة
npm run precache   # دايماً: بيحدّث قائمة ملفات الـ offline ونسخة sw.js
```

## تحديث الصوت

1. حط التسجيل الجديد بـ `audio/raw/`.
2. شوف القطع: `node tools/split-audio.mjs --detect audio/raw/<file>`
3. عدّل `audio/raw/cuts.json` (لكل قطعة `id` و`start` و`dur`)، وبعدها شغّل `node tools/split-audio.mjs audio/raw/cuts.json`
4. `npm run precache && npm test`

## النشر

موقع ثابت بالكامل. أي استضافة ثابتة بتمشي (GitHub Pages، Netlify…) من جذر الريبو.
