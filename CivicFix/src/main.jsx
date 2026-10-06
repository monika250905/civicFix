import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = '/api';
const NAV = [['Dashboard', '▦'], ['Complaints', '▤'], ['Geospatial', '⌖'], ['Analytics', '◔'], ['Team', '♙']];
const STATUSES = ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
const STATUS_LABEL = { UNDER_REVIEW: 'Under review', ASSIGNED: 'Assigned', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved', REJECTED: 'Rejected' };
const ROLE_LABEL = { CITIZEN: 'Citizen', DEPARTMENT_OFFICER: 'Department officer', ADMIN: 'Administrator' };

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || data?.message || data?.error || `Request failed (${response.status})`);
  return data;
}

function App() {
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem('civicfix-session')); } catch { return null; } });
  const [page, setPage] = useState('Dashboard');
  const [complaints, setComplaints] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const role = session?.role || 'CITIZEN';
  const reload = useCallback(async () => {
    if (!session?.token) return;
    setBusy(true); setError('');
    try { setComplaints(await request('/complaints', { token: session.token })); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [session]);
  useEffect(() => { reload(); }, [reload]);

  const signIn = payload => { localStorage.setItem('civicfix-session', JSON.stringify(payload)); setSession(payload); setPage('Dashboard'); };
  const signOut = () => { localStorage.removeItem('civicfix-session'); setSession(null); setComplaints([]); };
  const notify = message => { setToast(message); window.setTimeout(() => setToast(''), 3000); };
  const submitReport = async form => {
    const created = await request('/complaints', { token: session.token, method: 'POST', body: JSON.stringify(form) });
    setComplaints(items => [created, ...items]); setShowReport(false); setPage('Complaints'); notify(`Report ${created.referenceCode} submitted`);
  };
  const updateStatus = async (item, value, details) => {
    const updated = await request(`/complaints/${item.id}/status`, { token: session.token, method: 'PATCH', body: JSON.stringify({ value, details }) });
    setComplaints(items => items.map(c => c.id === item.id ? updated : c)); notify(`${item.referenceCode} updated`);
  };
  const filtered = useMemo(() => complaints.filter(c => (filter === 'ALL' || c.status === filter) &&
    (!search || `${c.referenceCode} ${c.title} ${c.category} ${c.address} ${c.department}`.toLowerCase().includes(search.toLowerCase()))), [complaints, filter, search]);

  if (!session) return <AuthScreen onSuccess={signIn}/>;
  const links = NAV.filter(([name]) => name !== 'Team' || role === 'ADMIN');
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-icon">⌁</span><span>Civic<span>Fix</span></span></div>
      <div className="workspace"><small>WORKSPACE</small><div className="workspace-name"><i/>City services</div></div>
      <nav>{links.map(([name, icon]) => <button key={name} className={page === name ? 'active' : ''} onClick={() => setPage(name)}><span>{icon}</span>{name}</button>)}</nav>
      <div className="side-bottom"><div className="profile"><div className="avatar">{session.name?.split(' ').map(x => x[0]).join('').slice(0, 2)}</div><div className="profile-info"><b>{session.name}</b><small>{ROLE_LABEL[role]}</small></div></div><button className="signout" onClick={signOut}>↪ Sign out</button></div>
    </aside>
    <main className="main"><header className="topbar"><div><p className="eyebrow">CIVIC SERVICE PORTAL</p><h1>{page}</h1></div><div className="top-actions"><span className="role-chip">{ROLE_LABEL[role]}</span>{role === 'CITIZEN' && <button className="primary" onClick={() => setShowReport(true)}>＋ Report an issue</button>}</div></header>
      {error && <div className="alert">{error}<button onClick={reload}>Retry</button></div>}
      {busy && <div className="loading"><span/>Loading your workspace...</div>}
      {!busy && page === 'Dashboard' && <Dashboard role={role} items={complaints} onPage={setPage} onReport={() => setShowReport(true)}/>}
      {!busy && page === 'Complaints' && <ComplaintPage role={role} items={filtered} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} onStatus={updateStatus} token={session.token}/>}
      {!busy && page === 'Geospatial' && <GeoPage items={complaints}/>}
      {!busy && page === 'Analytics' && <AnalyticsPage items={complaints}/>}
      {!busy && page === 'Team' && role === 'ADMIN' && <TeamPage token={session.token} notify={notify}/>}
    </main>
    {showReport && <ReportModal token={session.token} close={() => setShowReport(false)} submit={submitReport}/>}
    {toast && <div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}

function AuthScreen({ onSuccess }) {
  const [mode, setMode] = useState('login'); const [form, setForm] = useState({ name: '', email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async e => { e.preventDefault(); setBusy(true); setError(''); try { const result = await request(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) }); onSuccess(result); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <div className="auth-layout"><section className="auth-art"><div className="brand brand-light"><span className="brand-icon">⌁</span><span>Civic<span>Fix</span></span></div><div className="auth-message"><p className="eyebrow">BETTER CITIES START HERE</p><h1>Make local issues<br/><em>visible and solvable.</em></h1><p>Report a concern, follow progress, and help your service teams focus on what matters.</p><div className="auth-pill">AI-assisted triage · Location-aware reporting · Clear updates</div></div><div className="city-illustration"><div className="orb"/><div className="block block-a"/><div className="block block-b"/><div className="block block-c"/><div className="road-line"/></div></section>
    <section className="auth-panel"><form onSubmit={submit} className="auth-form"><p className="eyebrow">CIVICFIX PORTAL</p><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p className="muted">{mode === 'login' ? 'Sign in to track civic requests and updates.' : 'Create a citizen account to submit and track issues.'}</p>
      {mode === 'register' && <label>Your name<input name="name" required maxLength="120" value={form.name} onChange={update} autoComplete="name"/></label>}
      <label>Email<input name="email" required type="email" value={form.email} onChange={update} autoComplete="email"/></label><label>Password<input name="password" required minLength="8" type="password" value={form.password} onChange={update} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label>
      {error && <div className="alert">{error}</div>}<button className="primary full" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in →' : 'Create account →'}</button>
      <p className="switch-auth">{mode === 'login' ? 'New to CivicFix?' : 'Already registered?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}> {mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
    </form></section></div>;
}

function Dashboard({ role, items, onPage, onReport }) {
  const open = items.filter(c => !['RESOLVED', 'REJECTED'].includes(c.status)).length;
  const critical = items.filter(c => c.priority === 'CRITICAL' && !['RESOLVED', 'REJECTED'].includes(c.status)).length;
  const resolved = items.filter(c => c.status === 'RESOLVED').length;
  const avgUrgency = items.length ? Math.round(items.reduce((sum, c) => sum + (c.urgencyScore || 0), 0) / items.length) : 0;
  return <>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">{role === 'CITIZEN' ? 'YOUR CITY, MADE BETTER' : role === 'ADMIN' ? 'CITY OPERATIONS' : 'DEPARTMENT WORKSPACE'}</p><h2>{role === 'CITIZEN' ? <>See a problem?<br/><em>Let’s get it fixed.</em></> : role === 'ADMIN' ? <>A clearer view of<br/><em>city service delivery.</em></> : <>Every report moves<br/><em>the city forward.</em></>}</h2><p>{role === 'CITIZEN' ? 'Submit an issue and see its progress from review through resolution.' : 'Prioritize incoming reports, keep residents informed, and resolve work with a clear history.'}</p>{role === 'CITIZEN' && <button className="white-button" onClick={onReport}>Report an issue <span>→</span></button>}</div><div className="hero-art"><div className="sun"/><div className="building one"/><div className="building two"/><div className="tree"/><div className="street"/><div className="pin">⌖</div></div></section>
    <section className="stats"><Stat icon="◷" color="mint" value={open} label={role === 'CITIZEN' ? 'Open reports' : 'Open complaints'}/><Stat icon="!" color="rose" value={critical} label="Critical attention"/><Stat icon="✓" color="blue" value={resolved} label="Resolved"/><Stat icon="✦" color="gold" value={`${avgUrgency}/100`} label="Average urgency score"/></section>
    <section className="dashboard-grid"><div className="panel"><div className="panel-head"><div><h3>{role === 'CITIZEN' ? 'Your recent reports' : 'Priority work queue'}</h3><p>Latest updates across complaints you can access</p></div><button className="link-button" onClick={() => onPage('Complaints')}>View all →</button></div>
      {items.length ? items.slice(0, 5).map(item => <ComplaintRow key={item.id} item={item}/>) : <Empty title="No complaints yet" text={role === 'CITIZEN' ? 'Your submissions and updates will appear here.' : 'No complaints are currently in your work queue.'}/>}</div>
      <div className="panel impact-panel"><div className="panel-head"><div><h3>Service pulse</h3><p>Based on accessible records</p></div><span className="live-dot">Live data</span></div><div className="pulse-number">{items.length}<span>total reports</span></div><div className="pulse-track"><i style={{ width: `${items.length ? Math.max(4, resolved / items.length * 100) : 0}%` }}/></div><div className="split-stats"><p><b>{resolved}</b><span>resolved</span></p><p><b>{open}</b><span>open</span></p><p><b>{critical}</b><span>critical</span></p></div><button className="secondary full" onClick={() => onPage('Geospatial')}>Explore location patterns →</button></div></section>
    <section className="bottom-grid"><div className="panel"><div className="panel-head"><div><h3>Issue locations</h3><p>Reports with submitted coordinates</p></div><button className="link-button" onClick={() => onPage('Geospatial')}>Open map →</button></div><GeoMap items={items} compact/></div><div className="panel quick-panel"><h3>Quick actions</h3>{role === 'CITIZEN' && <button onClick={onReport}><span>＋</span><div><b>Report an issue</b><small>Describe a local problem</small></div><i>→</i></button>}<button onClick={() => onPage('Complaints')}><span>▤</span><div><b>{role === 'CITIZEN' ? 'Track a report' : 'Manage complaints'}</b><small>Review status and activity</small></div><i>→</i></button><button onClick={() => onPage('Analytics')}><span>◔</span><div><b>View analytics</b><small>Explore issue trends</small></div><i>→</i></button></div></section>
  </>;
}

function Stat({ icon, color, value, label }) { return <div className="stat"><span className={`stat-icon ${color}`}>{icon}</span><div><b>{value}</b><small>{label}</small></div></div>; }
function Priority({ value }) { return <span className={`priority ${String(value || 'LOW').toLowerCase()}`}>{value || 'LOW'}</span>; }
function Status({ value }) { return <span className={`status status-${String(value || '').toLowerCase()}`}><i/>{STATUS_LABEL[value] || value}</span>; }
function ComplaintRow({ item }) { return <article className="complaint-row"><div className="row-marker">{item.category?.slice(0, 1) || '•'}</div><div className="row-main"><div className="row-title"><b>{item.title}</b><span className="case-id">{item.referenceCode}</span></div><p>{item.address || 'Location not provided'} · {item.department || item.category}</p><div className="row-meta"><Status value={item.status}/><span>Urgency {item.urgencyScore ?? '—'}/100</span>{item.triageReviewRequired && <span className="review-inline">Staff review</span>}<span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span></div></div><Priority value={item.priority}/></article>; }
function Empty({ title, text }) { return <div className="empty"><span>⌁</span><b>{title}</b><p>{text}</p></div>; }

function ComplaintPage({ role, items, filter, setFilter, search, setSearch, onStatus, token }) {
  const [selected, setSelected] = useState(null); const [details, setDetails] = useState([]); const [detailError, setDetailError] = useState('');
  const canManage = role === 'ADMIN' || role === 'DEPARTMENT_OFFICER';
  const openDetails = async item => { setSelected(item); setDetailError(''); try { setDetails(await request(`/complaints/${item.id}/events`, { token })); } catch (e) { setDetailError(e.message); } };
  return <><div className="page-toolbar"><div><p className="muted">{canManage ? 'Review, prioritize, and update the service status of accessible reports.' : 'Follow each report and read the latest status update.'}</p><span className="result-count">{items.length} complaint{items.length === 1 ? '' : 's'}</span></div><div className="toolbar-controls"><label className="search"><span>⌕</span><input placeholder="Search reports" value={search} onChange={e => setSearch(e.target.value)}/></label><select aria-label="Filter complaints" value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div></div>
    <div className="complaint-list">{items.length ? items.map(item => <article className="complaint-card" key={item.id}><div className="card-top"><span className="case-id">{item.referenceCode}</span><Priority value={item.priority}/></div><h3>{item.title}</h3><p className="complaint-description">{item.description}</p><div className="card-facts"><span>⌖ {item.address || 'Location pending'}</span><span>{item.category}</span><span>{item.department}</span><span>AI confidence {item.aiConfidence ?? '—'}%</span></div><div className="card-bottom"><Status value={item.status}/><b className="urgency">{item.urgencyScore ?? '—'}<small> urgency</small></b><button className="secondary" onClick={() => openDetails(item)}>Activity & details</button>{canManage && <StatusEditor item={item} onStatus={onStatus}/>}</div></article>) : <div className="panel"><Empty title="No matching complaints" text="Try changing your search or status filter."/></div>}</div>
    {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><section className="modal detail-modal"><button className="close" onClick={() => setSelected(null)}>×</button><p className="eyebrow">{selected.referenceCode}</p><h2>{selected.title}</h2><p className="muted">{selected.description}</p><div className="ai-summary"><b>AI triage {selected.triageReviewRequired ? '· Staff review requested' : ''}</b><p>{selected.category} · {selected.department} · urgency {selected.urgencyScore}/100 · confidence {selected.aiConfidence}%</p><small>{selected.triageRationale}</small><small>Scoring rules: {selected.triageVersion}</small></div><h3 className="timeline-title">Status activity</h3>{detailError && <div className="alert">{detailError}</div>}{details.map(ev => <div className="event" key={ev.id}><i/><div><b>{ev.eventType.replaceAll('_', ' ')}</b><p>{ev.details}</p><small>{new Date(ev.createdAt).toLocaleString()} · {ev.actorEmail}</small></div></div>)}</section></div>}
  </>;
}
function StatusEditor({ item, onStatus }) {
  const [value, setValue] = useState(item.status); const [details, setDetails] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <div className="status-editor"><select value={value} onChange={e => setValue(e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select><input required={['RESOLVED', 'REJECTED'].includes(value)} value={details} onChange={e => setDetails(e.target.value)} placeholder={['RESOLVED', 'REJECTED'].includes(value) ? 'Resolution / rejection note' : 'Update note (optional)'}/><button className="primary small-button" disabled={busy || value === item.status} onClick={async () => { setBusy(true); setError(''); try { await onStatus(item, value, details); setDetails(''); } catch (e) { setError(e.message); } finally { setBusy(false); } }}>{busy ? 'Saving' : 'Save'}</button>{error && <small className="error-text">{error}</small>}</div>;
}

function ReportModal({ token, close, submit }) {
  const [form, setForm] = useState({ title: '', description: '', address: '', latitude: '', longitude: '' }); const [triage, setTriage] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const update = e => { setForm({ ...form, [e.target.name]: e.target.value }); if (e.target.name === 'title' || e.target.name === 'description') setTriage(null); };
  const analyze = async () => { setBusy(true); setError(''); try { setTriage(await request('/complaints/triage', { method: 'POST', body: JSON.stringify({ title: form.title, description: form.description }) })); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const save = async e => { e.preventDefault(); setBusy(true); setError(''); try { await submit({ title: form.title, description: form.description, address: form.address || null, latitude: form.latitude === '' ? null : Number(form.latitude), longitude: form.longitude === '' ? null : Number(form.longitude) }); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><form className="modal" onSubmit={save}><button type="button" className="close" onClick={close}>×</button><p className="eyebrow">NEW COMPLAINT</p><h2>Tell us what needs attention.</h2><p className="muted modal-intro">AI will suggest the service category and urgency. Staff can review the recommendation.</p>
    <label>Issue title<input name="title" required maxLength="160" placeholder="e.g. Water leaking across the road" value={form.title} onChange={update}/></label><label>Description<textarea name="description" required maxLength="3000" placeholder="Explain what happened, how long it has been happening, and who or what is affected." value={form.description} onChange={update}/></label><label>Address, ward, or landmark<input name="address" maxLength="300" placeholder="Street, landmark, neighborhood" value={form.address} onChange={update}/></label>
    <div className="coordinate-grid"><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" placeholder="Optional" value={form.latitude} onChange={update}/></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" placeholder="Optional" value={form.longitude} onChange={update}/></label></div>
    {triage && <div className="ai-summary"><b>✦ AI triage preview</b><p>{triage.category} · {triage.department}</p><p>Urgency {triage.urgencyScore}/100 · {triage.priority} · {triage.confidence}% confidence</p><small>{triage.rationale}</small>{triage.reviewRequired && <small className="review-flag">Flagged for staff review</small>}</div>}
    {error && <div className="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={analyze} disabled={busy || !form.title || !form.description}>✦ Analyze report</button><button className="primary" disabled={busy}>{busy ? 'Please wait...' : 'Submit complaint →'}</button></div></form></div>;
}

function GeoMap({ items, compact = false }) {
  const points = items.filter(c => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
  const bounds = useMemo(() => {
    if (!points.length) return null;
    const lats = points.map(p => p.latitude), lons = points.map(p => p.longitude);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLon: Math.min(...lons), maxLon: Math.max(...lons) };
  }, [points]);
  const xy = p => {
    if (!bounds) return { x: 50, y: 50 };
    const dx = bounds.maxLon - bounds.minLon || 0.01, dy = bounds.maxLat - bounds.minLat || 0.01;
    return { x: 8 + (p.longitude - bounds.minLon) / dx * 84, y: 88 - (p.latitude - bounds.minLat) / dy * 76 };
  };
  return <div className={`geo-map ${compact ? 'compact' : ''}`}><div className="map-grid-lines"/>{points.map((p, i) => { const pos = xy(p); return <button key={p.id} className={`geo-point ${String(p.priority).toLowerCase()}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} title={`${p.title} · ${p.address || `${p.latitude}, ${p.longitude}`}`} aria-label={`${p.priority} complaint: ${p.title}`}><span>{i + 1}</span></button>; })}{!points.length && <div className="map-empty"><span>⌖</span><b>No reports have coordinates yet</b><small>Citizens can optionally enter latitude and longitude when they submit a complaint.</small></div>}<div className="map-caption">Coordinate plot · {points.length} located / {items.length} visible</div></div>;
}
function GeoPage({ items }) {
  const located = items.filter(c => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
  const byArea = Object.entries(items.reduce((acc, item) => { const area = item.address?.trim() || 'Location not provided'; acc[area] = (acc[area] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  return <><div className="page-toolbar"><div><p className="muted">Complaint coordinates and location text from reports you are authorized to view.</p></div><span className="role-chip">{located.length} geolocated</span></div><div className="geo-layout"><div className="panel map-panel"><div className="panel-head"><div><h3>Complaint coordinate map</h3><p>Scatter plot uses submitted latitude and longitude</p></div><PriorityLegend/></div><GeoMap items={items}/></div><div className="panel area-panel"><h3>Reports by location</h3><p className="muted">Grouped by submitted address or landmark</p>{byArea.length ? byArea.slice(0, 12).map(([area, count]) => <div className="area-row" key={area}><span>⌖</span><b>{area}</b><strong>{count}</strong></div>) : <Empty title="No location data" text="Location summaries will show after reports are submitted."/>}</div></div></>;
}
function PriorityLegend() { return <div className="legend"><span><i className="critical-dot"/>Critical</span><span><i className="high-dot"/>High</span><span><i className="medium-dot"/>Other</span></div>; }

function AnalyticsPage({ items }) {
  const categories = items.reduce((acc, c) => { const key = c.category || 'Uncategorized'; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  const statuses = STATUSES.map(status => [status, items.filter(c => c.status === status).length]);
  const max = Math.max(1, ...Object.values(categories)); const resolved = items.filter(c => c.status === 'RESOLVED').length;
  const average = items.length ? (items.reduce((n, c) => n + (c.urgencyScore || 0), 0) / items.length).toFixed(0) : 0;
  return <><div className="page-toolbar"><div><p className="muted">Live summaries calculated from complaint records visible to your account.</p></div><span className="live-dot">Refresh with page reload</span></div><section className="stats analytics-stats"><Stat icon="▤" color="mint" value={items.length} label="Total complaints"/><Stat icon="✓" color="blue" value={resolved} label="Resolved"/><Stat icon="✦" color="gold" value={`${average}/100`} label="Average urgency"/><Stat icon="!" color="rose" value={items.filter(c => c.priority === 'CRITICAL').length} label="Critical"/></section>
    <div className="analytics-grid"><div className="panel"><h3>Complaints by category</h3><p className="muted">Count for the current visible dataset</p><div className="bars">{Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([name, count]) => <div className="bar-row" key={name}><span>{name}</span><i><b style={{ width: `${count / max * 100}%` }}/></i><strong>{count}</strong></div>)}</div>{!items.length && <Empty title="No analytics to display" text="Category counts will appear when complaints are recorded."/>}</div><div className="panel"><h3>Workflow status</h3><p className="muted">Status distribution</p>{statuses.map(([status, count]) => <div className="workflow-row" key={status}><Status value={status}/><b>{count}</b></div>)}</div></div></>;
}

function TeamPage({ token, notify }) {
  const [users, setUsers] = useState([]); const [error, setError] = useState(''); const [drafts, setDrafts] = useState({});
  useEffect(() => { request('/admin/users', { token }).then(setUsers).catch(e => setError(e.message)); }, [token]);
  const save = async user => { const d = drafts[user.id] || {}; try { const updated = await request(`/admin/users/${user.id}/role`, { token, method: 'PATCH', body: JSON.stringify({ role: d.role || user.role, department: d.department ?? user.department }) }); setUsers(all => all.map(u => u.id === user.id ? { ...u, ...updated } : u)); notify('Account access updated'); } catch (e) { setError(e.message); } };
  return <div className="panel team-panel"><div className="panel-head"><div><h3>Accounts and service teams</h3><p>Set staff role and department access for complaint routing.</p></div></div>{error && <div className="alert">{error}</div>}<div className="team-head"><span>Account</span><span>Role</span><span>Department scope</span><span/></div>{users.map(user => { const draft = drafts[user.id] || {}; return <div className="team-row" key={user.id}><div><b>{user.name}</b><small>{user.email}</small></div><select value={draft.role || user.role} onChange={e => setDrafts(x => ({ ...x, [user.id]: { ...x[user.id], role: e.target.value } }))}><option value="CITIZEN">Citizen</option><option value="DEPARTMENT_OFFICER">Department officer</option><option value="ADMIN">Administrator</option></select><input value={draft.department ?? user.department ?? ''} placeholder="e.g. Water Works" onChange={e => setDrafts(x => ({ ...x, [user.id]: { ...x[user.id], department: e.target.value } }))}/><button className="secondary" onClick={() => save(user)}>Save</button></div>; })}{!users.length && !error && <div className="loading"><span/>Loading accounts...</div>}</div>;
}

createRoot(document.getElementById('root')).render(<App/>);
