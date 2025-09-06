import React, { useEffect, useState } from 'react';

const DEFAULTS = {
  enabled: true,
  startTime: "08:00",
  endTime: "18:00",
  days: [1,2,3,4,5],
  blockedDomains: ["tiktok.com", "twitter.com", "instagram.com"],
  snoozeUntil: 0
};

const DAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

export default function App() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [newDomain, setNewDomain] = useState('');
  const [status, setStatus] = useState('');

  // Load settings from chrome.storage.sync
  useEffect(() => {
    if (!chrome?.storage?.sync) return;
    chrome.storage.sync.get(DEFAULTS, (data) => {
      setSettings({ ...DEFAULTS, ...data });
    });
  }, []);

  function normalizeDomain(raw) {
    let v = (raw || '').trim();
    if (!v) return '';
    v = v.replace(/^https?:\/\//i, '')
         .replace(/^www\./i, '')
         .replace(/\/.*$/, '');
    return v;
  }

  function addDomain() {
    const d = normalizeDomain(newDomain);
    if (!d) return;
    if (settings.blockedDomains.includes(d)) {
      setStatus('Domain already in list');
      return;
    }
    const next = { ...settings, blockedDomains: [...settings.blockedDomains, d] };
    setSettings(next);
    setNewDomain('');
    save(next);
  }

  function removeDomain(idx) {
    const next = { ...settings, blockedDomains: settings.blockedDomains.filter((_, i) => i !== idx) };
    setSettings(next);
    save(next);
  }

  function toggleDay(dayId) {
    const has = settings.days.includes(dayId);
    const days = has ? settings.days.filter(d => d !== dayId) : [...settings.days, dayId];
    const next = { ...settings, days: days.sort((a,b)=>a-b) };
    setSettings(next);
  }

  function onTimeChange(key, value) {
    const next = { ...settings, [key]: value };
    setSettings(next);
  }

  function onToggleEnabled(e) {
    const next = { ...settings, enabled: e.target.checked };
    setSettings(next);
  }

  function save(custom) {
    const toSave = custom || settings;
    chrome.storage.sync.set(toSave, () => {
      setStatus('Saved ✔');
      setTimeout(() => setStatus(''), 1200);
    });
  }

  function saveAll(e) {
    e.preventDefault();
    save();
  }

  function clearSnooze() {
    const next = { ...settings, snoozeUntil: 0 };
    setSettings(next);
    save(next);
  }

  const snoozed = settings.snoozeUntil && Date.now() < settings.snoozeUntil;

  return (
    <div className="p-3" style={{ minWidth: 360 }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h5 className="m-0">Focus Blocker</h5>
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox"
                 id="enableSwitch"
                 checked={settings.enabled}
                 onChange={onToggleEnabled} />
          <label className="form-check-label" htmlFor="enableSwitch">Enabled</label>
        </div>
      </div>

      {snoozed && (
        <div className="alert alert-warning py-2">
          Snoozed until {new Date(settings.snoozeUntil).toLocaleTimeString()} — <button className="btn btn-sm btn-outline-dark" onClick={clearSnooze}>End snooze</button>
        </div>
      )}

      <form onSubmit={saveAll}>
        {/* Time window */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex gap-3 align-items-center">
              <div className="flex-grow-1">
                <label className="form-label">Start time</label>
                <input type="time" className="form-control"
                       value={settings.startTime}
                       onChange={(e)=>onTimeChange('startTime', e.target.value)} />
              </div>
              <div className="flex-grow-1">
                <label className="form-label">End time</label>
                <input type="time" className="form-control"
                       value={settings.endTime}
                       onChange={(e)=>onTimeChange('endTime', e.target.value)} />
              </div>
            </div>

            <div className="mt-3">
              <label className="form-label d-block">Days</label>
              <div className="d-flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <div className="form-check form-check-inline" key={d.id}>
                    <input className="form-check-input" type="checkbox"
                           id={`day-${d.id}`}
                           checked={settings.days.includes(d.id)}
                           onChange={()=>toggleDay(d.id)} />
                    <label className="form-check-label" htmlFor={`day-${d.id}`}>{d.label}</label>
                  </div>
                ))}
              </div>
              <small className="text-muted d-block mt-1">Tip: Set 22:00–06:00 to cover late nights (wraps past midnight).</small>
            </div>
          </div>
        </div>

        {/* Domains */}
        <div className="card mb-3">
          <div className="card-body">
            <label className="form-label">Blocked domains</label>
            <div className="input-group mb-2">
              <input type="text" className="form-control" placeholder="e.g. tiktok.com"
                     value={newDomain} onChange={(e)=>setNewDomain(e.target.value)}
                     onKeyDown={(e)=>{ if (e.key === 'Enter') addDomain(); }} />
              <button className="btn btn-primary" type="button" onClick={addDomain}>Add</button>
            </div>

            <ul className="list-group">
              {settings.blockedDomains.map((d, i) => (
                <li key={d} className="list-group-item d-flex justify-content-between align-items-center">
                  <code>{d}</code>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removeDomain(i)}>Remove</button>
                </li>
              ))}
              {settings.blockedDomains.length === 0 && (
                <li className="list-group-item text-muted">No domains yet. Add one above.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-success" type="submit">Save</button>
          {status && <div className="align-self-center text-success">{status}</div>}
        </div>
      </form>

      <div className="mt-3">
        <small className="text-muted">
          Blocking happens locally via Chrome’s declarativeNetRequest. No data leaves your browser.
        </small>
      </div>
    </div>
  );
}
