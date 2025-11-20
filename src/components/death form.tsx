import React, { useState } from 'react';

const pageBorder = '2px solid #000';
const tableBorder = '1px solid #000';
const bold: React.CSSProperties = { fontWeight: 700 };
const tiny: React.CSSProperties = { fontSize: 12 };
const line: React.CSSProperties = { borderBottom: '1px solid #000', height: 18 };
const box: React.CSSProperties = { border: tableBorder, minHeight: 26 };

export function DeathCertificatePage34() {
  const [editable, setEditable] = useState(true);
  return (
    <div style={{ position: 'relative' }}>
      <div className="print-hide" style={{ position: 'sticky', top: 8, left: 0, display: 'flex', justifyContent: 'flex-end', zIndex: 10 }}>
        <button onClick={() => setEditable(e=>!e)} style={{ padding: '6px 10px', border: '1px solid #aaa', borderRadius: 6, background: editable ? '#e0f2fe' : '#f1f5f9', cursor: 'pointer', fontSize: 12 }}>
          {editable ? 'Editing Enabled' : 'Enable Edit'}
        </button>
      </div>
      <div style={{ border: pageBorder, padding: 12, background: '#fff' }} contentEditable={editable} suppressContentEditableWarning>

      {/* DC No and Title */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, alignItems: 'center', marginTop: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 220px', columnGap: 8, alignItems: 'end' }}>
          <div style={bold}>DC. No:</div>
          <div style={line} />
        </div>
        <div style={{ ...bold, textAlign: 'center', border: tableBorder, padding: 6 }}>DEATH CERTIFICATE</div>
      </div>

      {/* Top info grid (MR, Date, etc.) */}
      <div style={{ border: tableBorder, marginTop: 10 }}>
        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px 1fr', alignItems: 'stretch' }}>
          <div style={{ ...box, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>MR Number:</div>
          <div style={{ ...box }} />
          <div style={{ ...box, borderLeft: tableBorder, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Date:</div>
          <div style={{ ...box }} />
        </div>
        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 1fr' }}>
          <div style={{ ...box, borderTop: 'none', borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Patient Name</div>
          <div style={{ ...box, borderTop: 'none' }} />
          <div style={{ ...box, borderTop: 'none', borderLeft: tableBorder, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>S/o, D/o, W/o:</div>
          <div style={{ ...box, borderTop: 'none' }} />
        </div>
        {/* Row 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 1fr' }}>
          <div style={{ ...box, borderTop: 'none', borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Age/Sex:</div>
          <div style={{ ...box, borderTop: 'none' }} />
          <div style={{ ...box, borderTop: 'none', borderLeft: tableBorder, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Address:</div>
          <div style={{ ...box, borderTop: 'none' }} />
        </div>
        {/* Row 4 */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 1fr' }}>
          <div style={{ ...box, borderTop: 'none', borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Admission Date & Time:</div>
          <div style={{ ...box, borderTop: 'none' }} />
          <div style={{ ...box, borderTop: 'none', borderLeft: tableBorder, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Death Date & Time:</div>
          <div style={{ ...box, borderTop: 'none' }} />
        </div>
      </div>

      {/* Large sections */}
      <div style={{ marginTop: 10 }}>
        <div style={{ border: tableBorder, borderBottom: 'none', padding: 6, ...bold }}>Presenting Complaints:</div>
        <div style={{ border: tableBorder, height: 80 }} />

        <div style={{ border: tableBorder, borderBottom: 'none', marginTop: 10, padding: 6, ...bold }}>Diagnosis:</div>
        <div style={{ border: tableBorder, height: 60 }} />

        <div style={{ border: tableBorder, borderBottom: 'none', marginTop: 10, padding: 6, ...bold }}>Primary Cause of Death:</div>
        <div style={{ border: tableBorder, height: 60 }} />

        <div style={{ border: tableBorder, borderBottom: 'none', marginTop: 10, padding: 6, ...bold }}>Secondary Cause of Death:</div>
        <div style={{ border: tableBorder, height: 60 }} />
      </div>

      {/* Dead body received by name */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', columnGap: 8, marginTop: 10 }}>
        <div>Dead Body Received By Name:</div>
        <div style={line} />
      </div>

      {/* Relation / ID Card / Date & Time / Sign */}
      <div style={{ border: tableBorder, marginTop: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px 1fr', alignItems: 'stretch' }}>
          <div style={{ ...box, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Relation:</div>
          <div style={{ ...box }} />
          <div style={{ ...box, borderLeft: tableBorder, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>ID Card No</div>
          <div style={{ ...box }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px 1fr', alignItems: 'stretch' }}>
          <div style={{ ...box, borderTop: 'none', borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Date & Time</div>
          <div style={{ ...box, borderTop: 'none' }} />
          <div style={{ ...box, borderTop: 'none', borderLeft: tableBorder, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Sign:</div>
          <div style={{ ...box, borderTop: 'none' }} />
        </div>
      </div>

      {/* Staff and Doctor blocks */}
      <div style={{ border: tableBorder, marginTop: 10 }}>
        {/* Staff row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 120px', alignItems: 'stretch' }}>
          <div style={{ ...box, display: 'grid', gridTemplateRows: 'auto 1fr', padding: '0 8px' }}>
            <div>Staff Name:</div>
            <div style={{ borderTop: tableBorder, padding: 6 }}>Stamp</div>
          </div>
          <div style={{ ...box, borderLeft: tableBorder, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Sign:</div>
          <div style={{ ...box, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Date:</div>
          <div style={{ ...box, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Time:</div>
        </div>
        {/* Doctor row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 120px', alignItems: 'stretch' }}>
          <div style={{ ...box, borderTop: 'none', display: 'grid', gridTemplateRows: 'auto 1fr', padding: '0 8px' }}>
            <div>Doctor Name:</div>
            <div style={{ borderTop: tableBorder, padding: 6 }}>Stamp</div>
          </div>
          <div style={{ ...box, borderTop: 'none', borderLeft: tableBorder, borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Sign:</div>
          <div style={{ ...box, borderTop: 'none', borderRight: tableBorder, display: 'grid', alignItems: 'center', padding: '0 8px' }}>Date:</div>
          <div style={{ ...box, borderTop: 'none', display: 'grid', alignItems: 'center', padding: '0 8px' }}>Time:</div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default DeathCertificatePage34;
