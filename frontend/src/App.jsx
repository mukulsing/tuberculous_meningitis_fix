import React, { useState, useCallback } from 'react';
import axios from 'axios';

import {
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

// Backend API URL
const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Color helpers
const riskColor = r =>
  r === 'High'
    ? '#ef4444'
    : r === 'Moderate'
    ? '#f59e0b'
    : '#10b981';

// ─── Shared UI components ────────────────────────────────────────────────────
const Section = ({ title, icon, children, color = '#3b82f6' }) => (
  <div style={{ background: '#1e293b', borderRadius: 14, padding: '24px 28px', marginBottom: 20, border: `1px solid #334155` }}>
    <h3 style={{ color, fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>{title}
    </h3>
    {children}
  </div>
);

const Row = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px 20px', marginBottom: 4 }}>
    {children}
  </div>
);

const Field = ({ label, required, hint, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
      {label.toUpperCase()}
      {required && <span style={{ color: '#ef4444' }}>*</span>}
      {hint && <span title={hint} style={{ cursor: 'help', color: '#64748b', fontSize: 13 }}>ⓘ</span>}
    </label>
    {children}
  </div>
);

const inputStyle = {
  background: '#263044', border: '1.5px solid #334155', color: '#f1f5f9',
  borderRadius: 8, padding: '9px 12px', fontSize: 14, width: '100%'
};

const NumInput = ({ value, onChange, placeholder, min, max, step = 0.1 }) => (
  <input type="number" value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} min={min} max={max} step={step} style={inputStyle} />
);

const Select = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const YN = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {['Y', 'N'].map(v => (
      <button key={v} onClick={() => onChange(v)} style={{
        flex: 1, padding: '8px 0', borderRadius: 7, border: `1.5px solid ${value === v ? '#3b82f6' : '#334155'}`,
        background: value === v ? 'rgba(59,130,246,0.15)' : '#263044',
        color: value === v ? '#3b82f6' : '#94a3b8', fontWeight: 600, fontSize: 14, transition: 'all 0.15s'
      }}>{v === 'Y' ? 'Yes' : 'No'}</button>
    ))}
  </div>
);

// ─── INITIAL FORM STATE ───────────────────────────────────────────────────────
const INIT = {
  // Demographics
  'Age (years)': '', 'Sex': 'M',
  'Comorbid Illness (DM/HTN/HIV/Other)': 'NEGATIVE',

  // Symptoms
  'Fever (Y/N)': 'Y', 'Duration of fever (Months)': '',
  'Evening rise (Y/N)': 'N', 'Night sweats (Y/N)': 'N', 'Chills (Y/N)': 'N',
  'Headache (Y/N)': 'Y', 'Duration of headache (Months)': '',
  'Site': 'Y', 'Persistent (Y/N)': 'N', 'Progressive (Y/N)': 'N',
  'Vomiting (Y/N)': 'N', 'Altered sensorium (Y/N)': 'N', 'Behavioural changes (Y/N)': 'N',
  'Seizures (Y/N)': 'N', 'Seizure type': 'N',
  'Focal neurological deficit (Ophthalmoplegia/Hemiplegia/Other)': 'N',
  'Neck pain (Y/N)': 'N', 'Ear discharge (Y/N)': 'N',
  'Weight loss (Y/N)': 'N', 'Loss of appetite (Y/N)': 'N', 'Cough (Y/N)': 'N',
  'Lymph node swelling (Y/N)': 'N', 'Jaundice (Y/N)': 'N', 'Rash (Y/N)': 'N',
  'Joint pain (Y/N)': 'N',
  'Prior/concurrent TB (Y/N)': 'N', 'Contact with TB patient (Y/N)': 'N',
  'Past anti-TB treatment (Y/N)': 'N',

  // Vitals
  'Pulse (/min)': '', 'BP_sys': '', 'BP_dia': '',
  'Temp (°F)': '', 'RR (/min)': '', 'SpO2 (%)': '',

  // Neurological
  'GCS (E+V+M out of 15)': '', 'Meningeal signs': 'Y', 'Cranial nerve palsies': 'N',
  'Motor deficits': 'N', 'Cerebellar signs': 'N',
  'Features of Myelitis': 'N', 'Features of Arachnoiditis': 'N', 'Raised ICP': 'N',

  // Labs
  'Hb': '', 'TLC': '', 'Lymphocytes': '', 'Neutrophils': '',
  'Blood sugar (mg/dl)': '', 'Urea (mg/dL)': '', 'Creatinine (mg/dL)': '',
  'Bilirubin (mg/dL)': '', 'AST (U/L)': '', 'ALT (U/L)': '',
  'Na (mEQ/L)': '', 'K (mmol/L)': '',

  // CSF
  'CSF Count (cells/µL)': '', 'Neutrophils (%)': '', 'Lymphocytes (%)': '',
  'Protein (mg/dL)': '', 'Glucose (mg/dL)': '', 'CSF:Blood ratio': '',

  // Imaging
  'Systemic TB evidence': 'N', 'CBNAAT (Positive/Negative)': 'NEGATIVE',
  'Meningeal enhancement (Y/N)': 'N', 'Hydrocephalus (Y/N)': 'N',
  'Basal exudates (Y/N)': 'N', 'Tuberculomas (Y/N)': 'N', 'Infarcts (Y/N)': 'N',
};

// ─── RESULT PANEL ─────────────────────────────────────────────────────────────
function ResultPanel({ result, onReset }) {
  const isGood = result.prediction === 0;
  const rc = riskColor(result.risk_level);
  const COLORS = ['#3b82f6', '#1e3a5f'];

  const pieData = [
    { name: 'Poor', value: result.poor_prob },
    { name: 'Good', value: result.good_prob },
  ];
  const pieColors = ['#ef4444', '#10b981'];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      {/* Hero card */}
      <div style={{
        background: isGood
          ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
          : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
        borderRadius: 16, padding: '32px', marginBottom: 20,
        border: `1px solid ${isGood ? '#10b981' : '#ef4444'}44`,
        boxShadow: `0 8px 32px ${isGood ? '#10b98133' : '#ef444433'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: isGood ? '#6ee7b7' : '#fca5a5', fontWeight: 600, marginBottom: 6, letterSpacing: '0.06em' }}>
              AI PREDICTION RESULT
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>
              {isGood ? '✅ Good Outcome' : '⚠️ Poor Outcome'}
            </div>
            <div style={{ marginTop: 8, fontSize: 15, color: isGood ? '#a7f3d0' : '#fecaca' }}>
              {result.interpretation}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: '#fff' }}>{result.probability}%</div>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 2 }}>Confidence</div>
            <div style={{ marginTop: 8, display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
              background: rc + '22', color: rc, border: `1px solid ${rc}44` }}>
              {result.risk_level} Risk
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Donut chart */}
        <div style={{ background: '#1e293b', borderRadius: 14, padding: '20px', border: '1px solid #334155' }}>
          <h4 style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase' }}>
            Outcome Probability
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v.toFixed(1)}%`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 4 }}>
            {pieData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: pieColors[i], display: 'inline-block' }} />
                <span style={{ color: '#94a3b8' }}>{d.name}</span>
                <strong style={{ color: pieColors[i] }}>{d.value.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Top drivers */}
        <div style={{ background: '#1e293b', borderRadius: 14, padding: '20px', border: '1px solid #334155' }}>
          <h4 style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase' }}>
            Top Predictive Factors
          </h4>
          {result.top_drivers.map((d, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{d.feature.replace(' (Y/N)', '').replace(' (%)', ' %')}</span>
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>{d.importance}%</span>
              </div>
              <div style={{ height: 6, background: '#263044', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${Math.min(d.importance, 100)}%`, background: `linear-gradient(90deg, #3b82f6, #6366f1)`, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MRS Scale explanation */}
      <div style={{ background: '#1e293b', borderRadius: 14, padding: '20px', border: '1px solid #334155', marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase' }}>
          📊 Modified Rankin Scale (MRS) — Outcome Reference
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { score: '0', label: 'No symptoms', tag: 'good' },
            { score: '1', label: 'No significant disability', tag: 'good' },
            { score: '2', label: 'Slight disability', tag: 'good' },
            { score: '3', label: 'Moderate disability', tag: 'poor' },
            { score: '4', label: 'Moderate-severe disability', tag: 'poor' },
            { score: '5', label: 'Severe disability', tag: 'poor' },
            { score: '6', label: 'Death', tag: 'poor' },
          ].map(m => (
            <div key={m.score} style={{
              padding: '10px 12px', borderRadius: 8,
              background: m.tag === 'good' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${m.tag === 'good' ? '#10b98133' : '#ef444433'}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: m.tag === 'good' ? '#10b981' : '#ef4444' }}>MRS {m.score}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#263044', borderRadius: 8, fontSize: 13, color: '#94a3b8' }}>
          <strong style={{ color: '#3b82f6' }}>Note:</strong> MRS ≤ 2 = Good Outcome | MRS &gt; 2 = Poor Outcome. This AI model was trained on 64 TBM patients with 87.5% accuracy & 0.893 AUC-ROC.
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, marginBottom: 20, fontSize: 13, color: '#fcd34d' }}>
        ⚠️ <strong>Clinical Disclaimer:</strong> This tool is intended to assist clinical decision-making only. It does not replace professional medical judgment. Always correlate with complete clinical assessment.
      </div>

      <button onClick={onReset} style={{
        width: '100%', padding: '14px', borderRadius: 10, border: 'none',
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff',
        fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.03em'
      }}>
        🔄 New Prediction
      </button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [form, setForm]       = useState(INIT);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [step, setStep]       = useState(0);  // 0=form, 1=result
  const [activeTab, setActive] = useState(0);

  const set = useCallback((key, val) => setForm(p => ({ ...p, [key]: val })), []);

  const validate = () => {
    const required = ['Age (years)', 'GCS (E+V+M out of 15)'];
    for (const f of required) {
      if (!form[f] && form[f] !== 0) return `${f} is required.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/predict`, form);
      setResult(data);
      setStep(1);
    } catch (e) {
      setError(e?.response?.data?.error || 'Server error. Please check the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setForm(INIT); setResult(null); setStep(0); setError(''); };

  const tabs = ['Demographics', 'Symptoms', 'Vitals', 'Neuro Exam', 'Labs', 'CSF', 'Imaging'];

  // ── HEADER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      {/* Nav */}
      <nav style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🧠</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9', lineHeight: 1.2 }}>TBM Outcome AI</div>
              <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.05em' }}>CLINICAL PREDICTION TOOL</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
              ● GB Model
            </span>
            <span style={{ background: '#263044', color: '#94a3b8', borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>AUC 0.893</span>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px 48px' }}>
        {step === 1 && result ? (
          <ResultPanel result={result} onReset={handleReset} />
        ) : (
          <>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 14 }}>
                AI-POWERED · GRADIENT BOOSTING · 87.5% ACCURACY
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 10, lineHeight: 1.3 }}>
                Tuberculous Meningitis<br />
                <span style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  6-Month Outcome Predictor
                </span>
              </h1>
              <p style={{ color: '#64748b', maxWidth: 520, margin: '0 auto', fontSize: 15 }}>
                Enter clinical parameters to predict the 6-month neurological outcome and probability of good vs poor functional recovery (Modified Rankin Scale).
              </p>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[['87.5%','Accuracy'],['0.893','AUC-ROC'],['64','Patients'],['67','Features']].map(([v,l]) => (
                <div key={l} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6' }}>{v}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Tab nav */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
              {tabs.map((t, i) => (
                <button key={t} onClick={() => setActive(i)} style={{
                  padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${activeTab === i ? '#3b82f6' : '#334155'}`,
                  background: activeTab === i ? 'rgba(59,130,246,0.12)' : '#1e293b',
                  color: activeTab === i ? '#3b82f6' : '#64748b', fontSize: 13, fontWeight: activeTab === i ? 700 : 400,
                  whiteSpace: 'nowrap', transition: 'all 0.15s'
                }}>{t}</button>
              ))}
            </div>

            {/* ── TAB 0: Demographics ─────────────────────────────────── */}
            {activeTab === 0 && (
              <Section title="Patient Demographics & History" icon="👤" color="#3b82f6">
                <Row>
                  <Field label="Age" required hint="Patient's age in years">
                    <NumInput value={form['Age (years)']} onChange={v => set('Age (years)', v)} placeholder="e.g. 35" min={1} max={110} step={1} />
                  </Field>
                  <Field label="Sex">
                    <Select value={form['Sex']} onChange={v => set('Sex', v)}
                      options={[{value:'M',label:'Male'},{value:'F',label:'Female'}]} />
                  </Field>
                  <Field label="Comorbid Illness" hint="DM / HTN / HIV">
                    <Select value={form['Comorbid Illness (DM/HTN/HIV/Other)']} onChange={v => set('Comorbid Illness (DM/HTN/HIV/Other)', v)}
                      options={[{value:'NEGATIVE',label:'None'},{value:'HIV',label:'HIV Positive'}]} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Prior/Concurrent TB"><YN value={form['Prior/concurrent TB (Y/N)']} onChange={v => set('Prior/concurrent TB (Y/N)', v)} /></Field>
                  <Field label="Contact with TB Patient"><YN value={form['Contact with TB patient (Y/N)']} onChange={v => set('Contact with TB patient (Y/N)', v)} /></Field>
                  <Field label="Past Anti-TB Treatment"><YN value={form['Past anti-TB treatment (Y/N)']} onChange={v => set('Past anti-TB treatment (Y/N)', v)} /></Field>
                </Row>
              </Section>
            )}

            {/* ── TAB 1: Symptoms ─────────────────────────────────────── */}
            {activeTab === 1 && (
              <>
                <Section title="Fever & Constitutional Symptoms" icon="🌡️" color="#f59e0b">
                  <Row>
                    <Field label="Fever"><YN value={form['Fever (Y/N)']} onChange={v => set('Fever (Y/N)', v)} /></Field>
                    <Field label="Duration of Fever (months)" hint="How long has fever been present">
                      <NumInput value={form['Duration of fever (Months)']} onChange={v => set('Duration of fever (Months)', v)} placeholder="e.g. 2" min={0} step={0.5} />
                    </Field>
                    <Field label="Evening Rise"><YN value={form['Evening rise (Y/N)']} onChange={v => set('Evening rise (Y/N)', v)} /></Field>
                  </Row>
                  <Row>
                    <Field label="Night Sweats"><YN value={form['Night sweats (Y/N)']} onChange={v => set('Night sweats (Y/N)', v)} /></Field>
                    <Field label="Chills"><YN value={form['Chills (Y/N)']} onChange={v => set('Chills (Y/N)', v)} /></Field>
                    <Field label="Weight Loss"><YN value={form['Weight loss (Y/N)']} onChange={v => set('Weight loss (Y/N)', v)} /></Field>
                    <Field label="Loss of Appetite"><YN value={form['Loss of appetite (Y/N)']} onChange={v => set('Loss of appetite (Y/N)', v)} /></Field>
                  </Row>
                </Section>
                <Section title="Neurological Symptoms" icon="🧠" color="#6366f1">
                  <Row>
                    <Field label="Headache"><YN value={form['Headache (Y/N)']} onChange={v => set('Headache (Y/N)', v)} /></Field>
                    <Field label="Duration of Headache (months)">
                      <NumInput value={form['Duration of headache (Months)']} onChange={v => set('Duration of headache (Months)', v)} placeholder="e.g. 1" min={0} step={0.5} />
                    </Field>
                    <Field label="Persistent Headache"><YN value={form['Persistent (Y/N)']} onChange={v => set('Persistent (Y/N)', v)} /></Field>
                  </Row>
                  <Row>
                    <Field label="Vomiting"><YN value={form['Vomiting (Y/N)']} onChange={v => set('Vomiting (Y/N)', v)} /></Field>
                    <Field label="Altered Sensorium"><YN value={form['Altered sensorium (Y/N)']} onChange={v => set('Altered sensorium (Y/N)', v)} /></Field>
                    <Field label="Behavioural Changes"><YN value={form['Behavioural changes (Y/N)']} onChange={v => set('Behavioural changes (Y/N)', v)} /></Field>
                  </Row>
                  <Row>
                    <Field label="Seizures"><YN value={form['Seizures (Y/N)']} onChange={v => set('Seizures (Y/N)', v)} /></Field>
                    <Field label="Seizure Type">
                      <Select value={form['Seizure type']} onChange={v => set('Seizure type', v)}
                        options={[{value:'N',label:'None'},{value:'GTCS',label:'GTCS'}]} />
                    </Field>
                    <Field label="Focal Neurological Deficit" hint="Ophthalmoplegia / Hemiplegia / Other">
                      <Select value={form['Focal neurological deficit (Ophthalmoplegia/Hemiplegia/Other)']}
                        onChange={v => set('Focal neurological deficit (Ophthalmoplegia/Hemiplegia/Other)', v)}
                        options={[
                          {value:'N',label:'None'},{value:'HEMI',label:'Hemiplegia'},
                          {value:'OPH',label:'Ophthalmoplegia'},{value:'PARA',label:'Paraplegia'},
                          {value:'OPH+HEMI',label:'Oph + Hemi'},{value:'OPH+PARA',label:'Oph + Para'}
                        ]} />
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Neck Pain"><YN value={form['Neck pain (Y/N)']} onChange={v => set('Neck pain (Y/N)', v)} /></Field>
                    <Field label="Cough"><YN value={form['Cough (Y/N)']} onChange={v => set('Cough (Y/N)', v)} /></Field>
                    <Field label="Jaundice"><YN value={form['Jaundice (Y/N)']} onChange={v => set('Jaundice (Y/N)', v)} /></Field>
                    <Field label="Joint Pain"><YN value={form['Joint pain (Y/N)']} onChange={v => set('Joint pain (Y/N)', v)} /></Field>
                  </Row>
                </Section>
              </>
            )}

            {/* ── TAB 2: Vitals ──────────────────────────────────────── */}
            {activeTab === 2 && (
              <Section title="Vital Signs" icon="💓" color="#10b981">
                <Row>
                  <Field label="Pulse (bpm)" required>
                    <NumInput value={form['Pulse (/min)']} onChange={v => set('Pulse (/min)', v)} placeholder="e.g. 88" min={30} max={200} step={1} />
                  </Field>
                  <Field label="BP Systolic (mmHg)">
                    <NumInput value={form['BP_sys']} onChange={v => set('BP_sys', v)} placeholder="e.g. 120" min={60} max={250} step={1} />
                  </Field>
                  <Field label="BP Diastolic (mmHg)">
                    <NumInput value={form['BP_dia']} onChange={v => set('BP_dia', v)} placeholder="e.g. 80" min={40} max={150} step={1} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Temperature (°F)">
                    <NumInput value={form['Temp (°F)']} onChange={v => set('Temp (°F)', v)} placeholder="e.g. 100.4" min={94} max={108} />
                  </Field>
                  <Field label="Respiratory Rate (/min)">
                    <NumInput value={form['RR (/min)']} onChange={v => set('RR (/min)', v)} placeholder="e.g. 18" min={8} max={60} step={1} />
                  </Field>
                  <Field label="SpO₂ (%)">
                    <NumInput value={form['SpO2 (%)']} onChange={v => set('SpO2 (%)', v)} placeholder="e.g. 97" min={50} max={100} step={0.5} />
                  </Field>
                </Row>
              </Section>
            )}

            {/* ── TAB 3: Neuro Exam ──────────────────────────────────── */}
            {activeTab === 3 && (
              <Section title="Neurological Examination" icon="🔬" color="#8b5cf6">
                <Row>
                  <Field label="GCS Score (out of 15)" required hint="Glasgow Coma Scale: 3 (worst) to 15 (normal)">
                    <NumInput value={form['GCS (E+V+M out of 15)']} onChange={v => set('GCS (E+V+M out of 15)', v)} placeholder="3–15" min={3} max={15} step={1} />
                  </Field>
                  <Field label="Meningeal Signs"><YN value={form['Meningeal signs']} onChange={v => set('Meningeal signs', v)} /></Field>
                  <Field label="Cranial Nerve Palsies"><YN value={form['Cranial nerve palsies']} onChange={v => set('Cranial nerve palsies', v)} /></Field>
                </Row>
                <Row>
                  <Field label="Motor Deficits">
                    <Select value={form['Motor deficits']} onChange={v => set('Motor deficits', v)}
                      options={[{value:'N',label:'None'},{value:'Y',label:'Present'}]} />
                  </Field>
                  <Field label="Cerebellar Signs"><YN value={form['Cerebellar signs']} onChange={v => set('Cerebellar signs', v)} /></Field>
                  <Field label="Features of Myelitis"><YN value={form['Features of Myelitis']} onChange={v => set('Features of Myelitis', v)} /></Field>
                </Row>
                <Row>
                  <Field label="Features of Arachnoiditis"><YN value={form['Features of Arachnoiditis']} onChange={v => set('Features of Arachnoiditis', v)} /></Field>
                  <Field label="Raised ICP"><YN value={form['Raised ICP']} onChange={v => set('Raised ICP', v)} /></Field>
                </Row>
              </Section>
            )}

            {/* ── TAB 4: Labs ────────────────────────────────────────── */}
            {activeTab === 4 && (
              <>
                <Section title="Haematology" icon="🩸" color="#ef4444">
                  <Row>
                    <Field label="Haemoglobin (g/dL)">
                      <NumInput value={form['Hb']} onChange={v => set('Hb', v)} placeholder="e.g. 11.5" min={3} max={20} />
                    </Field>
                    <Field label="TLC (cells/µL)" hint="Total Leucocyte Count">
                      <NumInput value={form['TLC']} onChange={v => set('TLC', v)} placeholder="e.g. 8500" min={500} max={50000} step={50} />
                    </Field>
                    <Field label="Lymphocytes (%)">
                      <NumInput value={form['Lymphocytes']} onChange={v => set('Lymphocytes', v)} placeholder="e.g. 30" min={0} max={100} />
                    </Field>
                    <Field label="Neutrophils (%)">
                      <NumInput value={form['Neutrophils']} onChange={v => set('Neutrophils', v)} placeholder="e.g. 65" min={0} max={100} />
                    </Field>
                  </Row>
                </Section>
                <Section title="Biochemistry" icon="⚗️" color="#f59e0b">
                  <Row>
                    <Field label="Blood Sugar (mg/dL)">
                      <NumInput value={form['Blood sugar (mg/dl)']} onChange={v => set('Blood sugar (mg/dl)', v)} placeholder="e.g. 95" min={30} max={500} />
                    </Field>
                    <Field label="Urea (mg/dL)">
                      <NumInput value={form['Urea (mg/dL)']} onChange={v => set('Urea (mg/dL)', v)} placeholder="e.g. 28" min={5} max={300} />
                    </Field>
                    <Field label="Creatinine (mg/dL)">
                      <NumInput value={form['Creatinine (mg/dL)']} onChange={v => set('Creatinine (mg/dL)', v)} placeholder="e.g. 0.9" min={0.1} max={20} />
                    </Field>
                    <Field label="Bilirubin (mg/dL)" hint="Important predictor!">
                      <NumInput value={form['Bilirubin (mg/dL)']} onChange={v => set('Bilirubin (mg/dL)', v)} placeholder="e.g. 0.8" min={0} max={30} />
                    </Field>
                  </Row>
                  <Row>
                    <Field label="AST (U/L)">
                      <NumInput value={form['AST (U/L)']} onChange={v => set('AST (U/L)', v)} placeholder="e.g. 35" min={5} max={2000} step={1} />
                    </Field>
                    <Field label="ALT (U/L)">
                      <NumInput value={form['ALT (U/L)']} onChange={v => set('ALT (U/L)', v)} placeholder="e.g. 30" min={5} max={2000} step={1} />
                    </Field>
                    <Field label="Sodium (mEq/L)">
                      <NumInput value={form['Na (mEQ/L)']} onChange={v => set('Na (mEQ/L)', v)} placeholder="e.g. 136" min={100} max={170} step={1} />
                    </Field>
                    <Field label="Potassium (mmol/L)">
                      <NumInput value={form['K (mmol/L)']} onChange={v => set('K (mmol/L)', v)} placeholder="e.g. 4.1" min={1} max={10} />
                    </Field>
                  </Row>
                </Section>
              </>
            )}

            {/* ── TAB 5: CSF ─────────────────────────────────────────── */}
            {activeTab === 5 && (
              <Section title="Cerebrospinal Fluid Analysis" icon="🔭" color="#06b6d4">
                <Row>
                  <Field label="CSF Cell Count (cells/µL)">
                    <NumInput value={form['CSF Count (cells/µL)']} onChange={v => set('CSF Count (cells/µL)', v)} placeholder="e.g. 200" min={0} max={5000} step={1} />
                  </Field>
                  <Field label="CSF Neutrophils (%)">
                    <NumInput value={form['Neutrophils (%)']} onChange={v => set('Neutrophils (%)', v)} placeholder="e.g. 20" min={0} max={100} />
                  </Field>
                  <Field label="CSF Lymphocytes (%)">
                    <NumInput value={form['Lymphocytes (%)']} onChange={v => set('Lymphocytes (%)', v)} placeholder="e.g. 75" min={0} max={100} />
                  </Field>
                </Row>
                <Row>
                  <Field label="CSF Protein (mg/dL)">
                    <NumInput value={form['Protein (mg/dL)']} onChange={v => set('Protein (mg/dL)', v)} placeholder="e.g. 120" min={0} max={2000} step={1} />
                  </Field>
                  <Field label="CSF Glucose (mg/dL)">
                    <NumInput value={form['Glucose (mg/dL)']} onChange={v => set('Glucose (mg/dL)', v)} placeholder="e.g. 40" min={0} max={200} />
                  </Field>
                  <Field label="CSF:Blood Glucose Ratio">
                    <NumInput value={form['CSF:Blood ratio']} onChange={v => set('CSF:Blood ratio', v)} placeholder="e.g. 0.42" min={0} max={1} />
                  </Field>
                </Row>
                <Row>
                  <Field label="CBNAAT Result" hint="Cartridge-Based Nucleic Acid Amplification Test">
                    <Select value={form['CBNAAT (Positive/Negative)']} onChange={v => set('CBNAAT (Positive/Negative)', v)}
                      options={[{value:'NEGATIVE',label:'Negative'},{value:'POSITIVE',label:'Positive'}]} />
                  </Field>
                </Row>
              </Section>
            )}

            {/* ── TAB 6: Imaging ─────────────────────────────────────── */}
            {activeTab === 6 && (
              <Section title="Imaging & Systemic Findings" icon="🖼️" color="#14b8a6">
                <Row>
                  <Field label="Meningeal Enhancement"><YN value={form['Meningeal enhancement (Y/N)']} onChange={v => set('Meningeal enhancement (Y/N)', v)} /></Field>
                  <Field label="Hydrocephalus"><YN value={form['Hydrocephalus (Y/N)']} onChange={v => set('Hydrocephalus (Y/N)', v)} /></Field>
                  <Field label="Basal Exudates"><YN value={form['Basal exudates (Y/N)']} onChange={v => set('Basal exudates (Y/N)', v)} /></Field>
                </Row>
                <Row>
                  <Field label="Tuberculomas"><YN value={form['Tuberculomas (Y/N)']} onChange={v => set('Tuberculomas (Y/N)', v)} /></Field>
                  <Field label="Infarcts" hint="Key predictor of poor outcome">
                    <YN value={form['Infarcts (Y/N)']} onChange={v => set('Infarcts (Y/N)', v)} />
                  </Field>
                  <Field label="Systemic TB Evidence"><YN value={form['Systemic TB evidence']} onChange={v => set('Systemic TB evidence', v)} /></Field>
                </Row>
              </Section>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 14, marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {activeTab > 0 && (
                <button onClick={() => setActive(t => t - 1)} style={{
                  flex: 1, padding: '13px', borderRadius: 10, border: '1.5px solid #334155',
                  background: 'transparent', color: '#94a3b8', fontSize: 15, fontWeight: 600
                }}>← Back</button>
              )}
              {activeTab < tabs.length - 1 ? (
                <button onClick={() => setActive(t => t + 1)} style={{
                  flex: 2, padding: '13px', borderRadius: 10, border: 'none',
                  background: '#263044', color: '#f1f5f9', fontSize: 15, fontWeight: 600
                }}>Next: {tabs[activeTab + 1]} →</button>
              ) : null}
              <button onClick={handleSubmit} disabled={loading} style={{
                flex: 2, padding: '13px', borderRadius: 10, border: 'none',
                background: loading ? '#1e293b' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.03em',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)'
              }}>
                {loading ? '⏳ Predicting...' : '🔮 Predict Outcome'}
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#64748b' }}>
                <span>Form progress</span>
                <span>Step {activeTab + 1}/{tabs.length}</span>
              </div>
              <div style={{ height: 4, background: '#263044', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${((activeTab + 1) / tabs.length) * 100}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1e293b', padding: '20px', textAlign: 'center', color: '#334155', fontSize: 12 }}>
        TBM Outcome Predictor · Gradient Boosting Model · 64 patients · 87.5% accuracy · For clinical research use only
      </footer>
    </div>
  );
}
