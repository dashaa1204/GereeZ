/**
 * Create (or refresh) the shared demo account so anyone opening the app's demo
 * link lands on a dashboard with real-looking contracts instead of an empty
 * state. Idempotent: re-running replaces the seeded contracts and tops the
 * credit balance back up, leaving the user id — and therefore anyone's live
 * session — intact.
 *
 *   npm run seed:demo
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY, DEMO_USER_EMAIL and DEMO_USER_PASSWORD in
 * .env.local. Dates are generated relative to today so the "expiring soon"
 * counter keeps working months from now.
 */
import { createClient } from "@supabase/supabase-js";
import { DEMO_USER_NAME } from "../lib/demo-user";
import type { AuditSummary } from "../lib/types/contract";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = process.env.DEMO_USER_EMAIL?.trim();
const password = process.env.DEMO_USER_PASSWORD?.trim();

if (!url || !serviceKey) throw new Error("Missing Supabase env vars");
if (!email || !password) {
  throw new Error("Missing DEMO_USER_EMAIL / DEMO_USER_PASSWORD");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** ISO date `days` from today (negative = past). */
function day(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface SeedContract {
  file_name: string;
  compliance_score: number | null;
  status: "completed" | "pending";
  start_date: string;
  end_date: string;
  page_count: number;
  audit_summary: AuditSummary | null;
}

const contracts: SeedContract[] = [
  {
    file_name: "Орон сууц түрээслэх гэрээ — Сүхбаатар дүүрэг.pdf",
    compliance_score: 72,
    status: "completed",
    start_date: day(-345),
    end_date: day(21), // inside the 30-day "expiring soon" window
    page_count: 6,
    audit_summary: {
      summary:
        "Гэрээг Иргэний хуулийн холбогдох заалтуудтай харьцуулан шинжлэв. Барьцаа буцаах болон гэрээ цуцлах нөхцөлд анхаарал шаардлагатай.",
      contractType: "rental",
      metadata: {
        tenantName: "Б. Дорж",
        landlordName: "Г. Сараа",
        monthlyRent: 1_200_000,
        deposit: 2_400_000,
        startDate: day(-345),
        endDate: day(21),
        paymentDay: 5,
        contractTitle: "Түрээсийн гэрээ",
        tenantLabel: "Түрээслэгч",
        landlordLabel: "Түрээслүүлэгч",
        paymentLabel: "Сарын түрээс",
      },
      strengths: [
        "Түрээсийн төлбөрийн хэмжээ, төлөх өдөр тодорхой заагдсан.",
        "Талуудын нэр, регистр, хаяг бүрэн бичигдсэн.",
        "Гэрээний хугацаа эхлэх, дуусах огноогоор тодорхойлогдсон.",
      ],
      alerts: [
        {
          severity: "high",
          confidence: "high",
          title: "Барьцаа буцаан олгохгүй байх нөхцөл",
          description:
            "Гэрээний 4.2-т түрээслэгч хугацаанаас өмнө гарвал барьцааг бүрэн хураана гэж заасан нь Иргэний хуулийн барьцааны зохицуулалттай зөрчилдөж байна. Барьцааг зөвхөн бодит хохирлын хэмжээгээр суутгах ёстой.",
          contractClause: "4.2-р заалт",
          lawName: "Иргэний хууль",
          articleReference: "296 дүгээр зүйл",
        },
        {
          severity: "medium",
          confidence: "medium",
          title: "Гэрээ цуцлах мэдэгдлийн хугацаа хэт богино",
          description:
            "Түрээслүүлэгч 3 хоногийн мэдэгдлээр гэрээг цуцлах эрхтэй гэсэн заалт нь түрээслэгчийн эрхийг үндэслэлгүй хязгаарлаж байна. Талуудад тэнцүү, боломжийн хугацаа тогтоохыг зөвлөж байна.",
          contractClause: "7.1-р заалт",
          lawName: "Иргэний хууль",
          articleReference: "320 дугаар зүйл",
        },
        {
          severity: "low",
          confidence: "medium",
          title: "Засвар үйлчилгээний хариуцлага тодорхойгүй",
          description:
            "Жижиг засвар, элэгдлийн зардлыг аль тал хариуцахыг гэрээнд заагаагүй тул маргаан үүсэх эрсдэлтэй.",
          contractClause: "Заалт байхгүй",
          lawName: "Иргэний хууль",
          articleReference: "298 дугаар зүйл",
        },
      ],
    },
  },
  {
    file_name: "Хөдөлмөрийн гэрээ — Программ хөгжүүлэгч.pdf",
    compliance_score: 88,
    status: "completed",
    start_date: day(-120),
    end_date: day(245),
    page_count: 4,
    audit_summary: {
      summary:
        "Хөдөлмөрийн тухай хуультай харьцуулахад гэрээ ерөнхийдөө нийцэж байна. Илүү цагийн зохицуулалтад нэмэлт тодруулга шаардлагатай.",
      contractType: "employment",
      metadata: {
        tenantName: "Ц. Ариунаа",
        landlordName: "Гэрээз ХХК",
        monthlyRent: 3_500_000,
        deposit: null,
        startDate: day(-120),
        endDate: day(245),
        paymentDay: 10,
        contractTitle: "Хөдөлмөрийн гэрээ",
        tenantLabel: "Ажилтан",
        landlordLabel: "Ажил олгогч",
        paymentLabel: "Сарын цалин",
      },
      strengths: [
        "Албан тушаал, ажлын байрны тодорхойлолт тодорхой заагдсан.",
        "Цалин, олговрын хэмжээ, олгох өдөр тусгагдсан.",
        "Ээлжийн амралтын хугацаа хуулийн шаардлагад нийцсэн.",
        "Нийгмийн даатгалын шимтгэлийн зохицуулалт орсон.",
      ],
      alerts: [
        {
          severity: "medium",
          confidence: "high",
          title: "Илүү цагийн хөлсийг тооцох журам заагаагүй",
          description:
            "Илүү цагаар ажилласны нэмэгдэл хөлсийг хэрхэн тооцохыг гэрээнд тусгаагүй байна. Хөдөлмөрийн тухай хуулиар илүү цагийн хөлсийг нэмэгдүүлж олгох үүрэгтэй.",
          contractClause: "5.3-р заалт",
          lawName: "Хөдөлмөрийн тухай хууль",
          articleReference: "109 дүгээр зүйл",
        },
      ],
    },
  },
  {
    file_name: "Хамтран ажиллах гэрээ — Түншлэл 2025.pdf",
    compliance_score: 46,
    status: "completed",
    start_date: day(-60),
    end_date: day(305),
    page_count: 8,
    audit_summary: {
      summary:
        "Гэрээнд хариуцлагын хуваарилалт нэг талд давуу байдал үүсгэсэн, маргаан шийдвэрлэх журам тодорхойгүй байна. Гарын үсэг зурахаас өмнө засварлахыг зөвлөж байна.",
      contractType: "rental",
      metadata: {
        tenantName: "Оргил Трейд ХХК",
        landlordName: "Батсайхан ХХК",
        monthlyRent: 8_000_000,
        deposit: 4_000_000,
        startDate: day(-60),
        endDate: day(305),
        paymentDay: 25,
        contractTitle: "Хамтран ажиллах гэрээ",
        tenantLabel: "Хамтрагч тал",
        landlordLabel: "Захиалагч",
        paymentLabel: "Гэрээний үнэ",
      },
      strengths: ["Талуудын гүйцэтгэх ажлын хүрээ жагсаалтаар тодорхойлогдсон."],
      alerts: [
        {
          severity: "high",
          confidence: "high",
          title: "Хариуцлагыг бүрэн чөлөөлсөн заалт",
          description:
            "Захиалагч тал ямар ч тохиолдолд хариуцлага хүлээхгүй гэсэн заалт нь хууль зөрчсөн. Санаатай болон илт хайхрамжгүй үйлдлээс үүсэх хариуцлагыг гэрээгээр чөлөөлөх боломжгүй.",
          contractClause: "9.4-р заалт",
          lawName: "Иргэний хууль",
          articleReference: "227 дугаар зүйл",
        },
        {
          severity: "high",
          confidence: "medium",
          title: "Нэг талын санаачилгаар нөхцөл өөрчлөх эрх",
          description:
            "Захиалагч гэрээний үнэ, нөхцөлийг нэг талын санаачилгаар өөрчилж болно гэсэн заалт нь гэрээний тэнцвэрийг алдагдуулж байна.",
          contractClause: "3.6-р заалт",
          lawName: "Иргэний хууль",
          articleReference: "198 дугаар зүйл",
        },
        {
          severity: "medium",
          confidence: "medium",
          title: "Маргаан шийдвэрлэх журам тодорхойгүй",
          description:
            "Маргааныг шүүх эсвэл арбитраар шийдвэрлэхийг заагаагүй тул маргаан үүсэх үед харьяалал тодорхойгүй болно.",
          contractClause: "11-р бүлэг",
          lawName: "Иргэний хууль",
          articleReference: "391 дүгээр зүйл",
        },
      ],
    },
  },
  {
    // Left un-audited on purpose: shows the locked card and the credit gate.
    file_name: "Зээлийн гэрээ — Банк 2025.pdf",
    compliance_score: null,
    status: "pending",
    start_date: day(-10),
    end_date: day(720),
    page_count: 5,
    audit_summary: null,
  },
];

async function findOrCreateUser(): Promise<string> {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw new Error(`listUsers failed: ${listError.message}`);

  const existing = list.users.find(
    (u) => u.email?.toLowerCase() === email!.toLowerCase(),
  );

  if (existing) {
    // Keep the password and display name in sync with the env on every run.
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { full_name: DEMO_USER_NAME },
    });
    if (error) throw new Error(`updateUser failed: ${error.message}`);
    console.log(`demo user exists → ${existing.id}`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: DEMO_USER_NAME },
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message ?? "no user"}`);
  }
  console.log(`demo user created → ${data.user.id}`);
  return data.user.id;
}

async function seed() {
  const userId = await findOrCreateUser();

  const { error: clearError } = await supabase
    .from("contracts")
    .delete()
    .eq("user_id", userId);
  if (clearError) throw new Error(`clear contracts failed: ${clearError.message}`);

  const rows = contracts.map((c) => ({
    ...c,
    user_id: userId,
    file_url: null,
    storage_path: "", // seeded rows have no stored PDF
  }));

  const { error: insertError } = await supabase.from("contracts").insert(rows);
  if (insertError) throw new Error(`insert failed: ${insertError.message}`);
  console.log(`seeded ${rows.length} contracts`);

  const { error: creditError } = await supabase
    .from("user_credits")
    .upsert({ user_id: userId, balance: 25 }, { onConflict: "user_id" });
  if (creditError) throw new Error(`credits failed: ${creditError.message}`);
  console.log("credit balance set to 25");

  // Fresh alerts: drop any read marks so the badge shows on the next visit.
  const { error: readError } = await supabase
    .from("alert_reads")
    .delete()
    .eq("user_id", userId);
  if (readError) console.warn(`alert_reads cleanup: ${readError.message}`);

  console.log(`\ndone — sign in at /demo as ${email}`);
}

seed().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
