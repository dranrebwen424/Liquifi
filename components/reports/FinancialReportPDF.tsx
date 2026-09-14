/**
 * FinancialReportPDF.tsx
 * -----------------------------------------------------------------------
 * Liquifi — Financial Report PDF (react-pdf/renderer)
 *
 * Recreates Financial_Report.docx as a data-driven @react-pdf/renderer
 * document:
 *   - Full-bleed header image (edge-to-edge, no margin) repeating on
 *     every page via react-pdf's `fixed` prop.
 *   - Report info block (department, event, school year/semester,
 *     fs_document_number, balance/collection/expense/cash-on-hand line).
 *   - Itemized expense table (Date, Item, Qty, Unit Price, Total, OR #),
 *     with a totals row and optional overspend row tinting.
 *   - Signature block rendered dynamically as N rows from a
 *     `signatories` array (mirrors §9.1/§7 of the master plan — no
 *     hardcoded officer names).
 *
 * Nothing here is hardcoded except the fixed page template itself
 * (§9.1: "Single fixed template, not per-department customizable").
 * Department name, event name, school year, semester, entries, and
 * signatories are all passed in as props / data.
 *
 * Install:
 *   npm install @react-pdf/renderer
 *
 * Usage:
 *   import { pdf } from '@react-pdf/renderer';
 *   import { FinancialReportPDF } from './FinancialReportPDF';
 *
 *   const blob = await pdf(<FinancialReportPDF data={reportData} />).toBlob();
 * -----------------------------------------------------------------------
 */

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Types — this is the "data" half of "data driven, not hardcoded"
// ---------------------------------------------------------------------------

export interface ExpenseEntry {
  /** Only printed on the row where the date actually changes, like the
   *  source document (blank string on continuation rows). */
  date: string;
  item: string;
  quantity?: string;
  unitPrice?: string;
  totalAmount: string;
  orNumber?: string;
  /** True for entries flagged as overspend — gets a row tint (§9.1). */
  isOverspend?: boolean;
  /** True for voided entries — struck through, excluded from totals (§9.3). */
  isVoided?: boolean;
}

export interface Signatory {
  name: string;
  position: string;
  sortOrder?: number;
}

export interface FinancialReportData {
  /** e.g. "COLLEGE OF COMPUTER STUDIES STUDENT COUNCIL (CCS)" */
  departmentName: string;
  /** e.g. "101st Founding Anniversary and Intramurals" */
  eventName: string;
  /** e.g. 2026 (start year of SY) */
  schoolYearStart: number;
  schoolYearEnd: number;
  /** e.g. "1st Semester" */
  semester: string;
  /** e.g. "FS-CCS-2026-00001" */
  fsDocumentNumber: string;
  /** Optional explicit date range line under the header info block */
  dateRangeLabel?: string;

  beginningBalance: number;
  totalCollection: number;
  totalExpenses: number;
  cashOnHand: number;

  entries: ExpenseEntry[];
  signatories: Signatory[];

