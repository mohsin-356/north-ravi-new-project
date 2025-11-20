import React, { useState } from 'react';

const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 16, color: '#111' };
const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;
const box = { width: 18, height: 18, border: '1px solid #333', display: 'inline-block' } as React.CSSProperties;
const tableBorder = '1px solid #333';

const Header = () => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
      <div style={{ display: 'grid', rowGap: 2 }}>
        <div style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase', textAlign: 'center' }}>
          CHEEMA HEART COMPLEX & GENERAL HOSPITAL
        </div>
        <div style={{ fontSize: 12, textAlign: 'center' }}>
          Mian Zia-ul-Haq Road, Near Lords Hotel, District Courts Gujranwala
        </div>
        <div style={{ fontSize: 12, textAlign: 'center' }}>
          Tel: 055-3255959, 3731559, Mob: 0300-9649291, cheemaheartcomplex@gmail.com
        </div>
      </div>
      <div style={{ display: 'grid', rowGap: 6, justifyItems: 'end' }}>
        <div style={{ border: '1px solid #333', padding: '4px 8px', fontWeight: 700 }}>PHC Reg: No: 00873</div>
        <div style={{ fontWeight: 700, fontSize: 20 }}>950</div>
      </div>
    </div>

    <div style={{ textAlign: 'center', fontWeight: 900, marginTop: 6 }}>SHORT STAY FORM</div>

    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'end', gap: 8, marginTop: 8 }}>
      <div>OPD Receipt no:</div><div style={line} />
      <div>Page No:</div><div style={line} />
    </div>
  </div>
);

export function ShortStayFormPage32() {
  const [editable, setEditable] = useState(true);
  return (
    <div style={container}>
      <div style={{ width: '100%', maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 6 }}>
          <button onClick={() => setEditable(e=>!e)} style={{ padding: '6px 10px', border: '1px solid #aaa', borderRadius: 6, background: editable ? '#e0f2fe' : '#f1f5f9', cursor: 'pointer', fontSize: 12 }}>{editable ? 'Editing Enabled' : 'Enable Edit'}</button>
        </div>
        <div style={page} contentEditable={editable} suppressContentEditableWarning>
          <Header />
          <TopPatientBlock />
          <LinedRow label="Presenting Complains:" rows={3} />
          <LinedRow label="Brief History:" rows={2} />
          <LinedRow label="Any procedure:" rows={2} />
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 200px', alignItems: 'end', gap: 8, marginTop: 8 }}>
            <div>Final diagnosis:</div><div style={line} />
            <div>Consultant:</div><div style={line} />
          </div>
          <VitalsAndTests />
          <Treatments />
          <Referral />
          <DischargeResponse />
          <FollowUpAndFooter />
          <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>32</div>
        </div>
      </div>
    </div>
  );
}

export default ShortStayFormPage32;

const TopPatientBlock = () => (
  <div style={{ display: 'grid', rowGap: 8 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 160px auto 100px auto 100px', alignItems: 'end', gap: 8 }}>
      <div>Patient's Name:</div><div style={line} />
      <div>MR#</div><div style={line} />
      <div>Age:</div><div style={line} />
      <div>Sex:</div><div style={line} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 160px auto 160px', alignItems: 'end', gap: 8 }}>
      <div>Address:</div><div style={line} />
      <div>Date & Time in</div><div style={line} />
      <div>Date & time out</div><div style={line} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr', alignItems: 'center', columnGap: 10 }}>
      <div style={{ display: 'grid', gridAutoFlow: 'column', alignItems: 'center', gap: 6 }}>
        <div>OPD</div><div style={box} />
      </div>
      <div />
      <div style={{ display: 'grid', gridAutoFlow: 'column', alignItems: 'center', gap: 6 }}>
        <div>Short Stay</div><div style={box} />
      </div>
      <div />
      <div style={{ display: 'grid', gridAutoFlow: 'column', alignItems: 'center', gap: 6 }}>
        <div>Referred</div><div style={box} />
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'end', gap: 8 }}>
      <div>Admission to:</div><div style={line} />
      <div />
      <div />
    </div>
  </div>
);

const Ruled = ({ rows = 2, tall = 26 }: { rows?: number; tall?: number }) => (
  <div style={{ borderLeft: tableBorder, borderRight: tableBorder, borderTop: tableBorder, marginTop: 4 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ borderBottom: tableBorder, minHeight: tall }} />
    ))}
  </div>
);

const LinedRow = ({ label, rows = 1, tall = 26 }: { label: string; rows?: number; tall?: number }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8 }}>
      <div>{label}</div>
      <div />
    </div>
    <Ruled rows={rows} tall={tall} />
  </div>
);

