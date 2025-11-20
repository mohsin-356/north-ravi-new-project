import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, FileText, Printer, Mail, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface TestReport {
  id: string;
  sampleId: string;
  patientName: string;
  testName: string;
  status: "draft" | "approved" | "sent";
  createdAt: Date;
  approvedBy?: string;
  hasAbnormalValues: boolean;
  hasCriticalValues: boolean;
}

const ReportGenerator = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { user } = useAuth();

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handlePreviewPrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
  };

  // Fetch completed samples to display as reports
  const [reports, setReports] = useState<TestReport[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [serverPaging, setServerPaging] = useState(false);
  const [loading, setLoading] = useState(false);
  // fetch reports (completed samples)
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('status', 'completed');
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    setLoading(true);
    api
      .get<any>(`/labtech/samples?${params.toString()}`)
      .then(({ data }) => {
        const mapSampleToReport = (s: any): TestReport => ({
          id: `RPT${String(s._id).substring(String(s._id).length-4)}`,
          sampleId: s._id,
          patientName: s.patientName,
          testName: s.tests && s.tests.length ? (typeof s.tests[0] === "string" ? (s as any).testNames?.[0] || "" : s.tests[0].name) : "",
          status: "approved",
          createdAt: new Date(s.completedAt || s.updatedAt || s.createdAt),
          approvedBy: s.processedBy || "LabTech",
          hasAbnormalValues: (s.results||[]).some((r:any)=>r.isAbnormal && !r.isCritical),
          hasCriticalValues: (s.results||[]).some((r:any)=>r.isCritical)
        });
        if (Array.isArray(data)) {
          setServerPaging(false);
          const completed = (data || []).filter((s: any) => s.status === 'completed');
          setReports(completed.map(mapSampleToReport));
          const tot = completed.length;
          setTotal(tot); setTotalPages(Math.max(1, Math.ceil(tot/limit)));
        } else if (data && Array.isArray(data.data)) {
          setServerPaging(true);
          setReports((data.data || []).map(mapSampleToReport));
          setTotal(Number(data.total)||0); setTotalPages(Number(data.totalPages)||1);
        } else {
          setServerPaging(false); setReports([]); setTotal(0); setTotalPages(1);
        }
      })
      .catch(() => { setServerPaging(false); setReports([]); setTotal(0); setTotalPages(1); })
      .finally(()=> setLoading(false));
  }, [page, limit, searchTerm]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "approved": return "bg-green-100 text-green-800";
      case "sent": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Filtering for reports (search only)
  const filteredReports = serverPaging ? reports : reports.filter(report => {
    const matchesSearch = 
      report.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.sampleId ? report.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) : false);
    return matchesSearch;
  });

  useEffect(() => { setPage(1); }, [searchTerm]);

  const reportsToRender = serverPaging ? filteredReports : filteredReports.slice((page-1)*limit, (page-1)*limit + limit);

  const generatePDF = async (reportId: string, mode: 'save' | 'print' = 'save') => {
    // Find the report data
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    try {
      const [{ jsPDF }, autoTable] = await Promise.all([
        import('jspdf').then(m => ({ jsPDF: m.jsPDF })),
        import('jspdf-autotable').then(m => (m.default ? m.default : m))
      ]);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      const marginLeft = 40;
      let cursorY = 36;

      // Load branding from Lab Settings (fallback to hospitalName if present)
      const settingsRaw = (typeof window !== 'undefined') ? localStorage.getItem('labSettings') : null;
      const labSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
      const hospitalName = (labSettings?.labName && String(labSettings.labName).trim())
        ? String(labSettings.labName)
        : ((typeof window !== 'undefined' ? (localStorage.getItem('hospitalName') || '') : '') || 'Hospital Laboratory');
      const labAddress = labSettings?.address || '';
      const labPhone = labSettings?.phone || '';

      // Fetch sample with results and demographics
      let sampleData: any = null;
      if (report.sampleId) {
        try {
          const { data } = await api.get(`/labtech/samples/${report.sampleId}`);
          sampleData = data;
        } catch {}
      }

      // Footer on each page
      const runUser = (user && (user as any).name) || (user as any)?.username || (user as any)?.role || '';
      const renderFooter = () => {
        const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : doc.getNumberOfPages();
        for (let p = 1; p <= pageCount; p++) {
          (doc as any).setPage(p);
          const pageH = (doc as any).internal.pageSize.getHeight();
          const contentW = 515;
          const xLeft = marginLeft;
          const xRight = marginLeft + contentW;
          const centerX = marginLeft + contentW / 2;

          // Footer band: draw only the bottom line; remove the top line as requested
          // Ensure the notice text stays above the bottom line with safe spacing
          const bandTop = pageH - 76;
          const bandBottom = pageH - 56;
          doc.setDrawColor(0);
          doc.setLineWidth(0.6);
          doc.line(xLeft, bandBottom, xRight, bandBottom);

          // Center notice on the band
          const notice = 'System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.';
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const noticeLines = doc.splitTextToSize(notice, contentW - 180);
          const lineH = 12;
          const baselineY = bandBottom - 8 - Math.max(0, noticeLines.length - 1) * lineH;
          doc.text(noticeLines, centerX, baselineY, { align: 'center' });

          // User on right on same baseline as notice (dot instead of colon as in reference)
          const userText = `User. ${runUser || 'Admin'}`;
          doc.text(userText, xRight, baselineY, { align: 'right' });

          // Pathologist block below the bottom line (left)
          const pathName = labSettings?.pathologistName || labSettings?.consultantName || '';
          const pathDeg = labSettings?.pathologistDegrees || '';
          const pathTitle = labSettings?.pathologistTitle || 'Consultant Pathologist';
          const nameY = bandBottom + 16;
          const degY = nameY + 12;
          const titleY = degY + 12;
          if (pathName) { doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(String(pathName).toUpperCase(), xLeft, nameY); }
          if (pathDeg) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(String(pathDeg), xLeft, degY); }
          if (pathTitle) { doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(String(pathTitle), xLeft, titleY); }
        }
      };

      // Compute a fallback sequential Sample # if sampleNumber absent
      let sampleNumberDisplay: string | null = null;
      if (sampleData?.sampleNumber != null) {
        sampleNumberDisplay = String(sampleData.sampleNumber);
      } else if (report.sampleId) {
        try {
          const { data: allSamples } = await api.get(`/labtech/samples`);
          const sorted = (allSamples || []).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          const idx = sorted.findIndex((s: any) => String(s._id) === String(report.sampleId));
          if (idx >= 0) sampleNumberDisplay = String(idx + 1);
        } catch {}
      }

      // Optional logo: only use safe URL schemes to avoid file:// errors in Electron
      const storedLogo = localStorage.getItem('hospitalLogoUrl') || localStorage.getItem('labLogoUrl') || '';
      const safeLogo = /^https?:\/\//i.test(storedLogo) || /^data:/i.test(storedLogo) ? storedLogo : '';
      if (safeLogo) {
        try {
          const img = new Image();
          img.src = safeLogo;
          await new Promise(res => { img.onload = () => res(null); img.onerror = () => res(null); });
          if (img.width && img.height) {
            // Place logo on the left
            doc.addImage(img, 'PNG', marginLeft, cursorY, 60, 60);
          }
        } catch {}
      }

      // Header: centered hospital/lab title + address/phone + department
      const headerCenterX = marginLeft + 515 / 2;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.text(hospitalName, headerCenterX, cursorY + 22, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const addressLine = [labAddress, labPhone ? `Ph:${labPhone}` : ''].filter(Boolean).join('  -  ');
      if (addressLine) doc.text(addressLine, headerCenterX, cursorY + 40, { align: 'center' });
      doc.setFontSize(18);
      doc.setFont('times', 'italic');
      doc.text('Department of Pathology', headerCenterX, cursorY + 62, { align: 'center' });
      // Separator line under header
      doc.setDrawColor(0);
      doc.setLineWidth(1);
      doc.line(marginLeft, cursorY + 70, marginLeft + 515, cursorY + 70);

      // Patient Details box
      cursorY += 80;
      const pad = 10;
      let infoY = cursorY + pad + 4;
      doc.setFontSize(10);
      const pName = sampleData?.patientName || report.patientName || '-';
      const pAge = (sampleData?.age != null) ? String(sampleData.age) : '-';
      const pSex = (sampleData?.gender != null) ? String(sampleData.gender) : '-';
      const pPhone = sampleData?.phone || '-';
      const pAddr = sampleData?.address || '-';
      const pGuardian = (sampleData?.guardianRelation || sampleData?.guardianName)
        ? `${sampleData?.guardianRelation ? String(sampleData.guardianRelation) + ' ' : ''}${sampleData?.guardianName ? String(sampleData.guardianName) : ''}`
        : '-';
      const pCnic = (sampleData?.cnic) ? String(sampleData.cnic) : '-';
      const regDate = (sampleData?.createdAt ? new Date(sampleData.createdAt) : report.createdAt).toLocaleString();
      const reportingTime = new Date().toLocaleString();
      const sampleId = sampleNumberDisplay || 'N/A';
      const mrn = (sampleData?.mrNumber || sampleData?.mrn || sampleData?.patientMr || sampleData?.patientId) ? String(sampleData?.mrNumber || sampleData?.mrn || sampleData?.patientMr || sampleData?.patientId) : '-';
      const referring = sampleData?.referringDoctor || sampleData?.doctorName || sampleData?.orderedBy || '-';
      const sampleSource = sampleData?.sampleSource || '-';

      // Column layout constants (two fixed columns; value positions computed from label widths)
      const leftLabelX = marginLeft + pad;
      const rightLabelX = marginLeft + pad + 260;
      const leftColRight = marginLeft + pad + 250;
      const rightColRight = marginLeft + 515 - pad;
      const lineGap = 12; // per extra line

      type Row = { lLabel: string; lValue: string; rLabel: string; rValue: string };
      const rows: Row[] = [
        { lLabel: 'Medical Record No :', lValue: mrn, rLabel: 'Reg. & Sample Time :', rValue: regDate },
        { lLabel: 'Sample No / Lab No :', lValue: sampleId, rLabel: 'Reporting Time :', rValue: reportingTime },
        { lLabel: 'Patient Name :', lValue: pName, rLabel: 'Address :', rValue: pAddr },
        { lLabel: 'Contact No :', lValue: pPhone, rLabel: 'Referring Consultant :', rValue: referring },
        { lLabel: 'Age / Gender :', lValue: `${pAge} Years / ${pSex}`, rLabel: 'Sample Source :', rValue: sampleSource },
      ];
      if (pCnic !== '-' || pGuardian !== '-') {
        rows.push({ lLabel: 'CNIC :', lValue: pCnic, rLabel: pGuardian !== '-' ? 'Guardian :' : '', rValue: pGuardian !== '-' ? pGuardian : '' });
      }

      // Ensure measurements use normal font size
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      // Pre-compute heights using dynamic value widths per row
      const rowHeights = rows.map(r => {
        const lLabelWidth = r.lLabel ? doc.getTextWidth(r.lLabel) : 0;
        const leftValueXDyn = leftLabelX + lLabelWidth + 4;
        const leftValueWidth = Math.max(60, leftColRight - leftValueXDyn);
        const leftStacked = leftValueWidth < 80;
        const lLines = doc.splitTextToSize(` ${r.lValue || '-'}`, leftStacked ? (leftColRight - leftLabelX) : leftValueWidth) as string[];

        const rLabelWidth = r.rLabel ? doc.getTextWidth(r.rLabel) : 0;
        const rightValueXDyn = rightLabelX + rLabelWidth + 4;
        const rightValueWidth = Math.max(60, rightColRight - rightValueXDyn);
        const rightStacked = r.rLabel ? (rightValueWidth < 90) : false;
        const rLines = r.rLabel ? (doc.splitTextToSize(` ${r.rValue || '-'}`, rightStacked ? (rightColRight - rightLabelX) : rightValueWidth) as string[]) : [];

        const lH = (leftStacked ? 28 : 16) + Math.max(0, lLines.length - 1) * lineGap;
        const rH = r.rLabel ? ((rightStacked ? 28 : 16) + Math.max(0, rLines.length - 1) * lineGap) : 16;
        return Math.max(lH, rH);
      });
      const contentHeight = rowHeights.reduce((a, b) => a + b, 0);
      const detailsBoxHeight = pad + 4 + contentHeight + pad;

      // Draw box now that height is known
      doc.setDrawColor(200);
      doc.setLineWidth(1);
      doc.roundedRect(marginLeft, cursorY, 515, detailsBoxHeight, 6, 6);

      // Render rows
      rows.forEach((r, idx) => {
        const y = infoY;
        // compute dynamic positions again for render
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        const lLabelWidth = r.lLabel ? doc.getTextWidth(r.lLabel) : 0;
        const leftValueXDyn = leftLabelX + lLabelWidth + 4;
        const leftValueWidth = Math.max(60, leftColRight - leftValueXDyn);
        const leftStacked = leftValueWidth < 80;
        // left
        if (r.lLabel) { doc.setFont('helvetica', 'normal'); doc.text(r.lLabel, leftLabelX, y); }
        doc.setFont('helvetica', 'normal');
        if (leftStacked) {
          const lLines = doc.splitTextToSize(` ${r.lValue || '-'}`, leftColRight - leftLabelX) as string[];
          doc.text(lLines, leftLabelX, y + 12);
        } else {
          const lLines = doc.splitTextToSize(` ${r.lValue || '-'}`, leftValueWidth) as string[];
          doc.text(lLines, leftValueXDyn, y);
        }

        // right
        if (r.rLabel) {
          doc.setFont('helvetica', 'normal');
          const rLabelWidth = doc.getTextWidth(r.rLabel);
          const rightValueXDyn = rightLabelX + rLabelWidth + 4;
          const rightValueWidth = Math.max(60, rightColRight - rightValueXDyn);
          doc.text(r.rLabel, rightLabelX, y);
          doc.setFont('helvetica', 'normal');
          const rightStacked = rightValueWidth < 90;
          if (rightStacked) {
            const rLines = doc.splitTextToSize(` ${r.rValue || '-'}`, rightColRight - rightLabelX) as string[];
            doc.text(rLines, rightLabelX, y + 12);
          } else {
            const rLines = doc.splitTextToSize(` ${r.rValue || '-'}`, rightValueWidth) as string[];
            doc.text(rLines, rightValueXDyn, y);
          }
        }
        infoY += rowHeights[idx];
      });

      // Move cursor below the box
      cursorY += detailsBoxHeight + 10;

      // Tests Ordered section
      if (sampleData) {
        const testNames: string[] = (sampleData.tests || []).map((t: any) => (typeof t === 'string' ? '' : (t?.name || ''))).filter((n: string) => n);
        if (testNames.length) {
          doc.setFont('helvetica', 'bold');
          doc.text('Tests Ordered', marginLeft, cursorY);
          doc.setFont('helvetica', 'normal');
          cursorY += 14;
          const listText = testNames.join(', ');
          const splitTests = doc.splitTextToSize(listText, 515);
          doc.text(splitTests, marginLeft, cursorY);
          cursorY += 20 + (splitTests.length > 1 ? (splitTests.length - 1) * 12 : 0);
        }
      }

      // Build results table combining saved results + parameter metadata
      let tableRows: any[] = [];
      if (sampleData) {
        // Fetch all tests for parameter metadata
        const testIds: string[] = (sampleData.tests || []).map((t: any) => (typeof t === 'string' ? t : (t?._id || t?.id))).filter(Boolean);
        let paramMeta: Record<string, any> = {};
        if (testIds.length) {
          try {
            const detailsArrays = await Promise.all(testIds.map(async (tid: string) => {
              const { data: d } = await api.get(`/labtech/tests/${tid}`);
              return (d.parameters || []).map((p: any) => ({
                id: p.id, name: p.name, unit: p.unit,
                normalRange: p.normalRange || { min: undefined, max: undefined },
                normalRangeMale: p.normalRangeMale || p.normalRange_male || null,
                normalRangeFemale: p.normalRangeFemale || p.normalRange_female || null,
                normalRangePediatric: p.normalRangePediatric || p.normalRange_pediatric || null,
              }));
            }));
            detailsArrays.flat().forEach((p: any) => { paramMeta[p.id] = p; });
          } catch {}
        }

        const ageNum = sampleData?.age ? parseFloat(sampleData.age) : NaN;
        const isPediatric = !isNaN(ageNum) && ageNum < 13;
        const sex = (sampleData?.gender || '').toLowerCase();
        const group = isPediatric ? 'pediatric' : (sex.startsWith('f') ? 'female' : (sex.startsWith('m') ? 'male' : '')); 

        const resultsForTable = (sampleData.results || []);

        tableRows = resultsForTable.map((r: any) => {
          const meta = paramMeta[r.parameterId] || {};
          const name = r.label || meta.name || r.parameter || r.name || r.parameterId || '-';
          const unit = r.unit || meta.unit || '-';
          let normalText = r.normalText || '-';
          if (!r.normalText) {
            if (group === 'male' && meta.normalRangeMale) normalText = meta.normalRangeMale;
            else if (group === 'female' && meta.normalRangeFemale) normalText = meta.normalRangeFemale;
            else if (group === 'pediatric' && meta.normalRangePediatric) normalText = meta.normalRangePediatric;
            else if (meta.normalRange && (typeof meta.normalRange.min !== 'undefined' || typeof meta.normalRange.max !== 'undefined')) {
              const parts = [
                typeof meta.normalRange.min === 'number' ? `${meta.normalRange.min}` : '',
                typeof meta.normalRange.max === 'number' ? `${meta.normalRange.max}` : '',
              ].filter(Boolean);
              normalText = parts.length ? parts.join(' - ') : '-';
            }
          }
          const value = (typeof r.value === 'number' || typeof r.value === 'string') ? `${r.value}` : '-';
          const comment = r.comment ? String(r.comment) : '-';
          // Include comment in the same row
          return [name, normalText, unit, value, comment];
        });
      }

      if (!tableRows.length) tableRows = [[report.testName || '-', '-', '-', '-', '-']];

      (autoTable as any)(doc, {
        head: [['Test', 'Normal Value', 'Unit', 'Result', 'Comment']],
        body: tableRows,
        startY: cursorY,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', fontSize: 13, textColor: [0, 0, 0] },
        margin: { left: marginLeft, right: marginLeft },
      });

      // Start post-table sections (heading removed as requested)
      let afterTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : cursorY + 20;

      // Render Clinical Interpretation (label normal, content normal)
      if (sampleData?.interpretation) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text('Clinical Interpretation:', marginLeft, afterTableY);
        afterTableY += 12;
        const splitInterp = doc.splitTextToSize(String(sampleData.interpretation), 515);
        // Force interpretation content normal and slightly smaller
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(splitInterp, marginLeft, afterTableY);
        afterTableY += (splitInterp.length * 12);
      }

      // Render footer after all content is finalized
      renderFooter();

      if (mode === 'print') {
        const blob = (doc as any).output('blob');
        const url = URL.createObjectURL(blob);
        setPreviewReady(false);
        setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
        setPreviewOpen(true);
      } else {
        doc.save(`report-${report.id}.pdf`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF');
    }
  };

  const sendReport = (reportId: string) => {
    console.log(`Sending report ${reportId}`);
    // This would trigger email/portal delivery
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report Generator</h1>
          <p className="text-gray-600">Generate and manage test reports</p>
        </div>
      </div>

      {/* Custom Report Modal removed */}

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border rounded-md overflow-hidden text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="px-3 py-2 border-b">SR.NO</th>
              <th className="px-3 py-2 border-b">Date</th>
              <th className="px-3 py-2 border-b">Patient</th>
              <th className="px-3 py-2 border-b">Sample ID</th>
              <th className="px-3 py-2 border-b">Test</th>
              <th className="px-3 py-2 border-b">Status</th>
              <th className="px-3 py-2 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reportsToRender.map((report, idx) => (
              <tr key={report.id} data-report-id={report.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border-b">{(page-1)*limit + idx + 1}</td>
                <td className="px-3 py-2 border-b whitespace-nowrap">{report.createdAt.toLocaleString()}</td>
                <td className="px-3 py-2 border-b">{report.patientName}</td>
                <td className="px-3 py-2 border-b font-mono">{report.sampleId}</td>
                <td className="px-3 py-2 border-b">{report.testName}</td>
                <td className="px-3 py-2 border-b">
                  <Badge className={getStatusColor(report.status)}>{report.status}</Badge>
                </td>
                <td className="px-3 py-2 border-b text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => generatePDF(report.id, 'save')}>
                      <FileText className="w-4 h-4 mr-1" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generatePDF(report.id, 'print')}>
                      <Printer className="w-4 h-4 mr-1" /> Print
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {reportsToRender.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No reports found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {loading ? 'Loading...' : `${Math.min((page-1)*limit+1, Math.max(0, total))}-${Math.min(page*limit, Math.max(0, total))} of ${total}`}
        </div>
        <div className="flex items-center gap-2">
          <select className="px-2 py-1 border rounded text-sm" value={limit} onChange={(e)=>{ setPage(1); setLimit(parseInt(e.target.value)||10); }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <Button variant="outline" size="sm" onClick={()=> setPage(1)} disabled={page<=1}>First</Button>
          <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.max(1,p-1))} disabled={page<=1}>Prev</Button>
          <div className="px-2 text-sm">Page {page} / {totalPages}</div>
          <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages}>Next</Button>
          <Button variant="outline" size="sm" onClick={()=> setPage(totalPages)} disabled={page>=totalPages}>Last</Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={(open) => { if (open) setPreviewOpen(true); else closePreview(); }}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0">
          <DialogHeader className="px-6 py-4">
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          <div className="px-0">
            {previewUrl && (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-[65vh] border-0"
                onLoad={() => setPreviewReady(true)}
              />
            )}
          </div>
          <DialogFooter className="px-6 py-4">
            <Button onClick={handlePreviewPrint} disabled={!previewReady}>Print</Button>
            <DialogClose asChild>
              <Button variant="outline" onClick={closePreview}>OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

// Print handler to print only the selected report card
function handlePrint(reportId: string) {
  // Find the card element for the report
  const card = document.querySelector(`[data-report-id='${reportId}']`);
  if (!card) return;
  const printWindow = window.open('', '', 'width=800,height=600');
  if (!printWindow) return;
  printWindow.document.write('<html><head><title>Print Report</title>');
  // Optionally include styles
  const styles = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]'));
  styles.forEach(style => printWindow.document.write(style.outerHTML));
  printWindow.document.write('</head><body>');
  printWindow.document.write(card.outerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

export default ReportGenerator;
