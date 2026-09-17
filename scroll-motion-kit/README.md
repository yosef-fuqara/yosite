# Scroll Motion Kit — Yo-Site

ערכת העתקה מוכנה שמלמדת AI (Cursor) את מערכת הגלילה והאנימציות של yo-site.

## מה יש בתיקייה

```
scroll-motion-kit/
├── README.md              ← אתה כאן
├── SKILL.md               ← Skill ל-Cursor Agent
├── cursor-rule/
│   └── scroll-motion.mdc  ← Rule אוטומטי ל-Cursor
├── docs/
│   └── ARCHITECTURE.md    ← הסבר מפורט על הארכיטקטורה
├── patterns/              ← דפוסי קוד מוכנים להעתקה
│   ├── TextReveal.jsx
│   ├── card-reveal-variants.js
│   ├── useScrollParallax.js
│   ├── LazyLottie.jsx
│   ├── AppLayout.jsx
│   └── build-ticker.css
└── templates/
    ├── NewSection.template.jsx
    └── ScrollParallaxSection.template.jsx
```

## איך להתקין בפרויקט הבא

### שלב 1 — העתק את התיקייה

העתק את כל התיקייה `scroll-motion-kit` לשורש הפרויקט החדש.

### שלב 2 — הפעל את Cursor Skill

```text
העתק:
  scroll-motion-kit/SKILL.md
אל:
  .cursor/skills/yo-site-scroll-motion/SKILL.md
```

(צור את התיקייה `.cursor/skills/yo-site-scroll-motion/` אם היא לא קיימת.)

### שלב 3 — הפעל את Cursor Rule (אופציונלי אבל מומלץ)

```text
העתק:
  scroll-motion-kit/cursor-rule/scroll-motion.mdc
אל:
  .cursor/rules/scroll-motion.mdc
```

ה-Rule נטען אוטומטית כשעורכים קבצי `src/components/**/*.jsx`.

### שלב 4 — התקן תלות (אם עדיין לא מותקנת)

```bash
npm install framer-motion
```

### שלב 5 — בדוק שזה עובד

פתח קובץ component ובקש מ-Cursor:

> "הוסף סקשן חדש עם אותה אנימציית גלילה כמו ב-yo-site scroll motion kit"

---

## עקרונות מרכזיים (תקציר)

| נושא | מה עושים |
|------|-----------|
| גלילה | Native browser scroll — **לא** Lenis / GSAP |
| ספרייה | Framer Motion בלבד |
| ברירת מחדל | `TextReveal` + `whileInView` עם `once: true` |
| Parallax מקושר לגלילה | רק בדסktop, רק כמו `useScrollParallax` |
| רקע | שכבה `fixed` מאחורי התוכן |
| Easing | `[0.16, 1, 0.3, 1]` |
| נגישות | `prefers-reduced-motion` |

---

## מקור

נוצר מתוך פרויקט **yo-site** (Vite + React + Tailwind + Framer Motion).
