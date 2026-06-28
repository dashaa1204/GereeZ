"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Faithful port of the Figma Make prototype ("Residential Rental Audit App").
// Uses DUMMY data throughout — wire to real contracts/credits/audit later.
// Each route renders <FigmaApp initialTab="..."/>; navigation between audit /
// payment sub-screens stays internal (state) exactly like the prototype.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  Home,
  FileText,
  Bell,
  Settings,
  Upload,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Lock,
  CreditCard,
  Plus,
  Moon,
  Sun,
  ArrowRight,
  ShieldCheck,
  Calendar,
  User,
  Building2,
  Banknote,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type {
  FigmaContractVM,
  FigmaData,
  FigmaFinding,
} from "@/lib/figma-data";

// ── types ─────────────────────────────────────────────────────────────────────

type Tab = "home" | "contracts" | "alerts" | "settings";
type Screen = Tab | "audit" | "payment";
type Severity = "high" | "medium" | "low" | "info" | "ok";

interface Finding {
  id: number;
  severity: Severity;
  clause: string;
  article: string;
  explanation: string;
  confidence: number;
}

interface Contract {
  id: number;
  address: string;
  tenant: string;
  landlord: string;
  rent: number;
  deposit: number;
  startDate: string;
  endDate: string;
  payDay: number;
  score: number;
  status: "compliant" | "warning" | "risk";
  paid: boolean;
  pages: number;
}

interface AlertItem {
  id: number;
  type: "compliance" | "expiry";
  severity: Severity;
  contractAddress: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
}

// ── dummy data ────────────────────────────────────────────────────────────────

const CONTRACTS: Contract[] = [
  {
    id: 1,
    address: "Сүхбаатар дүүрэг, 8-р хороо, Энхтайваны өргөн чөлөө 16А",
    tenant: "Батболд Дорж",
    landlord: "Мөнхбаяр Гантулга",
    rent: 850000,
    deposit: 1700000,
    startDate: "2024-01-15",
    endDate: "2025-01-14",
    payDay: 5,
    score: 78,
    status: "warning",
    paid: true,
    pages: 6,
  },
  {
    id: 2,
    address: "Баянзүрх дүүрэг, 21-р хороо, Наран гудамж 4Б/201",
    tenant: "Батболд Дорж",
    landlord: "Оюунчимэг Дашням",
    rent: 620000,
    deposit: 620000,
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    payDay: 1,
    score: 91,
    status: "compliant",
    paid: true,
    pages: 4,
  },
  {
    id: 3,
    address: "Чингэлтэй дүүрэг, 3-р хороо, Их сургуулийн гудамж 9/12",
    tenant: "Батболд Дорж",
    landlord: "Энхбаяр Нямдорж",
    rent: 980000,
    deposit: 1960000,
    startDate: "2024-06-01",
    endDate: "2025-05-31",
    payDay: 10,
    score: 44,
    status: "risk",
    paid: false,
    pages: 8,
  },
];

