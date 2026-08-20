# Rent Helper — Design Brief

> Figma Make / First Draft-д шууд paste хийхэд зориулсан product brief.
> Codebase-ээс (audit prompt, credit логик, дэлгэцүүд, өнгөний систем) гаргасан.
> Design баталсны дараа Figma Dev Mode MCP-ээр эсвэл screenshot-оор кодлоход буцааж өгнө.

---

## Paste-д бэлэн brief (англиар)

```
PRODUCT: "Rent Helper" — an AI legal-audit app for residential rental
contracts in Mongolia.

WHO IT'S FOR: Tenants (renters) in Mongolia who sign lease contracts they
can't legally evaluate. Mobile-first, non-lawyer users.

THE VALUE / WHY IT EXISTS:
Renters sign contracts that often violate the Mongolian Civil Code (articles
287–301) and quietly strip their rights — unfair cancellation terms, vague
deposit-return conditions, illegal rent-increase clauses. Rent Helper lets a
tenant upload their contract PDF and get an AI audit that flags every clause
that breaks the law or harms them, cited to the exact Civil Code article, in
plain Mongolian. It turns a scary legal document into a clear risk report.

CORE USER GOAL: "Is this contract safe to sign, and where am I being cheated?"

KEY FEATURES TO REFLECT IN THE DESIGN:
- Upload a contract PDF (also scanned images via OCR) → AI analysis.
- A compliance score (0–100) shown as a ring/gauge — instant trust signal.
- A list of "compliance alerts", each with: severity (high/medium/low/info),
  the contract clause, the violated law + article number, plain-language
  explanation, and an AI confidence level.
- "Strengths" — clauses that actually protect the tenant.
- Contract metadata auto-extracted: tenant/landlord name, monthly rent,
  deposit, start/end date, payment day.
- Credit-based pricing: 1 credit per audited page; balance shown; unpaid
  contracts are locked behind a "pay to unlock audit" gate.
- Alerts/reminders for compliance issues and contract expiry.

TONE & TRUST: calm, trustworthy, fintech-grade. Not playful. The user is
anxious about money and legal risk — design should feel safe and authoritative.

VISUAL SYSTEM (match the existing build):
- Mobile-first, single column, max ~420px, bottom tab nav (Home, Contracts,
  Alerts, Settings).
- Light + dark mode.
- Colors: white/near-black base, emerald green as the single accent, near-black
  panels for emphasis, amber = warning, red = legal violation/high risk.
- Font: Geist. Corner radius ~10px. Soft cards, generous whitespace.
- Language: all UI copy in MONGOLIAN (Cyrillic). e.g. "Нийцлийн оноо",
  "Анхааруулга", "Барьцаа", "Сарын түрээс".

SCREENS TO DESIGN (light + dark each):
1. Home dashboard — greeting, metric cards, big "Upload PDF" area + AI CTA.
2. Audit result — compliance score ring on top, contract summary, expandable
   alert list color-coded by severity, strengths section, extracted metadata.
3. Contracts list — card per contract with status/expiry, credit balance on
   top, "pay to unlock" gate on unpaid ones.
4. Alerts — compliance + expiry reminders, severity-coded.
5. Payment / credits — balance, top-up, cost = pages × 1 credit.
```

---

## Figma дээр хийх дараалал

1. Figma.com → **Figma Make** (эсвэл First Draft) нээх.
2. Дээрх brief-ийг бүтнээр нь paste → generate.
3. Дэлгэц бүрийг давтаж сайжруул, ж: *"make the audit-result screen more
   detailed, show the severity badges and Civil Code article citations"*.
4. Brand тогтвортой байлгахын тулд эхэнд өнгө/фонтоо тодорхой зааж өг
   (near-black, emerald, amber, Geist).

---

## Design системийн нарийн утга (Figma-д өнгө оруулахад)

Эх сурвалж: `app/globals.css` (oklch). Figma-д ойролцоо hex:

| Үүрэг | Токен | Тэмдэглэл |
|------|-------|-----------|
| Background (light) | `--background` | `#ffffff` |
| Foreground (text) | `--foreground` | `#252525` |
| Brand accent (ногоон) | `--brand` | Цорын ганц өргөлт. Light 4.75:1 цагаан дээр (AA) |
| Brand on panel | `--brand-bright` | Хар самбар дээрх ногоон, хоёр горимд ижил |
| Panel (хар самбар) | `--panel` | Онцлох гадаргуу. Dark горимд гэрэлтэж, +hairline border |
| Success (нийцсэн) | `--success` | `#1f9d55` |
| Warning (анхаар) | `--warning` | `#d98a26` |
| Destructive (зөрчил) | `--destructive` | `#dc2626` |
| Border | `--border` | `#e5e5e5` |
| Background (dark) | `--background` dark | `#252525` |

> `--navy` токен хасагдсан: dark горимд утга тодорхойлоогүй байсан тул харанхуй
> дэвсгэр дээр бараг харагдахгүй байв. Хэрэглээ нь `--foreground` (текст),
> `--primary` (дүүргэсэн товч), `--brand` (холбоос, өргөлт) рүү шилжсэн.

Давтагдах хэв маягууд `components/app/kit.tsx`-д цуглуулагдсан:
`Eyebrow`, `SectionHeading`, `Panel`, `PanelGlow`, `Card`, `IconChip`, `Chip`.

- Фонт: **Geist** (sans), heading-д мөн Geist.
- Corner radius суурь: `--radius: 0.625rem` (~10px).
- Easing: `--ease-settle` (cubic-bezier 0.22, 1, 0.36, 1) — зөөлөн орох хөдөлгөөн.

---

## Холбоотой файлууд (контекст хэрэгтэй бол)

- Audit AI prompt + value: `lib/audit/prompt.ts`
- Credit / төлбөрийн логик: `lib/credits.ts`
- Home dashboard: `components/dashboard/HomeDashboard.tsx`
- Audit үр дүн: `components/contracts/AnalysisResults.tsx`
- Өнгө / design системийн токен: `app/globals.css`
- Хуваалцсан UI хэв маяг: `components/app/kit.tsx`
- Landing хуудас: `components/landing/`
