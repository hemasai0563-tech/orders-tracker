/**
 * Google Apps Script for Retail Bill & Delivery Tracker
 * Deploy as Web App with Access: "Anyone"
 */

const SHEET_NAME = "Bills";

function setupSheetHeaders(sheet) {
  var headers = [
    "Invoice No",
    "Flat No",
    "Bill Amount",
    "Billed Date",
    "Delivery Agent",
    "Delivery Status",
    "Delivered Date",
    "Payment Status",
    "Amount Received",
    "Balance",
    "Payment Mode",
    "Days Pending",
    "Remarks",
    "Last Updated"
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
}

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  setupSheetHeaders(sheet);
  return sheet;
}

// GET API: Returns all bills
function doGet(e) {
  try {
    var sheet = getOrCreateSheet();
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return jsonResponse({ status: "success", count: 0, bills: [] });
    }

    var bills = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;

      var bill = {
        invoiceNo: String(row[0]),
        flatNo: String(row[1]),
        billAmount: Number(row[2]) || 0,
        billedDate: formatDate(row[3]),
        deliveryAgent: String(row[4] || "Unassigned"),
        deliveryStatus: String(row[5] || "Pending"),
        deliveredDate: row[6] ? formatDate(row[6]) : "",
        paymentStatus: String(row[7] || "Unpaid"),
        amountReceived: Number(row[8]) || 0,
        balance: Number(row[9]) || (Number(row[2]) - Number(row[8])),
        paymentMode: String(row[10] || "UNPAID"),
        daysPending: Number(row[11]) || 0,
        remarks: String(row[12] || ""),
        lastUpdated: row[13] ? String(row[13]) : new Date().toISOString()
      };
      bills.push(bill);
    }

    return jsonResponse({ status: "success", count: bills.length, bills: bills });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

// POST API: Handles Add, Update, or Full Bulk Sync
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action || "sync_all";
    var sheet = getOrCreateSheet();

    if (action === "sync_all" && Array.isArray(requestData.bills)) {
      sheet.clearContents();
      setupSheetHeaders(sheet);

      var rows = requestData.bills.map(function(b) {
        return [
          b.invoiceNo,
          b.flatNo,
          Number(b.billAmount) || 0,
          b.billedDate,
          b.deliveryAgent || "Unassigned",
          b.deliveryStatus || "Pending",
          b.deliveredDate || "",
          b.paymentStatus || "Unpaid",
          Number(b.amountReceived) || 0,
          Number(b.balance) || 0,
          b.paymentMode || "UNPAID",
          Number(b.daysPending) || 0,
          b.remarks || "",
          new Date().toISOString()
        ];
      });

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 14).setValues(rows);
      }
      return jsonResponse({ status: "success", message: "Synced " + rows.length + " bills successfully." });
    }

    if (action === "upsert_bill" && requestData.bill) {
      var b = requestData.bill;
      var data = sheet.getDataRange().getValues();
      var foundRow = -1;

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(b.invoiceNo)) {
          foundRow = i + 1;
          break;
        }
      }

      var rowValues = [
        b.invoiceNo,
        b.flatNo,
        Number(b.billAmount) || 0,
        b.billedDate,
        b.deliveryAgent || "Unassigned",
        b.deliveryStatus || "Pending",
        b.deliveredDate || "",
        b.paymentStatus || "Unpaid",
        Number(b.amountReceived) || 0,
        Number(b.balance) || 0,
        b.paymentMode || "UNPAID",
        Number(b.daysPending) || 0,
        b.remarks || "",
        new Date().toISOString()
      ];

      if (foundRow > 0) {
        sheet.getRange(foundRow, 1, 1, 14).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
      return jsonResponse({ status: "success", message: "Bill " + b.invoiceNo + " saved to Google Sheets." });
    }

    if (action === "delete_bill" && requestData.invoiceNo) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(requestData.invoiceNo)) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ status: "success", message: "Bill deleted." });
        }
      }
      return jsonResponse({ status: "error", message: "Bill not found." });
    }

    return jsonResponse({ status: "error", message: "Unknown action." });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

function formatDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(dateVal).substring(0, 10);
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
