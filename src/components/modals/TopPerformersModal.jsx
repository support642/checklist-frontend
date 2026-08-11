import React from 'react';
import { X, Trophy, Award, Medal, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TopPerformersModal = ({ 
  isOpen, 
  onClose, 
  performers = [],
  startDate,
  endDate,
  isCustomRange = false,
  monthLabel = ""
}) => {
  if (!isOpen) return null;

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr || dateStr === "N/A" || dateStr === "Range") return dateStr;
    try {
      const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getRankBadge = (rank) => {
    if (rank <= 5) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-gold shadow-sm animate-pulse">
          <Trophy className="h-3.5 w-3.5 text-white" />
          Gold Performer
        </span>
      );
    } else if (rank <= 10) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-silver shadow-sm">
          <Award className="h-3.5 w-3.5 text-slate-800" />
          Silver Performer
        </span>
      );
    } else if (rank <= 15) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-bronze shadow-sm">
          <Medal className="h-3.5 w-3.5 text-white" />
          Bronze Performer
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 shadow-sm">
          Ranked
        </span>
      );
    }
  };

  const handleDownloadPDF = () => {
    if (!performers.length) return;

    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4: 210mm x 297mm
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 10;
    const usableW = pageW - 2 * marginX; // 190mm
    const centerX = pageW / 2; // 105mm

    // 1. Header Section
    const logoW = 25;
    const logoH = 20;
    const bannerW = usableW - 2 * logoW; // 140mm

    // Yellow Banner
    doc.setFillColor(255, 255, 0); 
    doc.rect(marginX + logoW, 10, bannerW, logoH, 'F');
    // Left & Right Borders for logos
    doc.setDrawColor(200);
    doc.rect(marginX, 10, logoW, logoH);
    doc.rect(marginX + logoW + bannerW, 10, logoW, logoH);

    try {
      doc.addImage("/Rama_logo_pdf.png", "PNG", marginX + 2, 12, 21, 16);
      doc.addImage("/Rama_logo_pdf.png", "PNG", marginX + logoW + bannerW + 2, 12, 21, 16);
    } catch (e) {
      console.warn("Logos could not be loaded into PDF", e);
    }

    // Header Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text("Rama Udyog pvt ltd.", centerX, 23, { align: "center" });

    // 2. Sub-header (Blue Banner)
    const subHeaderY = 30;
    doc.setFillColor(217, 234, 247);
    doc.rect(marginX, subHeaderY, usableW, 8, 'F');
    doc.rect(marginX, subHeaderY, usableW, 8);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const subHeaderTitle = isCustomRange 
      ? "EMPLOYEE PERFORMANCE RANKING (DATE RANGE)" 
      : `MONTHLY PERFORMANCE CHART - ${monthLabel.toUpperCase()}`;
    doc.text(subHeaderTitle, centerX, subHeaderY + 5.5, { align: "center" });

    // Period / Date Range text / Signature
    if (startDate && endDate) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", isCustomRange ? "bold" : "normal");
      doc.setTextColor(80);
      
      const dateLabel = isCustomRange
        ? `Performance chart is based on the selected dates: ${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}`
        : `Monthly Performance Chart for ${monthLabel} (Period: ${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)})`;
        
      doc.text(dateLabel, centerX, subHeaderY + 12, { align: "center" });
    }

    // 3. Info Table
    const tableHeader = ["Rank", "Employee", "Phone No.", "Designation", "Department", "Division", "Assigned / Completed", "On-Time Score", "Status Badge"];
    const tableBody = performers.map((staff, idx) => {
      const rank = idx + 1;
      const onTimePct = staff.completedTasks > 0 ? Math.round((staff.doneOnTime / staff.completedTasks) * 100) : 0;
      let badgeText = "Ranked";
      if (rank <= 5) badgeText = "Gold Performer";
      else if (rank <= 10) badgeText = "Silver Performer";
      else if (rank <= 15) badgeText = "Bronze Performer";

      const phone = staff.number || staff.phone_number || staff.mobile || staff.phone || "—";

      return [
        rank,
        staff.name,
        phone,
        (!staff.designation || staff.designation === "—") ? "" : staff.designation,
        staff.department || "N/A",
        staff.division || "N/A",
        `${staff.totalTasks} / ${staff.completedTasks}`,
        `${onTimePct}%`,
        badgeText
      ];
    });

    const columnStyles = {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', fontStyle: 'bold' },
      2: { halign: 'left' },
      3: { halign: 'left' },
      4: { halign: 'left' },
      5: { halign: 'left' },
      6: { halign: 'center', cellWidth: 28 },
      7: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      8: { halign: 'center', cellWidth: 28, fontStyle: 'bold' }
    };

    autoTable(doc, {
      head: [tableHeader],
      body: tableBody,
      startY: startDate && endDate ? 47 : 42,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [200, 200, 200] },
      headStyles: { fillColor: [233, 242, 233], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 8.5 },
      bodyStyles: { textColor: [50, 50, 50], minCellHeight: 8 },
      columnStyles,
      willDrawCell: (data) => {
        if (data.row.section === 'body' && data.column.index === 8) {
          // Save the text for didDrawCell
          data.cell.rawBadgeText = data.cell.text[0];
          // Clear text so autotable doesn't draw it automatically
          data.cell.text = [];
        }
      },
      didDrawCell: (data) => {
        if (data.row.section === 'body' && data.column.index === 8) {
          const text = data.cell.rawBadgeText;
          if (!text) return;

          const cellX = data.cell.x;
          const cellY = data.cell.y;
          const cellW = data.cell.width;
          const cellH = data.cell.height;

          // Badge dimensions
          const badgeW = 30; 
          const badgeH = 5.5; 
          
          const badgeX = cellX + (cellW - badgeW) / 2;
          const badgeY = cellY + (cellH - badgeH) / 2;

          let fillRGB = [243, 244, 246]; 
          let textRGB = [107, 114, 128];
          let strokeRGB = [229, 231, 235];
          let isBold = false;

          if (text === "Gold Performer") {
            fillRGB = [251, 191, 36]; 
            textRGB = [255, 255, 255]; 
            strokeRGB = [245, 158, 11]; 
            isBold = true;
          } else if (text === "Silver Performer") {
            fillRGB = [203, 213, 225]; 
            textRGB = [30, 41, 59]; 
            strokeRGB = [148, 163, 184]; 
            isBold = true;
          } else if (text === "Bronze Performer") {
            fillRGB = [251, 146, 60]; 
            textRGB = [255, 255, 255]; 
            strokeRGB = [180, 83, 9]; 
            isBold = true;
          }

          doc.setFillColor(fillRGB[0], fillRGB[1], fillRGB[2]);
          doc.setDrawColor(strokeRGB[0], strokeRGB[1], strokeRGB[2]);
          doc.setLineWidth(0.1);
          doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2.75, 2.75, 'FD');

          doc.setFont("helvetica", isBold ? "bold" : "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
          
          doc.text(text, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.85, { align: "center" });
        }
      }
    });

    // Add Footer to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = pageH - 10;

      // Divider line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(marginX, footerY - 3, marginX + usableW, footerY - 3);

      // Timestamp bottom right
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150);
      const timestamp = `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(timestamp, marginX + usableW, footerY, { align: "right" });

      // Page numbers bottom left
      doc.text(`Page ${i} of ${totalPages}`, marginX, footerY);

      // Center brand: "Powered By Botivate"
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const prefixText = "Powered By  ";
      const brandText = "Botivate";
      const prefixW = doc.getTextWidth(prefixText);
      doc.setFont("helvetica", "bold");
      const brandW = doc.getTextWidth(brandText);
      const totalW = prefixW + brandW;
      const startX = centerX - totalW / 2;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(prefixText, startX, footerY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(124, 58, 237); // Purple-600
      doc.text(brandText, startX + prefixW, footerY);
    }

    const filenamePrefix = isCustomRange ? "DateRange" : monthLabel.replace(/\s+/g, "_");
    doc.save(`Employee_Performance_Ranking_${filenamePrefix}_${new Date().toLocaleDateString('en-CA')}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-7xl h-auto lg:h-[95vh] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-gray-300 animate-in zoom-in-95 duration-200">
        
        {/* Desktop View (Full Report) */}
        <div className="hidden lg:flex flex-col flex-1 overflow-hidden">
          {/* Header Section */}
          <div className="flex items-stretch border-b border-gray-300 h-24 shrink-0">
            <div className="w-[180px] flex items-center justify-center p-3 border-r border-gray-300 bg-white">
              <img src="/Rama_TMT_logo.png" alt="Rama Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex-1 bg-[#FFFF00] flex flex-col items-center justify-center px-6 border-r border-gray-300">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tighter text-center uppercase">
                Rama Udyog pvt ltd.
              </h1>
            </div>
            <div className="w-[180px] flex items-center justify-center p-3 bg-white">
              <img src="/Rama_TMT_logo.png" alt="Rama Logo" className="max-h-full max-w-full object-contain" />
            </div>
          </div>

          {/* Sub-header */}
          <div className="bg-[#D9EAF7] border-b border-gray-300 py-3 shrink-0 flex items-center justify-center relative">
            <h2 className="text-2xl font-bold text-gray-800 text-center uppercase tracking-widest">
              {isCustomRange ? "Performance Chart (Date Range)" : "Monthly Performance Chart"}
            </h2>
            <button 
              onClick={onClose}
              className="absolute right-4 p-1.5 rounded-full hover:bg-black/5 text-gray-500 hover:text-gray-700 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Info Stats (Summary) */}
          <div className="bg-[#F8F9FA] border-b border-gray-300 py-3 px-6 text-sm text-gray-600 flex justify-between items-center shrink-0">
            <div className="flex flex-col gap-1">
              <div>
                Showing {isCustomRange ? (
                  <>
                    overall <span className="font-bold text-blue-600">Performance Ranking</span> based on custom date range
                  </>
                ) : (
                  <>
                    monthly <span className="font-bold text-blue-600">Performance Ranking</span> for <span className="font-bold text-blue-600">{monthLabel || "this month"}</span>
                  </>
                )} (Ranked by on-time score if completed tasks &ge; 300, otherwise sorted by completed tasks)
              </div>
              {startDate && endDate && (
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Period: <span className="text-gray-800 font-bold">{formatDateForDisplay(startDate)}</span> to <span className="text-gray-800 font-bold">{formatDateForDisplay(endDate)}</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 text-right">
              * Rank 1-5 (Gold) | Rank 6-10 (Silver) | Rank 11-15 (Bronze) | Rank 16+ (Ranked)
            </div>
          </div>

          {/* Performers Table */}
          <div className="flex-1 overflow-auto bg-white p-6">
            <table className="w-full border-collapse border border-gray-300 text-[14px]">
              <thead>
                <tr className="bg-[#E9F2E9] border-b border-gray-300">
                  <th className="border border-gray-300 p-3 font-bold w-[80px] text-center">Rank</th>
                  <th className="border border-gray-300 p-3 font-bold text-left">Employee</th>
                  <th className="border border-gray-300 p-3 font-bold text-left">Phone No.</th>
                  <th className="border border-gray-300 p-3 font-bold text-left">Designation</th>
                  <th className="border border-gray-300 p-3 font-bold text-left">Department</th>
                  <th className="border border-gray-300 p-3 font-bold text-left">Division</th>
                  <th className="border border-gray-300 p-3 font-bold w-[180px] text-center">Assigned/Done</th>
                  <th className="border border-gray-300 p-3 font-bold w-[150px] text-center">On-Time Score</th>
                  <th className="border border-gray-300 p-3 font-bold w-[220px] text-center">Status Badge</th>
                </tr>
              </thead>
              <tbody>
                {performers.length > 0 ? (
                  performers.map((staff, idx) => {
                    const rank = idx + 1;
                    const onTimePct = staff.completedTasks > 0 ? Math.round((staff.doneOnTime / staff.completedTasks) * 100) : 0;
                    const phone = staff.number || staff.phone_number || staff.mobile || staff.phone || "—";
                    
                    // Row background tint for top 3
                    const rowBg = 
                      rank === 1 ? 'bg-yellow-50/30' :
                      rank === 2 ? 'bg-slate-50/30' :
                      rank === 3 ? 'bg-orange-50/20' : '';

                    return (
                      <tr key={`${staff.name}-${idx}`} className={`hover:bg-gray-50 transition-colors border-b border-gray-200 ${rowBg}`}>
                        <td className="border border-gray-300 p-3 text-center font-bold text-gray-700">
                          {rank}
                        </td>
                        <td className="border border-gray-300 p-3 font-semibold text-gray-900">
                          {staff.name}
                        </td>
                        <td className="border border-gray-300 p-3 text-gray-600 font-medium">
                          {phone}
                        </td>
                        <td className="border border-gray-300 p-3 text-gray-600">
                          {(!staff.designation || staff.designation === "—") ? "" : staff.designation}
                        </td>
                        <td className="border border-gray-300 p-3 text-gray-600">
                          {staff.department || "N/A"}
                        </td>
                        <td className="border border-gray-300 p-3 text-gray-600">
                          {staff.division || "N/A"}
                        </td>
                        <td className="border border-gray-300 p-3 text-center text-gray-700 font-medium">
                          {staff.totalTasks} / {staff.completedTasks}
                        </td>
                        <td className="border border-gray-300 p-3 text-center font-bold text-blue-600">
                          {onTimePct}%
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          {getRankBadge(rank)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-gray-400 italic">
                      No employees meet the performance criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 flex items-center justify-end border-t border-gray-300 shrink-0">
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-bold shadow-md active:scale-95 mr-3"
            >
              <Download size={18} />
              Download PDF
            </button>
            <button 
              onClick={onClose}
              className="px-8 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <X size={18} />
              Close Chart
            </button>
          </div>
        </div>

        {/* Mobile View Layout (Direct Export Popup) */}
        <div className="lg:hidden flex flex-col w-full max-w-sm mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="bg-[#FFFF00] p-6 text-center">
            <img src="/Rama_TMT_logo.png" alt="Rama Logo" className="h-12 w-auto mx-auto mb-4 object-contain" />
            <h2 className="text-xl font-bold text-gray-900 uppercase leading-tight tracking-tighter">
              Performance Ranking
            </h2>
            <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest mt-1 opacity-70">
              Export Options
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4 text-center">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Chart Type</p>
                <p className="text-base font-bold text-gray-800 leading-tight">
                  {isCustomRange ? "Date Range Performance Ranking" : `Performance Ranking for ${monthLabel}`}
                </p>
              </div>

              {startDate && endDate && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-1">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Date Period</p>
                  <p className="text-xs font-bold text-blue-800">
                    {formatDateForDisplay(startDate)} to {formatDateForDisplay(endDate)}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold shadow-lg active:scale-95 text-sm uppercase tracking-wider"
              >
                <Download size={20} />
                Download PDF
              </button>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-3 text-gray-500 font-semibold hover:text-gray-800 transition-colors uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <X size={14} />
              Cancel / Close
            </button>
          </div>

          <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
            <p className="text-[10px] font-medium text-gray-400 uppercase">
              Full interactive report available on desktop
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TopPerformersModal;
