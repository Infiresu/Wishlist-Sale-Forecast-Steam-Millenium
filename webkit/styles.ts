const STYLE_ID = 'wsf-styles';

const CSS = `
#wsf-panel {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: 360px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  z-index: 9999;
  font-family: "Motiva Sans", Arial, sans-serif;
  font-size: 13px;
  color: #c7d5e0;
  background: linear-gradient(180deg, #1f2f42 0%, #16202d 100%);
  border: 1px solid #2a475e;
  border-radius: 4px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
}
#wsf-panel * { box-sizing: border-box; }
#wsf-panel .wsf-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; cursor: pointer; user-select: none; flex: none;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
#wsf-panel.wsf-collapsed .wsf-head { border-bottom: none; }
#wsf-panel .wsf-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #fff; }
#wsf-panel .wsf-head-total { color: #beee11; font-weight: bold; margin-left: 8px; }
#wsf-panel .wsf-chevron { color: #8f98a0; font-size: 11px; }
#wsf-panel.wsf-collapsed .wsf-body { display: none; }
#wsf-panel .wsf-body { padding: 10px 12px 12px; overflow-y: auto; min-height: 0; }
#wsf-panel .wsf-sale { color: #8f98a0; margin-bottom: 8px; }
#wsf-panel .wsf-sale b { color: #66c0f4; font-weight: normal; }
#wsf-panel .wsf-total-label { color: #8f98a0; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
#wsf-panel .wsf-total { font-size: 24px; color: #beee11; line-height: 1.2; margin: 2px 0 4px; }
#wsf-panel .wsf-regular { color: #8f98a0; }
#wsf-panel .wsf-regular s { color: #738895; }
#wsf-panel .wsf-saving { color: #a4d007; }
#wsf-panel .wsf-line { margin-top: 6px; }
#wsf-panel .wsf-muted { color: #8f98a0; font-size: 12px; }
#wsf-panel .wsf-hint { margin-top: 4px; }
#wsf-panel .wsf-error { color: #ff7b5c; }
#wsf-panel .wsf-progress { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 8px; overflow: hidden; }
#wsf-panel .wsf-progress > div { height: 100%; background: #66c0f4; transition: width .2s; }

#wsf-panel .wsf-country {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);
}
#wsf-panel .wsf-select {
  flex: 1; max-width: 220px; background: #0e1620; color: #c7d5e0;
  border: 1px solid #2a475e; border-radius: 2px; padding: 3px 4px; font-size: 12px;
}

#wsf-panel details { margin-top: 10px; }
#wsf-panel summary { cursor: pointer; color: #66c0f4; }
#wsf-panel .wsf-list { max-height: 40vh; overflow-y: auto; margin-top: 6px; padding-right: 4px; }
#wsf-panel .wsf-group {
  margin-top: 8px; color: #8f98a0; font-size: 11px; text-transform: uppercase; letter-spacing: .5px;
}
#wsf-panel .wsf-row {
  display: flex; gap: 8px; align-items: baseline; padding: 4px 6px; margin: 0 -6px;
  border-bottom: 1px solid rgba(255,255,255,0.04); border-radius: 2px;
}
#wsf-panel .wsf-clickable { cursor: pointer; }
#wsf-panel .wsf-clickable:hover { background: rgba(102,192,244,0.08); }
#wsf-panel .wsf-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #c7d5e0; }
#wsf-panel .wsf-excluded .wsf-name { color: #738895; text-decoration: line-through; }
#wsf-panel .wsf-cut { color: #a4d007; font-size: 11px; }
#wsf-panel .wsf-when { color: #8f98a0; font-size: 11px; white-space: nowrap; }
#wsf-panel .wsf-price { color: #fff; white-space: nowrap; }
#wsf-panel .wsf-struck { color: #738895; text-decoration: line-through; white-space: nowrap; }
#wsf-panel .wsf-badge {
  color: #8f98a0; font-size: 10px; white-space: nowrap; border: 1px solid #2a475e;
  border-radius: 2px; padding: 0 4px;
}
#wsf-panel .wsf-open { color: #8f98a0; text-decoration: none; font-size: 12px; flex: none; }
#wsf-panel .wsf-open:hover { color: #fff; }

#wsf-panel .wsf-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 10px; }
#wsf-panel .wsf-footer a { color: #8f98a0; font-size: 11px; text-decoration: none; }
#wsf-panel .wsf-btn {
  background: rgba(103,193,245,0.2); color: #66c0f4; border: none; border-radius: 2px;
  padding: 4px 10px; cursor: pointer; font-size: 12px; margin: 6px 0 2px;
}
#wsf-panel .wsf-btn:hover { background: #66c0f4; color: #fff; }

#wsf-panel .wsf-sortbar {
  display: flex; align-items: stretch; margin-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.18);
}
/* three equal cells; the whole cell is the button, text centred inside it */
#wsf-panel .wsf-sort {
  flex: 1 1 0; min-width: 0; margin: 0; border: none; border-radius: 0;
  background: none; color: #8f98a0; cursor: pointer;
  padding: 6px 4px; font: inherit; font-size: 11px; text-transform: uppercase; letter-spacing: .5px;
  display: flex; align-items: center; justify-content: center; text-align: center;
  white-space: nowrap; overflow: hidden;
}
#wsf-panel .wsf-sort + .wsf-sort { border-left: 1px solid rgba(255,255,255,0.08); }
#wsf-panel .wsf-sort:hover { background: rgba(102,192,244,0.12); color: #fff; }
#wsf-panel .wsf-sort-active { color: #66c0f4; background: rgba(102,192,244,0.08); }
`;

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
}
