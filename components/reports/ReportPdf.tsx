import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Server-only: never import this in a client component.
// Liquidation Report layout (context/Design/liquidation-report-sample-v2.md),
// using the supported CSS subset from context/library-docs.md — no
// backgroundColor, borderTopWidth only for rules.

export type ReportPdfEntry = {
  description: string;
  date: string | null;
  documentType: string | null;
  documentNumber: string | null;
  amount: number;
};

export type ReportPdfSignatory = {
  position: string;
  fullName: string;
  sortOrder: number;
};

type ReportPdfProps = {
  departmentName: string;
  departmentCode: string;
  eventName: string;
  fsDocumentNumber: string;
  generatedDate: string;
  entries: ReportPdfEntry[];
  budgetTotal: number;
  totalSpent: number;
  signatories: ReportPdfSignatory[];
};

const OVERSPEND_RED = "#b91c1c"; // react-pdf literal; UI tokens don't apply here

const styles = StyleSheet.create({
  page: { padding: 44, fontFamily: "Times-Roman", fontSize: 10, lineHeight: 1.4 },
  rule: { borderTopWidth: 1, marginVertical: 8 },
  letterhead: { alignItems: "center" },
  college: { fontSize: 15, fontWeight: "bold" },
  division: { fontSize: 9, marginTop: 2 },
  title: { fontSize: 13, fontWeight: "bold", textAlign: "center", marginVertical: 6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  fieldLine: { fontSize: 10, marginTop: 3 },
  fieldLabel: { fontWeight: "bold" },
  fieldValue: {},
  fieldLineSplit: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  // ── Expense table ──
  tableHeader: { flexDirection: "row", borderTopWidth: 1, paddingTop: 4, marginTop: 10 },
  th: { fontSize: 8.5, fontWeight: "bold", flex: 3 },
  thNum: { fontSize: 8.5, fontWeight: "bold", flex: 1.6, textAlign: "right" },
  row: { flexDirection: "row", borderTopWidth: 0.75, paddingTop: 3, marginTop: 3 },
  cell: { fontSize: 9, flex: 3 },
  cellSub: { fontSize: 7.5, marginTop: 1, color: "#6b7280" },
  cellNum: { fontSize: 9, flex: 1.6, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    paddingTop: 4,
    marginTop: 4,
    fontSize: 9.5,
    fontWeight: "bold",
  },
  totalCell: { flex: 3 },
  totalCellNum: { flex: 1.6, textAlign: "right" },
  note: { fontSize: 7.5, marginTop: 6 },
  // ── Returned amount block ──
  returnedBlock: { marginTop: 8 },
  returnedNote: { fontSize: 8.5 },
  // ── Signatories — max 3 per row; overflow wraps to the next row ──
  signatories: { flexDirection: "row", flexWrap: "wrap", marginTop: 14 },
  signatoryCol: { width: "33.33%", alignItems: "center", marginBottom: 12 },
  signatoryLine: { width: 150, borderTopWidth: 1, height: 6 },
  signatoryName: { fontSize: 11, fontWeight: "bold", marginTop: 2 },
  signatoryPosition: { fontSize: 8.5, marginTop: 1, color: "#6b7280" },
  remarksLabel: { fontSize: 9.5, fontWeight: "bold", marginTop: 10 },
  remarksBody: { fontSize: 9, marginTop: 3 },
  accountCode: { fontSize: 9.5, fontWeight: "bold", marginTop: 10 },
  footer: {
    fontSize: 7.5,
    textAlign: "center",
    marginTop: 16,
  },
});

function formatAmount(value: number): string {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPeso(value: number): string {
  return `₱ ${formatAmount(value)}`;
}

/** Budget − Actual, shown as ₱ (x) in red when overspent. */
function formatVariance(value: number): { text: string; overspent: boolean } {
  return value < 0
    ? { text: `₱ (${formatAmount(Math.abs(value))})`, overspent: true }
    : { text: `₱ ${formatAmount(value)}`, overspent: false };
}

export function ReportPdf({
  departmentName,
  departmentCode,
  eventName,
  fsDocumentNumber,
  generatedDate,
  entries,
  budgetTotal,
  totalSpent,
  signatories,
}: ReportPdfProps) {
  const remaining = budgetTotal - totalSpent;
  const variance = formatVariance(remaining);
  const orderedSignatories = [...signatories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>LIQUIDATION REPORT</Text>
        <View style={styles.rule} />

        <View style={styles.metaRow}>
          <Text>
            <Text style={styles.fieldLabel}>No.: </Text>
            {fsDocumentNumber}
          </Text>
          <Text>
            <Text style={styles.fieldLabel}>Date: </Text>
            {generatedDate}
          </Text>
        </View>

        {/* Event / budget details */}
        <Text style={styles.fieldLine}>
          <Text style={styles.fieldLabel}>DOMAIN: </Text>
          {departmentName} ({departmentCode})
        </Text>
        <Text style={styles.fieldLine}>
          <Text style={styles.fieldLabel}>Project Name/Activity of Project: </Text>
          {eventName}
        </Text>
        <Text style={styles.fieldLine}>
          <Text style={styles.fieldLabel}>College/Dept.: </Text>
          {departmentName}
        </Text>
        <Text style={styles.fieldLine}>
          <Text style={styles.fieldLabel}>APPROVED BUDGET PER CV No.: </Text>
          N/A
          <Text style={styles.fieldLabel}>    AMOUNT: </Text>
          {formatPeso(budgetTotal)}
        </Text>
        <Text style={styles.fieldLine}>
          <Text style={styles.fieldLabel}>Date of CV: </Text>
          N/A
        </Text>
        <View style={styles.rule} />

        {/* Expense Accounts/Items */}
        <View style={styles.tableHeader}>
          <Text style={styles.th}>Expense Accounts/Items</Text>
          <Text style={styles.thNum}>Approved Budget</Text>
          <Text style={styles.thNum}>Actual Expenses</Text>
          <Text style={styles.thNum}>Variance</Text>
        </View>

        {entries.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.cell}>No deducted expenses yet.</Text>
            <Text style={styles.cellNum}>—</Text>
            <Text style={styles.cellNum}>—</Text>
            <Text style={styles.cellNum}>—</Text>
          </View>
        ) : (
          entries.map((entry, index) => (
            <View key={index} style={styles.row}>
              <View style={styles.cell}>
                <Text>{entry.description}</Text>
                {entry.date || entry.documentType || entry.documentNumber ? (
                  <Text style={styles.cellSub}>
                    {[entry.date, entry.documentType, entry.documentNumber]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.cellNum}>—</Text>
              <Text style={styles.cellNum}>{formatAmount(entry.amount)}</Text>
              <Text style={styles.cellNum}>—</Text>
            </View>
          ))
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalCell}>TOTAL</Text>
          <Text style={styles.totalCellNum}>{formatPeso(budgetTotal)}</Text>
          <Text style={styles.totalCellNum}>{formatPeso(totalSpent)}</Text>
          <Text style={[styles.totalCellNum, variance.overspent ? { color: OVERSPEND_RED } : {}]}>
            {variance.text}
          </Text>
        </View>

        <Text style={styles.note}>
          Note: You may change expense account/item if actual expense incurred not included in the
          above list.
        </Text>
        <View style={styles.rule} />

        {/* Returned amount */}
        <View style={styles.returnedBlock}>
          <Text style={styles.fieldLine}>
            <Text style={styles.fieldLabel}>ACTUAL EXPENSES: </Text>
            {formatPeso(totalSpent)}
          </Text>
          <Text style={styles.fieldLineSplit}>
            <Text>
              <Text style={styles.fieldLabel}>RETURNED AMOUNT PER O.R. NO.: </Text>
              N/A
            </Text>
            <Text>
              <Text style={styles.fieldLabel}>DATE OF OR: </Text>
              N/A
            </Text>
          </Text>
          <Text style={styles.fieldLine}>
            <Text style={styles.fieldLabel}>RETURNED AMOUNT: </Text>
            {remaining >= 0 ? (
              formatPeso(remaining)
            ) : (
              <Text>
                ₱ 0.00{" "}
                <Text style={styles.returnedNote}>
                  (overage of {formatPeso(Math.abs(remaining))} acknowledged by adviser, not a
                  returnable amount)
                </Text>
              </Text>
            )}
          </Text>
        </View>
        <View style={styles.rule} />

        {/* Signatories — one column per signatory on file: signature line
            over centered full name (bold) and position (muted), for visual
            hierarchy. */}
        <View style={styles.signatories}>
          {orderedSignatories.map((signatory, index) => (
            <View key={index} style={styles.signatoryCol}>
              <View style={styles.signatoryLine} />
              <Text style={styles.signatoryName}>{signatory.fullName}</Text>
              <Text style={styles.signatoryPosition}>{signatory.position}</Text>
            </View>
          ))}
        </View>

        {/* Remarks — no remarks field in the schema yet, rendered blank */}
        <Text style={styles.remarksLabel}>Remarks (Accounting Office)</Text>
        <Text style={styles.remarksBody}>—</Text>

        <Text style={styles.accountCode}>
          <Text style={styles.fieldLabel}>ACCOUNT CODE: </Text>
          5-02-01-030
        </Text>
        <View style={styles.rule} />

        <Text style={styles.footer}>
          This document was electronically generated by Liquifi. Signatures above must be
          physically obtained and the fully signed document re-uploaded to complete event
          archiving.
        </Text>

        {/* Letterhead — moved to the bottom of the page */}
        <View style={[styles.letterhead, { marginTop: 20 }]}>
          <Text style={styles.college}>MABINI COLLEGES</Text>
          <Text style={styles.division}>Finance Division — Accounting Department</Text>
        </View>
      </Page>
    </Document>
  );
}