const FINDINGS: Finding[] = [
  {
    id: 1,
    severity: "high",
    clause: "7.3-р зүйл — Гэрээ цуцлах нөхцөл",
    article: "Иргэний хуулийн 291-р зүйлийн 2 дахь хэсэг",
    explanation:
      "Эзэмшигч нь 3 хоногийн мэдэгдлээр гэрээг цуцлах эрхтэй гэж заасан нь хуулиар тогтоосон 30 хоногийн хугацааг зөрчиж байна. Энэ нөхцөл хүчингүй болно.",
    confidence: 97,
  },
  {
    id: 2,
    severity: "high",
    clause: "5.1-р зүйл — Барьцааны буцаалт",
    article: "Иргэний хуулийн 295-р зүйлийн 1 дэх хэсэг",
    explanation:
      "Гэрээ дуусмагц барьцааг буцаах хугацааг тодорхойлоогүй байна. Хуульд 10 ажлын өдрийн дотор буцаах үүрэг заасан.",
    confidence: 94,
  },
  {
    id: 3,
    severity: "medium",
    clause: "8.2-р зүйл — Түрээсийн өөрчлөлт",
    article: "Иргэний хуулийн 289-р зүйлийн 3 дахь хэсэг",
    explanation:
      "Эзэмшигч нь 7 хоногийн өмнө мэдэгдсэнээр дурын хэмжээгээр түрээс нэмэгдүүлж болно гэж заасан. Хуулиар жилд нэгээс илүүгүй удаа, 10%-иас хэтрэхгүй байхыг заасан.",
    confidence: 89,
  },
  {
    id: 4,
    severity: "medium",
    clause: "9.4-р зүйл — Засвар үйлчилгээ",
    article: "Иргэний хуулийн 293-р зүйлийн 2 дахь хэсэг",
    explanation:
      "Бүх засвар үйлчилгээний зардлыг түрээслэгч хариуцна гэж заасан нь хуулиар эзэмшигчийн үүрэгт хамаарах томоохон засварыг давж байна.",
    confidence: 85,
  },
  {
    id: 5,
    severity: "low",
    clause: "6.2-р зүйл — Зочин байршуулах",
    article: "Иргэний хуулийн 287-р зүйлийн 4 дэх хэсэг",
    explanation:
      "Зочин 3 хоногоос илүү байршуулахыг хориглосон нь хэт хязгаарлалт боловч гэрчийн шаардлагатай болно.",
    confidence: 72,
  },
  {
    id: 6,
    severity: "info",
    clause: "3.1-р зүйл — Төлбөрийн нөхцөл",
    article: "—",
    explanation:
      "Төлбөрийг сарын 5-нд банкны шилжүүлгээр төлнө. Энэ нөхцөл стандарт бөгөөд тодорхой байна.",
    confidence: 99,
  },
];

const STRENGTHS = [
  {
    id: 1,
    clause: "4.1-р зүйл — Буцаан олголт",
    note: "Гэрээт хугацааны дотор цуцалвал 1 сарын барьцааг буцаана гэж тодорхой заасан.",
  },
  {
    id: 2,
    clause: "2.3-р зүйл — Орон сууцны байдал",
    note: "Гэрээ эхлэхийн өмнө орон сууцны актыг хамтран гаргана гэж заасан нь маргааны эрсдэлийг бууруулна.",
  },
];

const ALERTS: AlertItem[] = [
  {
    id: 1,
    type: "compliance",
    severity: "high",
    contractAddress: "Энхтайваны өргөн чөлөө 16А",
    title: "Хуулийн зөрчил илэрлээ",
    body: "Гэрээний 7.3-р зүйл Иргэний хуулийн 291-р зүйлийг зөрчиж байна. Эзэмшигчтэй яаралтай ярилцана уу.",
    date: "2024-07-12",
    read: false,
  },
  {
    id: 2,
    type: "expiry",
    severity: "medium",
    contractAddress: "Энхтайваны өргөн чөлөө 16А",
    title: "Гэрээ 30 хоногийн дотор дуусна",
    body: "Гэрээний хугацаа 2025 оны 1-р сарын 14-нд дуусна. Сунгах эсэхийг эзэмшигчтэй урьдчилан ярилцана уу.",
    date: "2024-12-15",
    read: false,
  },
  {
    id: 3,
    type: "compliance",
    severity: "medium",
    contractAddress: "Энхтайваны өргөн чөлөө 16А",
    title: "Барьцааны буцаалт тодорхойгүй",
    body: "5.1-р зүйлд барьцааг буцаах хугацааг заагаагүй. Хуулийн 295-р зүйлд заасан эрхийнхээ талаар эзэмшигчид мэдэгдэнэ үү.",
    date: "2024-07-12",
    read: true,
  },
  {
    id: 4,
    type: "compliance",
    severity: "high",
    contractAddress: "Их сургуулийн гудамж 9/12",
    title: "Аудит хийлгэх шаардлагатай",
    body: "Энэ гэрээний аудит хийгдээгүй байна. Зөрчил их байж болзошгүй тул нэн даруй шалгуулна уу.",
    date: "2024-06-01",
    read: true,
  },
  {
    id: 5,
    type: "expiry",
    severity: "low",
    contractAddress: "Наран гудамж 4Б/201",
    title: "Гэрээ 60 хоногийн дотор дуусна",
    body: "Гэрээний хугацаа 2025 оны 2-р сарын 28-нд дуусна.",
    date: "2024-12-30",
    read: true,
  },
];

