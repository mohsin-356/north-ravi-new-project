import React, { useState } from 'react';

const pageBorder = '2px solid #000';
const tableBorder = '1px solid #000';
const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: 14 };
const line: React.CSSProperties = { borderBottom: '1px solid #000', height: 18 };
const smallLine: React.CSSProperties = { borderBottom: '1px solid #000', height: 16, width: 140 };
const tiny: React.CSSProperties = { fontSize: 12 };
const textInput: React.CSSProperties = {
  border: '1px solid #000',
  height: 26,
  padding: '0 6px',
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
};

const BoxRow: React.FC<{ count: number; boxSize?: number; gap?: number }> = ({ count, boxSize = 20, gap = 2 }) => (
  <div style={{ display: 'grid', gridAutoFlow: 'column', gap }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ width: boxSize, height: boxSize, border: '1px solid #000' }} />
    ))}
  </div>
);

type RDProps = { patient?: { name?: string; mrn?: string; mrNumber?: string; gender?: string; age?: string|number; address?: string } };
export function ReceivedDeathCertificatePage33({ patient }: RDProps) {
  const [editable, setEditable] = useState(true);
  const ageSexDefault = (()=>{
    const age = patient?.age ? String(patient.age) : '';
    const g = (patient?.gender||'').toString().trim();
    const sex = g ? g.charAt(0).toUpperCase() : '';
    if (!age && !sex) return '';
    if (age && sex) return `${age}/${sex}`;
    return age || sex;
  })();
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'sticky', top: 8, left: 0, display: 'flex', justifyContent: 'flex-end', zIndex: 10 }}>
        <button
          onClick={() => setEditable(e => !e)}
          style={{ padding: '6px 10px', border: '1px solid #aaa', borderRadius: 6, background: editable ? '#e0f2fe' : '#f1f5f9', cursor: 'pointer', fontSize: 12 }}
        >
          {editable ? 'Editing Enabled' : 'Enable Edit'}
        </button>
      </div>
      <div style={{ border: pageBorder, padding: 12, background: '#fff', maxWidth: '100%' }} contentEditable={false}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 160px', alignItems: 'center', gap: 8 }}>
            <div style={labelStyle}>Sr. No :</div>
            <input style={{ ...textInput, minWidth: 0 }} />
          </div>
          <div />
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 160px', alignItems: 'center', gap: 8, justifySelf: 'end' }}>
            <div style={labelStyle}>Sr. No :</div>
            <input style={{ ...textInput, minWidth: 0 }} />
          </div>
        </div>

        {/* Titles */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, marginTop: 10, border: tableBorder, padding: 4 }}>
          DEATH CERTIFICATE
        </div>
        <div style={{ textAlign: 'center', fontWeight: 700, marginTop: 4 }}>(RECEIVED DEAD)</div>
        <div style={{ textAlign: 'center', fontWeight: 700, marginTop: 4 }}>EMERGENCY WARD</div>

        {/* MR# and CNIC */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div style={labelStyle}>MR #</div>
          <input style={textInput} defaultValue={patient?.mrn||patient?.mrNumber||''} placeholder="Enter MR #" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={labelStyle}>PATIENT CNIC (IF AVAILABLE)</div>
          <input style={textInput} placeholder="Enter Patient CNIC" />
        </div>

        {/* Patient Info Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto 160px', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div style={labelStyle}>PATIENT Name:</div>
          <input style={textInput} defaultValue={patient?.name||''} placeholder="Enter patient name" />
          <div style={labelStyle}>S/O, D/O, W/O</div>
          <input style={textInput} placeholder="Enter S/O, D/O, W/O" />
          <div style={labelStyle}>AGE/SEX</div>
          <input style={{ ...textInput, minWidth: 140 }} defaultValue={ageSexDefault} placeholder={patient?.gender? `e.g., ${patient.gender}` : 'e.g., 45/M'} />
        </div>

        {/* Reported in Emergency */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(140px,1fr) auto minmax(120px,1fr)', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div>Patient reported in Emergency in dated</div>
          <input type="date" style={{ ...textInput, width: '100%', minWidth: 0 } as any} />
          <div>Time</div>
          <input type="time" style={{ ...textInput, width: '100%', minWidth: 0 } as any} />
        </div>

        {/* Receiving Parameters */}
        <div style={{ marginTop: 12, fontWeight: 700 }}>RECEIVING PARAMETERS:</div>
        <div style={{ display: 'grid', rowGap: 6, marginTop: 6 }}>
          {['Pulse','Blood Pressure','Respiratory Rate','Pupils','Corneal Reflex','ECG'].map(label=> (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '12px auto 1fr', alignItems: 'center', gap: 6 }}>
              <div>•</div><div>{label}</div><input style={textInput} />
            </div>
          ))}
        </div>

        {/* Diagnosis */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div style={labelStyle}>Diagnosis:</div>
          <input style={textInput} />
        </div>

        {/* Received Dead section heading line */}
        <div style={{ textAlign: 'center', fontWeight: 700, marginTop: 10 }}>Received Dead</div>

        {/* Attendant + Relation + Address */}
        <div style={{ display: 'grid', rowGap: 10, marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'center', gap: 8 }}>
            <div>Dead body received by attendant Name</div>
            <input style={textInput} />
            <div>S/O, D/O, W/O</div>
            <input style={textInput} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'center', gap: 8 }}>
            <div>Relation with the patient</div>
            <input style={textInput} />
            <div>Address</div>
            <input style={textInput} defaultValue={patient?.address||''} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 8 }}>
            <div>CNIC of Attendant Receiving dead body:</div>
            <input style={textInput} placeholder="Enter Attendant CNIC" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 8 }}>
            <div>Death Declared By/ Doctors:</div>
            <input style={textInput} />
          </div>
        </div>

        {/* Footer lines */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, marginTop: 18 }}>
          <div style={{ display: 'grid', rowGap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8 }}>
              <div>DR.</div>
              <div style={line} />
            </div>
            <div style={{ ...tiny }}>Signature / Name Designation / Stamp</div>
          </div>
          <div style={{ display: 'grid', alignContent: 'end' }}>
            <div style={{ ...tiny, textAlign: 'right' }}>Charge Nurse Name & Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceivedDeathCertificatePage33;