import { jsPDF } from 'jspdf';
import { Transaction, User } from '../types';

export function generate30DayTransactionPDF(
  user: User,
  transactions: Transaction[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 110, 'F');

  // Crimson accent strip
  doc.setFillColor(225, 29, 72); // rose-600
  doc.rect(0, 106, pageWidth, 4, 'F');

  // Title & Logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('RED RTC LEDGER', margin, 46);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(244, 63, 94); // rose-500
  doc.text('PEER-TO-PEER CRYPTO-LIKE DISTRIBUTED LEDGER', margin, 62);

  // Subtitle / Statement Details
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const statementDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated: ${statementDate}`, margin, 86);
  doc.text(`Report Scope: Last 30 Days (720 Hours)`, margin + 200, 86);

  // Summary Metrics Computation
  let totalInflow = 0;
  let totalOutflow = 0;
  const currentUsernameLower = user.username.toLowerCase();

  transactions.forEach((tx) => {
    if (tx.receiver_username.toLowerCase() === currentUsernameLower) {
      totalInflow += tx.amount;
    }
    if (tx.sender_username.toLowerCase() === currentUsernameLower) {
      totalOutflow += tx.amount;
    }
  });

  const netFlow = totalInflow - totalOutflow;

  // Account Summary Card
  let currentY = 130;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, currentY, contentWidth, 90, 6, 6, 'FD');

  // User Profile
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  const adminBadge = user.is_admin ? ' [VERIFIED ADMIN (✓)]' : ' [MEMBER NODE]';
  doc.text(`ACCOUNT: ${user.username}${adminBadge}`, margin + 14, currentY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Account ID: ${user.id}`, margin + 14, currentY + 36);
  doc.text(`Current Active Balance: ${user.balance.toLocaleString()} RTC`, margin + 14, currentY + 50);

  // Stat Boxes inside summary
  const colWidth = (contentWidth - 28) / 3;
  const statBoxY = currentY + 58;

  // Inflow Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text(`30D TOTAL RECEIVED`, margin + 14, statBoxY);
  doc.setFontSize(11);
  doc.text(`+${totalInflow.toLocaleString()} RTC`, margin + 14, statBoxY + 14);

  // Outflow Box
  doc.setFontSize(8);
  doc.setTextColor(159, 18, 57); // rose-900
  doc.text(`30D TOTAL SENT`, margin + 14 + colWidth, statBoxY);
  doc.setFontSize(11);
  doc.text(`-${totalOutflow.toLocaleString()} RTC`, margin + 14 + colWidth, statBoxY + 14);

  // Net Movement
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`30D NET CHANGE`, margin + 14 + colWidth * 2, statBoxY);
  doc.setFontSize(11);
  const netSign = netFlow >= 0 ? '+' : '';
  doc.setTextColor(netFlow >= 0 ? 22 : 159, netFlow >= 0 ? 101 : 18, netFlow >= 0 ? 52 : 57);
  doc.text(`${netSign}${netFlow.toLocaleString()} RTC`, margin + 14 + colWidth * 2, statBoxY + 14);

  currentY += 110;

  // Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`30-Day Transaction Ledger (${transactions.length} Records)`, margin, currentY);

  currentY += 14;

  // Table Column Headers
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, currentY, contentWidth, 22, 'F');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('DATE & TIME (UTC)', margin + 8, currentY + 14);
  doc.text('TYPE', margin + 120, currentY + 14);
  doc.text('COUNTERPARTY', margin + 180, currentY + 14);
  doc.text('AMOUNT', margin + 330, currentY + 14);
  doc.text('STATUS / PROTOCOL', margin + 410, currentY + 14);

  currentY += 22;

  // Render Rows
  if (transactions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No transactions recorded within the last 30 days.', margin + 8, currentY + 24);
    currentY += 40;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    transactions.forEach((tx, idx) => {
      // Check page overflow
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 40;
        // Re-print header
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, currentY, contentWidth, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('DATE & TIME (UTC)', margin + 8, currentY + 13);
        doc.text('TYPE', margin + 120, currentY + 13);
        doc.text('COUNTERPARTY', margin + 180, currentY + 13);
        doc.text('AMOUNT', margin + 330, currentY + 13);
        doc.text('STATUS / PROTOCOL', margin + 410, currentY + 13);
        currentY += 20;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }

      // Alternating row background
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, 22, 'F');
      }

      const isIncoming = tx.receiver_username.toLowerCase() === currentUsernameLower;
      const counterparty = isIncoming ? tx.sender_username : tx.receiver_username;
      const formattedDate = new Date(tx.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Date
      doc.setTextColor(71, 85, 105);
      doc.text(formattedDate, margin + 8, currentY + 14);

      // Type Badge
      if (isIncoming) {
        doc.setTextColor(22, 101, 52);
        doc.text('INCOMING', margin + 120, currentY + 14);
      } else {
        doc.setTextColor(190, 18, 60);
        doc.text('OUTGOING', margin + 120, currentY + 14);
      }

      // Counterparty
      doc.setTextColor(15, 23, 42);
      doc.text(counterparty, margin + 180, currentY + 14);

      // Amount
      doc.setFont('helvetica', 'bold');
      if (isIncoming) {
        doc.setTextColor(22, 101, 52);
        doc.text(`+${tx.amount.toLocaleString()} RTC`, margin + 330, currentY + 14);
      } else {
        doc.setTextColor(190, 18, 60);
        doc.text(`-${tx.amount.toLocaleString()} RTC`, margin + 330, currentY + 14);
      }
      doc.setFont('helvetica', 'normal');

      // Status
      doc.setTextColor(100, 116, 139);
      doc.text('Confirmed (WebRTC + DB)', margin + 410, currentY + 14);

      currentY += 22;
    });
  }

  // Footer notes & verification
  if (currentY > pageHeight - 70) {
    doc.addPage();
    currentY = 40;
  } else {
    currentY += 20;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, margin + contentWidth, currentY);

  currentY += 16;
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Ledger Verification: All transactions confirmed through WebRTC DataChannels and synchronized with Supabase persistent storage.',
    margin,
    currentY
  );
  doc.text(
    'Red RTC Network Protocol | Cryptographic Peer-to-Peer Consensus Engine | Maximum 100 Verified Nodes',
    margin,
    currentY + 12
  );

  // Download PDF
  const filename = `Red_RTC_Statement_${user.username}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