// Fallback VMs (when no real contracts are passed) built from the dummy data.
const DUMMY_VMS: FigmaContractVM[] = CONTRACTS.map((c) => ({
  id: String(c.id),
  label: c.address,
  tenant: c.tenant,
  landlord: c.landlord,
  rent: c.rent,
  deposit: c.deposit,
  startDate: c.startDate,
  endDate: c.endDate,
  payDay: c.payDay,
  score: c.score,
  status: c.status,
  paid: c.paid,
  pages: c.pages,
  summary: null,
  findings: FINDINGS as FigmaFinding[],
  strengths: STRENGTHS.map((s) => `${s.clause}: ${s.note}`),
  expiry: null,
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("mn-MN") + "₮";
}

function fmtOrDash(n: number | null) {
  return n == null ? "—" : fmt(n);
}

function severityConfig(s: Severity) {
  switch (s) {
    case "high":
      return {
        label: "Өндөр эрсдэл",
        bg: "bg-red-50 dark:bg-red-950/40",
        border: "border-red-200 dark:border-red-800/60",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
        icon: <XCircle className="w-4 h-4 text-red-500" />,
        dot: "bg-red-500",
      };
    case "medium":
      return {
        label: "Дунд эрсдэл",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-800/50",
        badge:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        dot: "bg-amber-500",
      };
    case "low":
      return {
        label: "Бага эрсдэл",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800/50",
        badge:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
        icon: <Info className="w-4 h-4 text-blue-500" />,
        dot: "bg-blue-400",
      };
    case "info":
      return {
        label: "Мэдээлэл",
        bg: "bg-slate-50 dark:bg-slate-900/40",
        border: "border-slate-200 dark:border-slate-700/50",
        badge:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        icon: <Info className="w-4 h-4 text-slate-400" />,
        dot: "bg-slate-400",
      };
    case "ok":
      return {
        label: "Хэвийн",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        border: "border-emerald-200 dark:border-emerald-800/50",
        badge:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        dot: "bg-emerald-500",
      };
  }
}

function scoreColor(s: number) {
  if (s >= 75) return "#16a34a";
  if (s >= 50) return "#d97706";
  return "#dc2626";
}

function scoreLabel(s: number) {
  if (s >= 75) return "Нийцтэй";
  if (s >= 50) return "Анхаарал шаардлагатай";
  return "Өндөр эрсдэлтэй";
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={10}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ── FindingRow ────────────────────────────────────────────────────────────────

function FindingRow({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const cfg = severityConfig(f.severity);

  return (
    <div
      className={`rounded-xl border ${cfg.bg} ${cfg.border} overflow-hidden transition-all`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        <div className="mt-0.5 shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{f.clause}</p>
          <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        <div className="shrink-0 text-muted-foreground mt-0.5">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-inherit">
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <FileText className="w-3.5 h-3.5" />
              <span>{f.article}</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{f.explanation}</p>
            <div className="flex items-center gap-2 pt-1">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${f.confidence}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                AI найдвар: {f.confidence}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

function HomeScreen({
  onViewAudit,
  credits,
  userName,
  activeCount,
  averageCompliance,
  expiringSoon,
  recent,
}: {
  onViewAudit: (id?: string) => void;
  credits: number;
  userName: string | null;
  activeCount?: number;
  averageCompliance?: number | null;
  expiringSoon?: number;
  recent?: FigmaContractVM;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-5">
      {/* header — fixed dark banner in both themes so the light-on-dark pills
          stay legible (bg-primary would invert to light in dark mode) */}
      <div className="rounded-2xl bg-zinc-900 text-white px-5 py-5">
        <p className="text-sm font-medium opacity-70 mb-1">Сайн байна уу 👋</p>
        <h1 className="text-xl font-bold leading-tight capitalize">
          {userName ?? "Батболд"}
        </h1>
        <p className="text-sm opacity-70 mt-1">Таны гэрээнүүдийг хянаж байна.</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{credits} кредит</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/25 rounded-full px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-xs font-semibold text-emerald-200">Идэвхтэй</span>
          </div>
        </div>
      </div>

      {/* metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{activeCount ?? 2}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Идэвхтэй гэрээ</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          {averageCompliance === undefined ? (
            <p className="text-2xl font-bold" style={{ color: scoreColor(78) }}>78</p>
          ) : averageCompliance === null ? (
            <p className="text-2xl font-bold text-foreground">—</p>
          ) : (
            <p className="text-2xl font-bold" style={{ color: scoreColor(averageCompliance) }}>
              {averageCompliance}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Нийцлийн оноо</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{expiringSoon ?? 1}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Удахгүй дуусна</p>
        </div>
      </div>

      {/* upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onViewAudit(); }}
        className={`relative border-2 border-dashed rounded-2xl p-7 flex flex-col items-center gap-3 transition-all cursor-pointer
          ${dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-primary/3"
          }`}
        onClick={() => onViewAudit()}
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Upload className="w-7 h-7 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">PDF гэрээ оруулах</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Скан зураг ч мөн боломжтой (OCR)
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onViewAudit(); }}
          className="mt-1 flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          AI шинжилгээ хийх
        </button>
        <p className="text-xs text-muted-foreground">1 хуудас = 1 кредит</p>
      </div>

      {/* recent contract */}
      {recent && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Сүүлийн гэрээ</h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{recent.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Дуусах: {recent.endDate}</p>
              </div>
              {recent.score != null && (
                <div
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${scoreColor(recent.score)}1f`,
                    color: scoreColor(recent.score),
                  }}
                >
                  {recent.score} оноо
                </div>
              )}
            </div>
            <button
              onClick={() => onViewAudit(recent.id)}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-primary font-medium py-2 rounded-lg bg-primary/8 hover:bg-primary/12 transition-colors"
            >
              Дэлгэрэнгүй харах
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AuditScreen ───────────────────────────────────────────────────────────────

function AuditScreen({ contract }: { contract: FigmaContractVM }) {
  const [tab, setTab] = useState<"findings" | "strengths" | "meta">("findings");
  const findings = contract.findings;
  const strengths = contract.strengths;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const medCount = findings.filter((f) => f.severity === "medium").length;

  return (
    <div className="space-y-5">
      {/* score header */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Нийцлийн дүгнэлт
        </p>
        <div className="flex items-center gap-5">
          {contract.score != null ? (
            <ScoreRing score={contract.score} size={120} />
          ) : (
            <div className="flex size-[120px] shrink-0 items-center justify-center rounded-full border-[10px] border-muted text-2xl font-bold text-muted-foreground">
              —
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground leading-tight">
              {contract.score != null ? scoreLabel(contract.score) : "Аудит хийгдээгүй"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
              {contract.label}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="flex items-center gap-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium px-2.5 py-1 rounded-full">
                <XCircle className="w-3 h-3" />
                {highCount} өндөр
              </div>
              <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {medCount} дунд
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                {strengths.length} давуу тал
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {(["findings", "strengths", "meta"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t === "findings" ? "Анхааруулга" : t === "strengths" ? "Давуу тал" : "Мэдээлэл"}
          </button>
        ))}
      </div>

      {tab === "findings" && (
        <div className="space-y-2.5">
          {findings.length > 0 ? (
            findings.map((f) => <FindingRow key={f.id} f={f} />)
          ) : (
            <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              Анхааруулга илрээгүй.
            </p>
          )}
        </div>
      )}

      {tab === "strengths" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Таны эрхийг хамгаалсан зүйлүүд:
          </p>
          {strengths.length > 0 ? (
            strengths.map((s, i) => (
              <div
                key={i}
                className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 flex gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">{s}</p>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              Тэмдэглэхүйц давуу тал олдсонгүй.
            </p>
          )}
        </div>
      )}

      {tab === "meta" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {[
            { icon: <User className="w-4 h-4" />, label: "Түрээслэгч", value: contract.tenant },
            { icon: <Building2 className="w-4 h-4" />, label: "Эзэмшигч", value: contract.landlord },
            { icon: <Banknote className="w-4 h-4" />, label: "Сарын түрээс", value: fmtOrDash(contract.rent) },
            { icon: <CreditCard className="w-4 h-4" />, label: "Барьцаа", value: fmtOrDash(contract.deposit) },
            { icon: <Calendar className="w-4 h-4" />, label: "Эхлэх огноо", value: contract.startDate },
            { icon: <Calendar className="w-4 h-4" />, label: "Дуусах огноо", value: contract.endDate },
            { icon: <Clock className="w-4 h-4" />, label: "Төлбөрийн өдөр", value: contract.payDay != null ? `Сарын ${contract.payDay}-нд` : "—" },
          ].map((row, i, arr) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className="text-muted-foreground shrink-0">{row.icon}</span>
              <span className="text-sm text-muted-foreground w-28 shrink-0">{row.label}</span>
              <span className="text-sm font-medium text-foreground flex-1 text-right">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ContractsScreen ───────────────────────────────────────────────────────────

function ContractsScreen({
  contracts,
  credits,
  onViewAudit,
  onPayment,
}: {
  contracts: FigmaContractVM[];
  credits: number;
  onViewAudit: (id: string) => void;
  onPayment: () => void;
}) {
  const statusCfg = (s: FigmaContractVM["status"]) => {
    if (s === "compliant") return { label: "Нийцтэй", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40", dot: "bg-emerald-500" };
    if (s === "warning") return { label: "Анхаарах", color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40", dot: "bg-amber-500" };
    if (s === "pending") return { label: "Хүлээгдэж буй", color: "text-muted-foreground bg-muted", dot: "bg-muted-foreground" };
    return { label: "Эрсдэлтэй", color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40", dot: "bg-red-500" };
  };

  return (
    <div className="space-y-4">
      {/* credit balance */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Кредит үлдэгдэл</p>
            <p className="text-lg font-bold text-foreground">{credits}</p>
          </div>
        </div>
        <button
          onClick={onPayment}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Нэмэх
        </button>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground px-0.5">Бүх гэрээ ({contracts.length})</h2>

      {contracts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
          <FileText className="mx-auto w-8 h-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Гэрээ байхгүй байна</p>
          <p className="mt-1 text-xs text-muted-foreground">Нүүр хуудаснаас гэрээгээ оруулна уу.</p>
        </div>
      )}

      {contracts.map((c) => {
        const cfg = statusCfg(c.status);
        if (!c.paid) {
          return (
            <div key={c.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug truncate">{c.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Дуусах: {c.endDate}</p>
                  </div>
                  <div className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                </div>
                {/* lock overlay */}
                <div className="rounded-xl bg-muted border border-border p-4 flex flex-col items-center gap-2.5 text-center">
                  <Lock className="w-7 h-7 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Аудит хаалттай байна</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.pages != null
                        ? `Энэ гэрээнд ${c.pages} кредит шаардагдана`
                        : "Аудит хийлгэхэд кредит шаардлагатай"}
                    </p>
                  </div>
                  <button
                    onClick={onPayment}
                    className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    {c.pages != null ? `${c.pages} кредитээр нээх` : "Кредитээр нээх"}
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug truncate">{c.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Дуусах: {c.endDate}</p>
              </div>
              <div className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${c.score ?? 0}%`, backgroundColor: scoreColor(c.score ?? 0) }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: scoreColor(c.score ?? 0) }}>{c.score ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Сарын түрээс: <span className="font-semibold text-foreground">{fmtOrDash(c.rent)}</span></span>
              <span>Барьцаа: <span className="font-semibold text-foreground">{fmtOrDash(c.deposit)}</span></span>
            </div>
            <button
              onClick={() => onViewAudit(c.id)}
              className="w-full text-sm font-semibold text-primary py-2 rounded-xl bg-primary/8 hover:bg-primary/12 transition-colors flex items-center justify-center gap-2"
            >
              Аудит харах
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── AlertsScreen ──────────────────────────────────────────────────────────────

function AlertsScreen() {
  const [alerts, setAlerts] = useState(ALERTS);
  const unread = alerts.filter((a) => !a.read).length;

  const markRead = (id: number) =>
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Мэдэгдэл</h2>
          {unread > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{unread} уншаагүй байна</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={() => setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))}
            className="text-xs font-medium text-primary"
          >
            Бүгдийг уншсан
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {alerts.map((a) => {
          const cfg = severityConfig(a.severity);
          return (
            <div
              key={a.id}
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                a.read ? "bg-card border-border" : `${cfg.bg} ${cfg.border}`
              }`}
              onClick={() => markRead(a.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {a.title}
                    </p>
                    {!a.read && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.contractAddress}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{a.body}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {a.type === "compliance" ? "Хуулийн зөрчил" : "Гэрээ дуусах"}
                    </span>
                    <span className="text-xs text-muted-foreground">{a.date}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PaymentScreen ─────────────────────────────────────────────────────────────

function PaymentScreen({
  credits,
  onTopUp,
}: {
  credits: number;
  onTopUp: (n: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const packs = [
    { credits: 5, price: 5000, label: "Үндсэн" },
    { credits: 15, price: 12000, label: "Хэмнэлттэй", popular: true },
    { credits: 30, price: 20000, label: "Байнгын хэрэглэгч" },
  ];

  return (
    <div className="space-y-5">
      {/* balance card */}
      <div className="rounded-2xl bg-primary text-primary-foreground px-5 py-6">
        <p className="text-sm opacity-70 mb-1">Одоогийн үлдэгдэл</p>
        <div className="flex items-end gap-1">
          <span className="text-5xl font-bold">{credits}</span>
          <span className="text-lg opacity-70 mb-2">кредит</span>
        </div>
        <p className="text-xs opacity-60 mt-2">1 кредит = 1 гэрээний хуудас</p>
      </div>

      {/* how it works */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Хэрхэн ажилладаг вэ?</h3>
        {[
          { icon: <Upload className="w-4 h-4 text-primary" />, text: "PDF гэрээ оруулна" },
          { icon: <TrendingUp className="w-4 h-4 text-primary" />, text: "AI хуудас тус бүрийг шинжилнэ" },
          { icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, text: "Хуулийн зөрчлийг тайлагнана" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <p className="text-sm text-foreground">{s.text}</p>
          </div>
        ))}
      </div>

      {/* packs */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Кредит авах</h3>
        <div className="space-y-2.5">
          {packs.map((p) => (
            <button
              key={p.credits}
              onClick={() => setSelected(p.credits)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all ${
                selected === p.credits
                  ? "border-primary bg-primary/8"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected === p.credits ? "border-primary" : "border-muted-foreground"
                }`}>
                  {selected === p.credits && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{p.credits} кредит</span>
                    {p.popular && (
                      <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Алдартай
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{p.label}</span>
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">{fmt(p.price)}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => { if (selected) { onTopUp(selected); setSelected(null); } }}
        disabled={!selected}
        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
          selected
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        <CreditCard className="w-4 h-4" />
        {selected ? `${selected} кредит худалдан авах` : "Багцаа сонгоно уу"}
      </button>
    </div>
  );
}

// ── SettingsScreen ────────────────────────────────────────────────────────────

function SettingsScreen({
  dark,
  onToggleDark,
  userName,
  userEmail,
}: {
  dark: boolean;
  onToggleDark: () => void;
  userName: string | null;
  userEmail: string | null;
}) {
  const displayName = userName ?? "Батболд Дорж";
  return (
    <div className="space-y-5">
      {/* profile */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0 uppercase">
          {displayName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground capitalize">{displayName}</p>
          <p className="text-sm text-muted-foreground truncate">
            {userEmail ?? "batbold@example.mn"}
          </p>
          <span className="inline-block mt-1 text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
            Стандарт хэрэглэгч
          </span>
        </div>
      </div>

      {/* settings rows */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* dark mode toggle */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-3">
            {dark ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
            <span className="text-sm font-medium text-foreground">Харанхуй горим</span>
          </div>
          <button
            onClick={onToggleDark}
            className={`relative w-11 h-6 rounded-full transition-colors ${dark ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full border border-border bg-background shadow-sm transition-transform ${dark ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        {[
          { icon: <Bell className="size-4" />, label: "Мэдэгдэл тохиргоо" },
          { icon: <ShieldCheck className="size-4" />, label: "Нууцлал" },
          { icon: <FileText className="size-4" />, label: "Ашиглалтын нөхцөл" },
          { icon: <Info className="size-4" />, label: "Тусламж / Холбоо барих" },
        ].map((row, i, arr) => (
          <button
            key={i}
            className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors ${i < arr.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="flex items-center gap-3 text-muted-foreground">
              {row.icon}
              <span className="text-sm font-medium text-foreground">{row.label}</span>
            </div>
            <ChevronDown className="-rotate-90 w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button className="w-full flex items-center gap-3 px-4 py-3.5 text-destructive hover:bg-destructive/5 transition-colors">
          <XCircle className="size-4" />
          <span className="text-sm font-medium">Гарах</span>
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground pt-2">
        Rent Helper v1.0.0 · Монгол хуулийн нийцлийн систем
      </p>
    </div>
  );
}

// ── FigmaApp ──────────────────────────────────────────────────────────────────

export function FigmaApp({
  initialTab = "home",
  data,
}: {
  initialTab?: Tab;
  data?: FigmaData;
}) {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [screen, setScreen] = useState<Screen>(initialTab);
  const [credits, setCredits] = useState(data?.credits ?? 12);

  const contracts =
    data?.contracts && data.contracts.length > 0 ? data.contracts : DUMMY_VMS;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeContract =
    contracts.find((c) => c.id === selectedId) ?? contracts[0];
  const viewAudit = (id?: string) => {
    setSelectedId(id ?? contracts[0]?.id ?? null);
    setScreen("audit");
  };
  const unreadAlerts = ALERTS.filter((a) => !a.read).length;

  const navTo = (t: Tab) => {
    setTab(t);
    setScreen(t);
  };

  const tabItems: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: "home", icon: <Home className="w-5 h-5" />, label: "Нүүр" },
    { id: "contracts", icon: <FileText className="w-5 h-5" />, label: "Гэрээ" },
    { id: "alerts", icon: <Bell className="w-5 h-5" />, label: "Мэдэгдэл", badge: unreadAlerts },
    { id: "settings", icon: <Settings className="w-5 h-5" />, label: "Тохиргоо" },
  ];

  const screenTitle: Record<Screen, string> = {
    home: "Rent Helper",
    contracts: "Гэрээнүүд",
    alerts: "Мэдэгдэл",
    settings: "Тохиргоо",
    audit: "Аудит дүн",
    payment: "Кредит",
  };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="bg-background min-h-screen flex items-start justify-center">
        <div className="w-full max-w-[420px] min-h-screen flex flex-col relative">
          {/* status bar */}
          <div className="bg-background sticky top-0 z-30">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                {screen !== "home" && screen !== "contracts" && screen !== "alerts" && screen !== "settings" ? (
                  <button
                    onClick={() => { setScreen(tab); }}
                    className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center mr-1"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90 text-foreground" />
                  </button>
                ) : null}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <h1 className="text-base font-bold text-foreground">{screenTitle[screen]}</h1>
                </div>
              </div>
              <button
                onClick={() => setDark(!dark)}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* main content */}
          <div className="flex-1 overflow-y-auto px-4 py-5 pb-28">
            {screen === "home" && (
              <HomeScreen
                credits={credits}
                onViewAudit={viewAudit}
                userName={data?.userName ?? null}
                activeCount={data?.activeCount}
                averageCompliance={data?.averageCompliance}
                expiringSoon={data?.expiringSoon}
                recent={contracts[0]}
              />
            )}
            {screen === "contracts" && (
              <ContractsScreen
                contracts={contracts}
                credits={credits}
                onViewAudit={viewAudit}
                onPayment={() => setScreen("payment")}
              />
            )}
            {screen === "alerts" && <AlertsScreen />}
            {screen === "settings" && (
              <SettingsScreen
                dark={dark}
                onToggleDark={() => setDark(!dark)}
                userName={data?.userName ?? null}
                userEmail={data?.userEmail ?? null}
              />
            )}
            {screen === "audit" && <AuditScreen contract={activeContract} />}
            {screen === "payment" && (
              <PaymentScreen
                credits={credits}
                onTopUp={(n) => {
                  setCredits((c) => c + n);
                  setScreen(tab);
                }}
              />
            )}
          </div>

          {/* bottom tab nav */}
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-card/95 backdrop-blur-md border-t border-border z-30">
            <div className="flex">
              {tabItems.map((t) => {
                const active = tab === t.id && screen === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => navTo(t.id)}
                    className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative"
                  >
                    <span className={`transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {t.icon}
                    </span>
                    <span className={`text-xs font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {t.label}
                    </span>
                    {t.badge !== undefined && t.badge > 0 && (
                      <span className="absolute top-2 right-1/2 translate-x-3 size-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {t.badge}
                      </span>
                    )}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
