import type { Contract } from "./types/contract";

export const DEMO_CONTRACT_ID = "demo-ui-contract";

export function isDemoUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_UI === "true";
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Analyzed contract for UI development — no upload or AI required.
 *
 * Its dates are relative to today rather than fixed, so the deadline-driven
 * notifications (expiry countdown, notice deadline, payment day) actually fire
 * while working on them: a contract ending in a little over two weeks, whose
 * 14-day notice window closes in two days, with a payment day just ahead.
 */
export function getDemoContract(): Contract {
  const now = new Date().toISOString();
  const startDate = isoDate(-300);
  const endDate = isoDate(16);
  const paymentDay = ((new Date().getDate() + 1) % 28) + 1;

  return {
    id: DEMO_CONTRACT_ID,
    user_id: null,
    file_name: "Түрээсийн_гэрээ_2024.pdf",
    file_url: "",
    storage_path: "",
    compliance_score: 72,
    status: "completed",
    start_date: startDate,
    end_date: endDate,
    page_count: 6,
    created_at: now,
    updated_at: now,
    audit_summary: {
      summary:
        "Гэрээг Иргэний хуулийн үндсэн шаардлагатай харьцуулан шинжлэв. Цуцлах нөхцөл болон барьцааны заалтуудад анхаарах шаардлагатай.",
      demoMode: true,
      metadata: {
        tenantName: "Болд",
        landlordName: "Дорж",
        monthlyRent: 1500000,
        deposit: 3000000,
        startDate,
        endDate,
        paymentDay,
        noticePeriodDays: 14,
      },
      strengths: [
        "Түрээслүүлэгч, түрээслэгчийн талууд тодорхойлогдсон",
        "Сарын түрээсийн дүн заасан",
      ],
      alerts: [
        {
          severity: "high",
          confidence: "high",
          title: "Шудармаг бус цуцлах нөхцөл",
          description:
            "Хугацаанаас өмнө цуцлах торгууль Иргэний хуулийн хамгаалалттай зөрчилдөж болзошгүй. Мэдэгдэл өгөх хугацааг дахин шалгана уу.",
          lawName: "Иргэний хууль",
          articleReference: "295 дүгээр зүйл",
        },
        {
          severity: "medium",
          confidence: "medium",
          title: "Барьцааны нөхцөл тодорхой бус",
          description:
            "Барьцаа буцаан олгох хугацаа, нөхцөл тодорхой заагаагүй байна.",
          lawName: "Иргэний хууль",
          articleReference: "296 дүгээр зүйл",
        },
        {
          severity: "low",
          confidence: "low",
          title: "Засвар үйлчилгээний хариуцлага",
          description:
            "Жижиг засварын зардлыг хэн хариуцах талаар илүү тодорхой заалт нэмэхийг зөвлөж байна.",
          lawName: "Иргэний хууль",
          articleReference: "298 дүгээр зүйл",
        },
      ],
    },
  };
}
