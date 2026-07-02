import type { Contract } from "./types/contract";

export const DEMO_CONTRACT_ID = "demo-ui-contract";

export function isDemoUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_UI === "true";
}

/** Static analyzed contract for UI development — no upload or AI required. */
export function getDemoContract(): Contract {
  const now = "2025-03-15T10:30:00.000Z";

  return {
    id: DEMO_CONTRACT_ID,
    user_id: null,
    file_name: "Түрээсийн_гэрээ_2024.pdf",
    file_url: "",
    storage_path: "",
    compliance_score: 72,
    status: "completed",
    start_date: "2024-09-01",
    end_date: "2025-09-01",
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
        startDate: "2024-09-01",
        endDate: "2025-09-01",
        paymentDay: 5,
      },
      strengths: [
        "Түрээслүүлэгч, түрээслэгчийн талууд тодорхойлогдсон",
        "Сарын түрээсийн дүн заасан",
      ],
      alerts: [
        {
          severity: "high",
          title: "Шудармаг бус цуцлах нөхцөл",
          description:
            "Хугацаанаас өмнө цуцлах торгууль Иргэний хуулийн хамгаалалттай зөрчилдөж болзошгүй. Мэдэгдэл өгөх хугацааг дахин шалгана уу.",
          lawName: "Иргэний хууль",
          articleReference: "295 дүгээр зүйл",
        },
        {
          severity: "medium",
          title: "Барьцааны нөхцөл тодорхой бус",
          description:
            "Барьцаа буцаан олгох хугацаа, нөхцөл тодорхой заагаагүй байна.",
          lawName: "Иргэний хууль",
          articleReference: "296 дүгээр зүйл",
        },
        {
          severity: "low",
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
