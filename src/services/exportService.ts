import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export async function exportToExcel(transactions: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Transactions");

  worksheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Description", key: "name", width: 30 },
    { header: "Category", key: "category", width: 15 },
    { header: "Type", key: "type", width: 10 },
    { header: "Amount (₹)", key: "amount", width: 15 },
  ];

  transactions.forEach((tx) => {
    worksheet.addRow({
      date: new Date(tx.date).toLocaleDateString(),
      name: tx.name,
      category: tx.category,
      type: tx.type,
      amount: tx.amount,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FinFlow_Transactions_${new Date().toLocaleDateString()}.xlsx`;
  link.click();
}

export function exportToPDF(transactions: any[]) {
  const doc = new jsPDF() as any;
  doc.text("FinFlow Pro - Transaction Report", 14, 15);
  
  const tableColumn = ["Date", "Description", "Category", "Type", "Amount (₹)"];
  const tableRows: any[] = [];

  transactions.forEach(tx => {
    const rowData = [
      new Date(tx.date).toLocaleDateString(),
      tx.name,
      tx.category,
      tx.type,
      tx.amount.toLocaleString()
    ];
    tableRows.push(rowData);
  });

  doc.autoTable(tableColumn, tableRows, { startY: 20 });
  doc.save(`FinFlow_Report_${new Date().toLocaleDateString()}.pdf`);
}