const VitalsAndTests = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
    {/* Vitals grid */}
    <div style={{ border: tableBorder }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', borderBottom: tableBorder }}>
        <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>BP</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', borderBottom: tableBorder }}>
        <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>HR</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', borderBottom: tableBorder }}>
        <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>SPO2</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', borderBottom: tableBorder }}>
        <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Temp</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr' }}>
        <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>FHR</div>
        <div />
      </div>
    </div>

    {/* Tests table */}
    <div style={{ borderLeft: tableBorder, borderRight: tableBorder }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px' }}>
        <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Test</div>
        <div style={{ borderTop: tableBorder, padding: '4px 6px', fontWeight: 700, textAlign: 'center' }}>Results</div>
      </div>
      {['Hb', 'Bilirubin D/Ind', 'BSR', 'Urea', 'S,Creat'].map((t, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px' }}>
          <div style={{ borderRight: tableBorder, borderBottom: tableBorder, padding: '4px 6px' }}>{t}</div>
          <div style={{ borderBottom: tableBorder, minHeight: 26 }} />
        </div>
      ))}
    </div>
  </div>
);

const Treatments = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
    <div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Treatment Given at Hospital:</div>
      <Ruled rows={8} tall={28} />
    </div>
    <div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Treatment at Discharge:</div>
      <Ruled rows={8} tall={28} />
    </div>
  </div>
);

const Referral = () => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 200px', alignItems: 'end', gap: 8 }}>
      <div>Referred to / center name:</div><div style={line} />
      <div>Contact No:</div><div style={line} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8, marginTop: 8 }}>
      <div>Reason for referral:</div>
      <div style={line} />
    </div>
  </div>
);

const DischargeResponse = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
    <div style={{ border: tableBorder, padding: 6 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Condition at Discharge:</div>
      <div style={{ display: 'grid', gridAutoFlow: 'column', justifyContent: 'start', gap: 16, alignItems: 'center' }}>
        <span style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center' }}><div style={box} /> Satisfactory</span>
        <span style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center' }}><div style={box} /> Fair</span>
        <span style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center' }}><div style={box} /> Poor</span>
      </div>
    </div>
    <div style={{ border: tableBorder, padding: 6 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
        <span>Response of Treatment:</span>
        <span style={{ display: 'grid', gridAutoFlow: 'column', gap: 12, alignItems: 'center' }}>
          <span style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center' }}>Excellent <div style={box} /></span>
          <span style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center' }}>Good <div style={box} /></span>
          <span style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center' }}>Average <div style={box} /></span>
          <span style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center' }}>Poor <div style={box} /></span>
        </span>
      </div>
    </div>
  </div>
);

const FollowUpAndFooter = () => (
  <div style={{ marginTop: 8, borderTop: tableBorder, padding: 8, width: '100%', boxSizing: 'border-box', overflow: 'hidden', marginRight: 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8 }}>
      <div>Follow up Instructions:</div>
      <div style={line} />
    </div>

    {/* Urdu line */}
    <div style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>
      درج ذیل تاریخ کو ہسپتال بُلا کے ڈاکٹر انین فائل چیک کرنے میں معتمد کریں۔ شکریہ!
    </div>

    {/* Extra labeled Urdu lines as in photo */}
    <div style={{ display: 'grid', rowGap: 6, marginTop: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', columnGap: 8, direction: 'rtl' }}>
        <div>تاریخِ معائنہ:</div>
        <div style={line} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', columnGap: 8, direction: 'rtl' }}>
        <div>ہدایات برائے خوراک:</div>
        <div style={line} />
      </div>
    </div>

    {/* Doctor/Sign/Date/Time/Stamp */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', columnGap: 10, marginTop: 10 }}>
      {/* Left: Doctor Name / Stamp */}
      <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8 }}>
          <div>Doctor Name:</div>
          <div style={line} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8 }}>
          <div>Stamp</div>
          <div style={line} />
        </div>
      </div>

      {/* Right: Sign + Date on first row, Time on second */}
      <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 10, paddingRight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 160px  auto 120px', alignItems: 'end', columnGap: 8 }}>
          <div>Sign:</div>
          <div style={{ ...line, width: 160 }} />
          <div>Date:</div>
          <div style={{ ...line, width: 120 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 160px', alignItems: 'end', columnGap: 8 }}>
          <div>Time:</div>
          <div style={{ ...line, width: 160 }} />
        </div>
      </div>
    </div>
  </div>
);