  /** Path/URL/base64 for the full-bleed header image, repeated on every page */
  headerImageSrc: string | { data: Buffer | Uint8Array; format: 'png' | 'jpg' };
  /** Optional currency symbol/prefix, defaults to "Php" to match source */
  currencyLabel?: string;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number, currencyLabel = 'Php') =>
  `${currencyLabel} ${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const schoolYearLabel = (start: number, end: number) => `SY ${start}\u2013${end}`;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 72; // pts — matches header.png's ~7:1 aspect at full page width
const HEADER_GAP = 24; // px/pt gap kept between the header image and body content on every page

const styles = StyleSheet.create({
  page: {
    paddingTop: HEADER_HEIGHT + HEADER_GAP, // reserve room so body content (and the table on continuation pages) starts at least 24px below the fixed header
    paddingBottom: 40,
    paddingHorizontal: 32,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#1a1a2e',
  },

  // Full-bleed header: no top/side margin — pinned to page edges, repeats
  // on every page because of the `fixed` prop on the Image itself.
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: HEADER_HEIGHT,
    objectFit: 'cover',
  },

  reportInfoBlock: {
    marginTop: 8,
    marginBottom: 10,
  },
  deptName: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  reportTitle: {
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 2,
  },
  eventName: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 2,
  },
  syLine: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 2,
  },
  docNumberRow: {
    position: 'absolute',
    top: HEADER_HEIGHT + 4,
    right: 32,
    fontSize: 8.5,
    fontWeight: 700,
  },

  summaryBlock: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 8,
    marginBottom: 2,
  },
  summaryLabel: {
    fontWeight: 700,
  },

  dateRange: {
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 6,
    color: '#444',
  },

  // Table
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#22224a',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#22224a',
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 7.5,
    fontWeight: 700,
    padding: 4,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#454570',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#c9c9d8',
  },
  tableRowOverspend: {
    backgroundColor: '#fde3e3',
  },
  tableRowVoided: {
    backgroundColor: '#f2f2f2',
  },
  tableCell: {
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#dcdce6',
  },
  cellVoided: {
    textDecoration: 'line-through',
    color: '#8a8a8a',
  },
  totalsRow: {
    flexDirection: 'row',
    backgroundColor: '#e4e4f4',
    borderTopWidth: 1,
    borderTopColor: '#22224a',
  },
  totalsLabelCell: {
    fontSize: 8.5,
    fontWeight: 700,
    padding: 5,
    textAlign: 'right',
  },
  totalsValueCell: {
    fontSize: 8.5,
    fontWeight: 700,
    padding: 5,
    textAlign: 'center',
  },

  // Column widths (sum to 100)
  colDate: { width: '13%' },
  colItem: { width: '32%', textAlign: 'left' },
  colQty: { width: '10%' },
  colUnitPrice: { width: '13%' },
  colTotal: { width: '15%' },
  colOr: { width: '17%', borderRightWidth: 0 },

  // Signature block
  signatureSection: {
    marginTop: 22,
  },
  certifiedByLabel: {
    fontSize: 8.5,
    marginBottom: 18,
  },
  signatureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  signatureCell: {
    width: '25%',
    marginBottom: 18,
    paddingRight: 8,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    marginBottom: 3,
    marginTop: 14,
  },
  signatureName: {
    fontSize: 8.5,
    fontWeight: 700,
    textAlign: 'center',
  },
  signaturePosition: {
    fontSize: 7.5,
    textAlign: 'center',
    color: '#444',
  },

  pageNumber: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 7,
    color: '#888',
  },
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Full-bleed header — `fixed` makes react-pdf repeat this on every page,
 *  and absolute positioning + 0 insets keeps it edge-to-edge with no
 *  margin, top to bottom or side to side. */
const RepeatingHeader: React.FC<{ src: FinancialReportData['headerImageSrc'] }> = ({
  src,
}) => <Image src={src as any} style={styles.headerImage} fixed />;

const ExpenseTable: React.FC<{
  entries: ExpenseEntry[];
  totalExpenses: number;
  currencyLabel: string;
}> = ({ entries, totalExpenses, currencyLabel }) => (
  <View style={styles.table}>
    <View style={styles.tableHeaderRow} fixed>
      <Text style={[styles.tableHeaderCell, styles.colDate]}>DATE</Text>
      <Text style={[styles.tableHeaderCell, styles.colItem]}>ITEM</Text>
      <Text style={[styles.tableHeaderCell, styles.colQty]}>QUANTITY</Text>
      <Text style={[styles.tableHeaderCell, styles.colUnitPrice]}>UNIT PRICE</Text>
      <Text style={[styles.tableHeaderCell, styles.colTotal]}>TOTAL AMOUNT</Text>
      <Text style={[styles.tableHeaderCell, styles.colOr]}>OR NUMBER</Text>
    </View>

    {entries.map((entry, idx) => {
      const rowStyles = [
        styles.tableRow,
        ...(entry.isOverspend ? [styles.tableRowOverspend] : []),
        ...(entry.isVoided ? [styles.tableRowVoided] : []),
      ];
      const textStyle = entry.isVoided ? [styles.cellVoided] : [];
      return (
        <View style={rowStyles} key={idx} wrap={false}>
          <Text style={[styles.tableCell, styles.colDate, ...textStyle]}>{entry.date}</Text>
          <Text style={[styles.tableCell, styles.colItem, ...textStyle]}>{entry.item}</Text>
          <Text style={[styles.tableCell, styles.colQty, ...textStyle]}>
            {entry.quantity ?? ''}
          </Text>
          <Text style={[styles.tableCell, styles.colUnitPrice, ...textStyle]}>
            {entry.unitPrice ?? ''}
          </Text>
          <Text style={[styles.tableCell, styles.colTotal, ...textStyle]}>
            {entry.totalAmount}
          </Text>
          <Text style={[styles.tableCell, styles.colOr, ...textStyle]}>
            {entry.orNumber ?? ''}
          </Text>
        </View>
      );
    })}

    <View style={styles.totalsRow}>
      <Text style={[styles.totalsLabelCell, { width: '55%' }]}>TOTAL EXPENSES</Text>
      <Text style={[styles.totalsValueCell, { width: '45%' }]}>
        {formatCurrency(totalExpenses, currencyLabel)}
      </Text>
    </View>
  </View>
);

const SignatureBlock: React.FC<{ signatories: Signatory[] }> = ({ signatories }) => {
  const ordered = [...signatories].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
  return (
    <View style={styles.signatureSection} wrap={false}>
      <Text style={styles.certifiedByLabel}>Prepared and certified correct by:</Text>
      <View style={styles.signatureGrid}>
        {ordered.map((sig, idx) => (
          <View style={styles.signatureCell} key={idx}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{sig.name}</Text>
            <Text style={styles.signaturePosition}>{sig.position}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main document
// ---------------------------------------------------------------------------

export const FinancialReportPDF: React.FC<{ data: FinancialReportData }> = ({
  data,
}) => {
  const currencyLabel = data.currencyLabel ?? 'Php';

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Full-bleed header image, repeats on every page, no margins */}
        <RepeatingHeader src={data.headerImageSrc} />

        {/* fs_document_number — fixed top-right position, repeats too */}
        <Text style={styles.docNumberRow} fixed>
          {data.fsDocumentNumber}
        </Text>

        <View style={styles.reportInfoBlock}>
          <Text style={styles.reportTitle}>FINANCIAL REPORT OF</Text>
          <Text style={styles.deptName}>{data.departmentName}</Text>
          <Text style={styles.eventName}>{data.eventName}</Text>
          <Text style={styles.syLine}>
            {schoolYearLabel(data.schoolYearStart, data.schoolYearEnd)} — {data.semester}
          </Text>
        </View>

        {data.dateRangeLabel ? (
          <Text style={styles.dateRange}>{data.dateRangeLabel}</Text>
        ) : null}

        <View style={styles.summaryBlock}>
          <Text style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Beginning Balance: </Text>
            {formatCurrency(data.beginningBalance, currencyLabel)}
          </Text>
          <Text style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Collection: </Text>
            {formatCurrency(data.totalCollection, currencyLabel)}
          </Text>
          <Text style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Expenses: </Text>
            {formatCurrency(data.totalExpenses, currencyLabel)}
          </Text>
          <Text style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cash On-hand: </Text>
            {formatCurrency(data.cashOnHand, currencyLabel)}
          </Text>
        </View>

        <ExpenseTable
          entries={data.entries}
          totalExpenses={data.totalExpenses}
          currencyLabel={currencyLabel}
        />

        <SignatureBlock signatories={data.signatories} />

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};

export default FinancialReportPDF;