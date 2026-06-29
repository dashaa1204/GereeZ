import type {
  FigmaAlertVM,
  FigmaContractVM,
  FigmaFinding,
} from "@/lib/figma-data";

// Prototype fallback data. Used by the screens only when no real data is
// available (e.g. an account with no contracts), matching the original
// Figma prototype's appearance.

interface DummyContract {
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

const CONTRACTS: DummyContract[] = [
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

const FINDINGS: FigmaFinding[] = [
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

export const DUMMY_ALERTS: FigmaAlertVM[] = [
  {
    id: "1",
    type: "compliance",
    severity: "high",
    contractName: "Энхтайваны өргөн чөлөө 16А",
    title: "Хуулийн зөрчил илэрлээ",
    body: "Гэрээний 7.3-р зүйл Иргэний хуулийн 291-р зүйлийг зөрчиж байна. Эзэмшигчтэй яаралтай ярилцана уу.",
    date: "2024-07-12",
    read: false,
  },
  {
    id: "2",
    type: "expiry",
    severity: "medium",
    contractName: "Энхтайваны өргөн чөлөө 16А",
    title: "Гэрээ 30 хоногийн дотор дуусна",
    body: "Гэрээний хугацаа 2025 оны 1-р сарын 14-нд дуусна. Сунгах эсэхийг эзэмшигчтэй урьдчилан ярилцана уу.",
    date: "2024-12-15",
    read: false,
  },
  {
    id: "3",
    type: "compliance",
    severity: "medium",
    contractName: "Энхтайваны өргөн чөлөө 16А",
    title: "Барьцааны буцаалт тодорхойгүй",
    body: "5.1-р зүйлд барьцааг буцаах хугацааг заагаагүй. Хуулийн 295-р зүйлд заасан эрхийнхээ талаар эзэмшигчид мэдэгдэнэ үү.",
    date: "2024-07-12",
    read: true,
  },
  {
    id: "4",
    type: "compliance",
    severity: "high",
    contractName: "Их сургуулийн гудамж 9/12",
    title: "Аудит хийлгэх шаардлагатай",
    body: "Энэ гэрээний аудит хийгдээгүй байна. Зөрчил их байж болзошгүй тул нэн даруй шалгуулна уу.",
    date: "2024-06-01",
    read: true,
  },
  {
    id: "5",
    type: "expiry",
    severity: "low",
    contractName: "Наран гудамж 4Б/201",
    title: "Гэрээ 60 хоногийн дотор дуусна",
    body: "Гэрээний хугацаа 2025 оны 2-р сарын 28-нд дуусна.",
    date: "2024-12-30",
    read: true,
  },
];

// Fallback VMs (when no real contracts are passed) built from the dummy data.
export const DUMMY_VMS: FigmaContractVM[] = CONTRACTS.map((c) => ({
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
  findings: FINDINGS,
  strengths: STRENGTHS.map((s) => `${s.clause}: ${s.note}`),
  expiry: null,
}));
