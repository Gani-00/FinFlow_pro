import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  TransactionReportItem,
  CategorySummaryItem,
  MonthlyOverviewItem,
  FinancialInsightItem,
  formatIndianCurrency,
} from "../hooks/useReportCalculations";

export { formatIndianCurrency };
export type { TransactionReportItem };

interface ExportReportData {
  transactions: TransactionReportItem[];
  dateFilterLabel: string;
  totals: {
    income: number;
    expense: number;
    net: number;
    savings: number;
    savingsRate: string | null;
  };
  categories: CategorySummaryItem[];
  monthlyData: MonthlyOverviewItem[];
  insights: FinancialInsightItem[];
}

/**
 * Universal file saver with standard web fallback and Capacitor compatibility.
 */
function downloadFile(blob: Blob, filename: string) {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error("Download failed:", err);
  }
}

/**
 * Export CSV with UTF-8 BOM, Date, Type, Category, Description, Raw Amount, and Category Summary.
 */
export function exportToCSV(data: ExportReportData) {
  const { transactions, dateFilterLabel, totals, categories } = data;

  // UTF-8 BOM prefix (\uFEFF) ensures Excel and Android spreadsheet apps display Indian Rupee symbols and accents correctly
  const BOM = "\uFEFF";

  const summarySection = [
    ["FinFlow Pro Financial Statement"],
    [`Period: ${dateFilterLabel}`],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    [],
    ["Executive Summary"],
    ["Total Income", totals.income.toFixed(2)],
    ["Total Expenses", totals.expense.toFixed(2)],
    ["Remaining Balance", totals.net.toFixed(2)],
    ["Net Savings", totals.savings.toFixed(2)],
    ["Savings Rate", totals.savingsRate ? `${totals.savingsRate}%` : "—"],
    [],
    ["Category Spending Summary"],
    ["Category", "Amount", "Share (%)"],
    ...categories.map((c) => [c.name, c.amount.toFixed(2), `${c.percentage.toFixed(1)}%`]),
    [],
    ["Transaction Ledger"],
    ["Date", "Type", "Category", "Description", "Amount"],
  ];

  const transactionRows = transactions.map((t) => [
    t.date.toISOString().split("T")[0],
    t.type.toUpperCase(),
    `"${(t.category || "General").replace(/"/g, '""')}"`,
    `"${(t.name || "Untitled").replace(/"/g, '""')}"`,
    t.type === "expense" ? (-t.amount).toFixed(2) : t.amount.toFixed(2),
  ]);

  const allRows = [...summarySection, ...transactionRows];
  const csvContent = BOM + allRows.map((r) => r.join(",")).join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadFile(blob, `FinFlow_Pro_Report_${Date.now()}.csv`);
}

/**
 * Export PDF containing Executive Summary, Category Breakdown, Monthly Overview, Insights & Ledger.
 */
export function exportToPDF(data: ExportReportData) {
  const { transactions, dateFilterLabel, totals, categories, monthlyData, insights } = data;
  const doc = new jsPDF();

  // 1. Header Banner
  doc.setFillColor(37, 99, 235); // Blue primary #2563EB
  doc.rect(0, 0, 210, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FinFlow Pro", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Reports & Analytics  |  Period: ${dateFilterLabel}`, 14, 28);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 140, 28);

  // 2. Executive Summary
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 14, 48);

  autoTable(doc, {
    startY: 52,
    head: [["Total Income", "Total Expenses", "Remaining Balance", "Net Savings", "Savings Rate"]],
    body: [
      [
        formatIndianCurrency(totals.income),
        formatIndianCurrency(totals.expense),
        formatIndianCurrency(totals.net),
        formatIndianCurrency(totals.savings),
        totals.savingsRate ? `${totals.savingsRate}%` : "—",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [238, 242, 255], textColor: [67, 56, 202], fontStyle: "bold" },
    bodyStyles: { textColor: [30, 41, 59], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });

  // 3. Category Spending Breakdown Table
  let currentY = (doc as any).lastAutoTable?.finalY || 70;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Category-wise Spending", 14, currentY + 12);

  const catRows = categories.map((c) => [
    c.name,
    formatIndianCurrency(c.amount),
    `${c.percentage.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: currentY + 16,
    head: [["Category", "Spending Amount", "Percentage Share"]],
    body: catRows.length > 0 ? catRows : [["No expense categories recorded", "₹0.00", "0%"]],
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
  });

  // 4. Monthly Financial Trend Table
  currentY = (doc as any).lastAutoTable?.finalY || 130;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Monthly Financial Overview", 14, currentY + 12);

  const monthRows = monthlyData.map((m) => [
    m.monthFull,
    formatIndianCurrency(m.income),
    formatIndianCurrency(m.expense),
    formatIndianCurrency(m.net),
  ]);

  autoTable(doc, {
    startY: currentY + 16,
    head: [["Month", "Total Income", "Total Expenses", "Net Savings"]],
    body: monthRows,
    theme: "grid",
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 },
  });

  // 5. Key Financial Insights
  currentY = (doc as any).lastAutoTable?.finalY || 180;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Insights", 14, currentY + 12);

  const insightRows = insights.map((ins) => [ins.title, ins.value, ins.description]);

  autoTable(doc, {
    startY: currentY + 16,
    head: [["Insight", "Metric", "Observation"]],
    body: insightRows.length > 0 ? insightRows : [["No insights available", "—", "Add more transactions"]],
    theme: "striped",
    headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
      1: { cellWidth: 45 },
      2: { cellWidth: 90 },
    },
    margin: { left: 14, right: 14 },
  });

  // 6. Transaction Records (New page)
  doc.addPage();
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Transaction Records", 14, 20);

  const txRows = transactions.slice(0, 75).map((t) => [
    t.date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }),
    t.type.toUpperCase(),
    t.category || "General",
    t.name || "Untitled",
    `${t.type === "expense" ? "-" : "+"}${formatIndianCurrency(t.amount)}`,
  ]);

  autoTable(doc, {
    startY: 26,
    head: [["Date", "Type", "Category", "Description", "Amount"]],
    body: txRows,
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 22 },
      2: { cellWidth: 35 },
      3: { cellWidth: 55 },
      4: { cellWidth: 42, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`FinFlow_Pro_Report_${Date.now()}.pdf`);
}
