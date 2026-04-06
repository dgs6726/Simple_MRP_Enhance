import { useState, useMemo } from "react";

const DATA=[{"component":"ABS-6100","description":"Anjacom R050/7020 BK","stdCost":2.095,"abc":"A","weeklyReq":1331,"min":1331,"stdOrdQty":0,"max":1331,"weeks":[{"date":"2026-02-02","value":12025},{"date":"2026-02-09","value":8999},{"date":"2026-02-16","value":7486},{"date":"2026-02-23","value":5217},{"date":"2026-03-02","value":10316},{"date":"2026-03-09","value":8803},{"date":"2026-03-16","value":8047},{"date":"2026-03-23","value":5778},{"date":"2026-03-30","value":4643},{"date":"2026-04-06","value":9364},{"date":"2026-04-13","value":6338},{"date":"2026-04-20","value":4825}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":12845,"demand":0,"openOrders":0,"net":12845,"runTotal":12845,"sort":1,"vendor":null},{"date":"2026-02-06","parent":"DEC9494B3","qoh":12845,"demand":-429,"openOrders":0,"net":12416,"runTotal":-429,"sort":2,"vendor":null},{"date":"2026-02-06","parent":"DEC9494A3","qoh":12845,"demand":-391,"openOrders":0,"net":12025,"runTotal":-391,"sort":2,"vendor":null},{"date":"2026-02-13","parent":"DEC9494B3","qoh":12845,"demand":-1514,"openOrders":0,"net":10511,"runTotal":-1514,"sort":2,"vendor":null},{"date":"2026-02-13","parent":"DEC9494A3","qoh":12845,"demand":-1512,"openOrders":0,"net":8999,"runTotal":-1512,"sort":2,"vendor":null},{"date":"2026-02-20","parent":"DEC9494B3","qoh":12845,"demand":-757,"openOrders":0,"net":8242,"runTotal":-757,"sort":2,"vendor":null},{"date":"2026-02-20","parent":"DEC9494A3","qoh":12845,"demand":-756,"openOrders":0,"net":7486,"runTotal":-756,"sort":2,"vendor":null},{"date":"2026-02-27","parent":"DEC9494B3","qoh":12845,"demand":-1135,"openOrders":0,"net":6351,"runTotal":-1135,"sort":2,"vendor":null},{"date":"2026-02-27","parent":"DEC9494A3","qoh":12845,"demand":-1134,"openOrders":0,"net":5217,"runTotal":-1134,"sort":2,"vendor":null},{"date":"2026-03-06","parent":"WH8142","qoh":12845,"demand":0,"openOrders":6612,"net":10316,"runTotal":6612,"sort":4,"vendor":"9299"}]},{"component":"ACE-2000","description":"CELCON M-90 NATURAL","stdCost":1.3,"abc":"A","weeklyReq":922,"min":922,"stdOrdQty":3307,"max":4229,"weeks":[{"date":"2026-02-02","value":17223},{"date":"2026-02-09","value":16848},{"date":"2026-02-16","value":15287},{"date":"2026-02-23","value":14340},{"date":"2026-03-02","value":26406},{"date":"2026-03-09","value":24132},{"date":"2026-03-16","value":22542},{"date":"2026-03-23","value":18047},{"date":"2026-03-30","value":14066},{"date":"2026-04-06","value":10044},{"date":"2026-04-13","value":8896},{"date":"2026-04-20","value":7265}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":17223,"demand":0,"openOrders":0,"net":17223,"runTotal":17223,"sort":1,"vendor":null},{"date":"2026-02-09","parent":"DTS8538A1","qoh":17223,"demand":-375,"openOrders":0,"net":16848,"runTotal":-375,"sort":2,"vendor":null},{"date":"2026-02-16","parent":"DTS8525A1","qoh":17223,"demand":-613,"openOrders":0,"net":16235,"runTotal":-613,"sort":2,"vendor":null},{"date":"2026-03-02","parent":"WH7011","qoh":17223,"demand":0,"openOrders":13224,"net":26880,"runTotal":13224,"sort":4,"vendor":"0213"}]},{"component":"INS-0005","description":"13540283-5 Rev G Compression Spring","stdCost":0.65,"abc":"A","weeklyReq":5649,"min":5649,"stdOrdQty":60000,"max":65649,"weeks":[{"date":"2026-02-02","value":99467},{"date":"2026-02-09","value":78435},{"date":"2026-02-16","value":78435},{"date":"2026-02-23","value":78435},{"date":"2026-03-02","value":51047},{"date":"2026-03-09","value":51047},{"date":"2026-03-16","value":51047},{"date":"2026-03-23","value":51047},{"date":"2026-03-30","value":51047},{"date":"2026-04-06","value":26355},{"date":"2026-04-13","value":26355},{"date":"2026-04-20","value":26355}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":67467,"demand":0,"openOrders":0,"net":67467,"runTotal":67467,"sort":1,"vendor":null},{"date":"2026-02-06","parent":"WH8232","qoh":67467,"demand":0,"openOrders":32000,"net":99467,"runTotal":32000,"sort":4,"vendor":"7445"},{"date":"2026-02-09","parent":"LHM8062A2","qoh":67467,"demand":-21032,"openOrders":0,"net":78435,"runTotal":-21032,"sort":2,"vendor":null},{"date":"2026-03-02","parent":"LHM8062A2","qoh":67467,"demand":-2696,"openOrders":0,"net":75739,"runTotal":-2696,"sort":2,"vendor":null},{"date":"2026-03-04","parent":"LHM8062A2","qoh":67467,"demand":-24692,"openOrders":0,"net":51047,"runTotal":-24692,"sort":2,"vendor":null},{"date":"2026-04-06","parent":"LHM8062A2","qoh":67467,"demand":-24692,"openOrders":0,"net":26355,"runTotal":-24692,"sort":2,"vendor":null},{"date":"2026-05-05","parent":"LHM8062A2","qoh":67467,"demand":-24692,"openOrders":0,"net":1663,"runTotal":-24692,"sort":2,"vendor":null}]},{"component":"INS0289A1","description":"380965 Bore Insert","stdCost":1.04,"abc":"A","weeklyReq":909,"min":909,"stdOrdQty":15120,"max":16029,"weeks":[{"date":"2026-02-02","value":9508},{"date":"2026-02-09","value":5639},{"date":"2026-02-16","value":5639},{"date":"2026-02-23","value":5639},{"date":"2026-03-02","value":5639},{"date":"2026-03-09","value":9279},{"date":"2026-03-16","value":9279},{"date":"2026-03-23","value":9279},{"date":"2026-03-30","value":9279},{"date":"2026-04-06","value":5359},{"date":"2026-04-13","value":5359},{"date":"2026-04-20","value":1439}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":9508,"demand":0,"openOrders":0,"net":9508,"runTotal":9508,"sort":1,"vendor":null},{"date":"2026-02-13","parent":"BWA6413A1","qoh":9508,"demand":-3869,"openOrders":0,"net":5639,"runTotal":-3869,"sort":2,"vendor":null},{"date":"2026-03-10","parent":"WH6997","qoh":9508,"demand":0,"openOrders":7560,"net":13199,"runTotal":7560,"sort":4,"vendor":"8503"},{"date":"2026-04-07","parent":"BWA6413A1","qoh":9508,"demand":-3920,"openOrders":0,"net":5359,"runTotal":-3920,"sort":2,"vendor":null},{"date":"2026-05-01","parent":"BWA6413A1","qoh":9508,"demand":-3920,"openOrders":0,"net":-2481,"runTotal":-3920,"sort":2,"vendor":null}]},{"component":"INS-0552","description":"5075166 Bracket","stdCost":1.82,"abc":"A","weeklyReq":6969,"min":6969,"stdOrdQty":1500,"max":8469,"weeks":[{"date":"2026-02-02","value":40055},{"date":"2026-02-09","value":79205},{"date":"2026-02-16","value":77945},{"date":"2026-02-23","value":69125},{"date":"2026-03-02","value":55265},{"date":"2026-03-09","value":96185},{"date":"2026-03-16","value":82325},{"date":"2026-03-23","value":65945},{"date":"2026-03-30","value":58385},{"date":"2026-04-06","value":100565},{"date":"2026-04-13","value":100565},{"date":"2026-04-20","value":93005}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":40055,"demand":0,"openOrders":0,"net":40055,"runTotal":40055,"sort":1,"vendor":null},{"date":"2026-02-09","parent":"WH8065","qoh":40055,"demand":0,"openOrders":51000,"net":91055,"runTotal":51000,"sort":4,"vendor":"9483"},{"date":"2026-02-12","parent":"BWA9414A1","qoh":40055,"demand":-10080,"openOrders":0,"net":79205,"runTotal":-10080,"sort":2,"vendor":null}]},{"component":"INS-2215A3","description":"5061125 Bracket Arm","stdCost":1.91,"abc":"A","weeklyReq":6085,"min":6085,"stdOrdQty":0,"max":6085,"weeks":[{"date":"2026-02-02","value":56569},{"date":"2026-02-09","value":81769},{"date":"2026-02-16","value":73705},{"date":"2026-02-23","value":57577},{"date":"2026-03-02","value":74713},{"date":"2026-03-09","value":74713},{"date":"2026-03-16","value":58585},{"date":"2026-03-23","value":50521},{"date":"2026-03-30","value":75721},{"date":"2026-04-06","value":67657},{"date":"2026-04-13","value":51529},{"date":"2026-04-20","value":51529}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":60345,"demand":0,"openOrders":0,"net":60345,"runTotal":60345,"sort":1,"vendor":null},{"date":"2026-02-06","parent":"BWA9098A3-T","qoh":60345,"demand":-3776,"openOrders":0,"net":56569,"runTotal":-3776,"sort":2,"vendor":null},{"date":"2026-02-09","parent":"WH7178","qoh":60345,"demand":0,"openOrders":25200,"net":81769,"runTotal":25200,"sort":4,"vendor":"8593"}]},{"component":"NYL-2700","description":"ZYTEL 45HSB NATURAL","stdCost":2.18,"abc":"A","weeklyReq":2966,"min":2966,"stdOrdQty":13224,"max":16190,"weeks":[{"date":"2026-02-02","value":35793},{"date":"2026-02-09","value":32931},{"date":"2026-02-16","value":31606},{"date":"2026-02-23","value":26352},{"date":"2026-03-02","value":33740},{"date":"2026-03-09","value":28608},{"date":"2026-03-16","value":33781},{"date":"2026-03-23","value":25930},{"date":"2026-03-30","value":35470},{"date":"2026-04-06","value":30961},{"date":"2026-04-13","value":25724},{"date":"2026-04-20","value":21921}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":35793,"demand":0,"openOrders":0,"net":35793,"runTotal":35793,"sort":1,"vendor":null},{"date":"2026-02-11","parent":"BWA9680A1","qoh":35793,"demand":-2250,"openOrders":0,"net":33543,"runTotal":-2250,"sort":2,"vendor":null},{"date":"2026-02-12","parent":"BWA8496A2","qoh":35793,"demand":-404,"openOrders":0,"net":33139,"runTotal":-404,"sort":2,"vendor":null}]},{"component":"NYL-29600","description":"DSM Stanyl HG-R2, PA46 + PTFE","stdCost":6.67,"abc":"A","weeklyReq":359,"min":359,"stdOrdQty":2805,"max":3164,"weeks":[{"date":"2026-02-02","value":3856},{"date":"2026-02-09","value":3856},{"date":"2026-02-16","value":6887},{"date":"2026-02-23","value":6887},{"date":"2026-03-02","value":7538},{"date":"2026-03-09","value":7223},{"date":"2026-03-16","value":6845},{"date":"2026-03-23","value":6215},{"date":"2026-03-30","value":5522},{"date":"2026-04-06","value":8175},{"date":"2026-04-13","value":8175},{"date":"2026-04-20","value":6922}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":825,"demand":0,"openOrders":0,"net":825,"runTotal":825,"sort":1,"vendor":null},{"date":"2026-02-06","parent":"WH6887","qoh":825,"demand":0,"openOrders":3031,"net":3856,"runTotal":3031,"sort":4,"vendor":"0387"},{"date":"2026-02-20","parent":"WH6887","qoh":825,"demand":0,"openOrders":3031,"net":6887,"runTotal":3031,"sort":4,"vendor":"0387"},{"date":"2026-03-02","parent":"BWA8769A1-T","qoh":825,"demand":-1040,"openOrders":0,"net":5847,"runTotal":-1040,"sort":2,"vendor":null}]},{"component":"ABS-6001","description":"Pulse 2000EZ PC/ABS BLACK","stdCost":2.1,"abc":"B","weeklyReq":195,"min":390,"stdOrdQty":3263,"max":3653,"weeks":[{"date":"2026-02-02","value":2561},{"date":"2026-02-09","value":2561},{"date":"2026-02-16","value":2561},{"date":"2026-02-23","value":2133},{"date":"2026-03-02","value":1636},{"date":"2026-03-09","value":1139},{"date":"2026-03-16","value":4190},{"date":"2026-03-23","value":3693},{"date":"2026-03-30","value":3196},{"date":"2026-04-06","value":2947},{"date":"2026-04-13","value":2450},{"date":"2026-04-20","value":1953}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":2561,"demand":0,"openOrders":0,"net":2561,"runTotal":2561,"sort":1,"vendor":null},{"date":"2026-02-27","parent":"BHR8873A2","qoh":2561,"demand":-428,"openOrders":0,"net":2133,"runTotal":-428,"sort":2,"vendor":null},{"date":"2026-03-06","parent":"BHR8873A2","qoh":2561,"demand":-497,"openOrders":0,"net":1636,"runTotal":-497,"sort":2,"vendor":null},{"date":"2026-03-13","parent":"BHR8873A2","qoh":2561,"demand":-497,"openOrders":0,"net":1139,"runTotal":-497,"sort":2,"vendor":null},{"date":"2026-03-16","parent":"WH7401","qoh":2561,"demand":0,"openOrders":3300,"net":4439,"runTotal":3300,"sort":4,"vendor":"2881"}]},{"component":"ACE-1400","description":"DELRIN 570 NC-000 NATURAL","stdCost":4.95,"abc":"B","weeklyReq":33,"min":66,"stdOrdQty":1102,"max":1168,"weeks":[{"date":"2026-02-02","value":82},{"date":"2026-02-09","value":35},{"date":"2026-02-16","value":35},{"date":"2026-02-23","value":35},{"date":"2026-03-02","value":35},{"date":"2026-03-09","value":-149},{"date":"2026-03-16","value":-149},{"date":"2026-03-23","value":-149},{"date":"2026-03-30","value":-149},{"date":"2026-04-06","value":-149},{"date":"2026-04-13","value":-149},{"date":"2026-04-20","value":-149}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":135,"demand":0,"openOrders":0,"net":135,"runTotal":135,"sort":1,"vendor":null},{"date":"2026-02-06","parent":"SMP8248A1","qoh":135,"demand":-53,"openOrders":0,"net":82,"runTotal":-53,"sort":2,"vendor":null},{"date":"2026-02-13","parent":"SMP2466A1","qoh":135,"demand":-47,"openOrders":0,"net":35,"runTotal":-47,"sort":2,"vendor":null},{"date":"2026-03-12","parent":"SMP8248A1","qoh":135,"demand":-184,"openOrders":0,"net":-149,"runTotal":-184,"sort":2,"vendor":null}]},{"component":"ACE-3100","description":"CELCON M90 BLACK","stdCost":1.27,"abc":"B","weeklyReq":144,"min":288,"stdOrdQty":2205,"max":2493,"weeks":[{"date":"2026-02-02","value":13133},{"date":"2026-02-09","value":13133},{"date":"2026-02-16","value":13133},{"date":"2026-02-23","value":13133},{"date":"2026-03-02","value":24153},{"date":"2026-03-09","value":23776},{"date":"2026-03-16","value":22917},{"date":"2026-03-23","value":19579},{"date":"2026-03-30","value":16670},{"date":"2026-04-06","value":13332},{"date":"2026-04-13","value":9994},{"date":"2026-04-20","value":9565}],"detail":[{"date":"2026-02-06","parent":"_Inventory","qoh":13133,"demand":0,"openOrders":0,"net":13133,"runTotal":13133,"sort":1,"vendor":null},{"date":"2026-03-02","parent":"WH7011","qoh":13133,"demand":0,"openOrders":11020,"net":24153,"runTotal":11020,"sort":4,"vendor":"0213"},{"date":"2026-03-12","parent":"DTS8540A1","qoh":13133,"demand":-377,"openOrders":0,"net":23776,"runTotal":-377,"sort":2,"vendor":null}]}];

const fmt = (n) => n == null ? '—' : Math.round(n).toLocaleString();
const fmtDate = (d) => { const p = d.split('-'); return `${p[1]}/${p[2]}`; };
const fmtWeek = (d) => { const dt = new Date(d+'T00:00:00'); return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'}); };

const abcColors = { A: '#C52026', B: '#D4812A', C: '#4D4D4D' };
const abcBg = { A: 'rgba(197,32,38,0.08)', B: 'rgba(212,129,42,0.06)', C: 'rgba(77,77,77,0.04)' };

function cellColor(val, min) {
  if (val < 0) return { bg: '#C52026', fg: '#fff' };
  if (min > 0 && val < min) return { bg: '#FEF3C7', fg: '#92400E' };
  if (min > 0 && val < min * 2) return { bg: '#F0FDF4', fg: '#166534' };
  return { bg: 'transparent', fg: '#323232' };
}

function SparkBar({ weeks, min }) {
  const vals = weeks.map(w => w.value);
  const maxV = Math.max(...vals.map(Math.abs), 1);
  const minV = Math.min(...vals);
  return (
    <div style={{ display: 'flex', alignItems: 'end', gap: 1, height: 24 }}>
      {vals.map((v, i) => {
        const h = Math.max(2, Math.abs(v) / maxV * 22);
        const neg = v < 0;
        const warn = !neg && min > 0 && v < min;
        return <div key={i} style={{
          width: 6, height: h, borderRadius: 1,
          backgroundColor: neg ? '#C52026' : warn ? '#F59E0B' : '#10B981',
          opacity: 0.85
        }} />;
      })}
    </div>
  );
}

function DetailPanel({ item }) {
  const inv = item.detail.find(d => d.sort === 1);
  const demands = item.detail.filter(d => d.sort === 2);
  const orders = item.detail.filter(d => d.sort === 4);
  return (
    <div style={{ padding: '12px 16px 16px', background: '#FAFAFA', borderTop: '1px solid #E5E5E5' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 6, padding: '10px 14px', border: '1px solid #E5E5E5' }}>
          <div style={{ fontSize: 10, color: '#929498', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>On Hand</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#323232', fontFamily: "'DM Mono', monospace" }}>{fmt(inv?.qoh)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 6, padding: '10px 14px', border: '1px solid #E5E5E5' }}>
          <div style={{ fontSize: 10, color: '#929498', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Weekly Req</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#323232', fontFamily: "'DM Mono', monospace" }}>{fmt(item.weeklyReq)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 6, padding: '10px 14px', border: '1px solid #E5E5E5' }}>
          <div style={{ fontSize: 10, color: '#929498', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Weeks of Supply</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: item.weeklyReq > 0 ? (inv?.qoh / item.weeklyReq < 4 ? '#C52026' : '#166534') : '#323232', fontFamily: "'DM Mono', monospace" }}>
            {item.weeklyReq > 0 ? (inv?.qoh / item.weeklyReq).toFixed(1) : '∞'}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {orders.length > 0 && <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Open POs ({orders.length})</div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #E5E5E5' }}>
              <th style={{ textAlign: 'left', padding: '4px 6px', color: '#929498', fontWeight: 500 }}>Date</th>
              <th style={{ textAlign: 'left', padding: '4px 6px', color: '#929498', fontWeight: 500 }}>PO Line</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', color: '#929498', fontWeight: 500 }}>Qty</th>
            </tr></thead>
            <tbody>{orders.map((o, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F5F5F5' }}>
                <td style={{ padding: '4px 6px', fontFamily: "'DM Mono', monospace" }}>{fmtDate(o.date)}</td>
                <td style={{ padding: '4px 6px', color: '#4D4D4D' }}>{o.parent?.replace('_Inventory','')}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: '#10B981', fontFamily: "'DM Mono', monospace" }}>+{fmt(o.openOrders)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
        {demands.length > 0 && <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#C52026', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Demand Sources ({demands.length})</div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #E5E5E5' }}>
              <th style={{ textAlign: 'left', padding: '4px 6px', color: '#929498', fontWeight: 500 }}>Date</th>
              <th style={{ textAlign: 'left', padding: '4px 6px', color: '#929498', fontWeight: 500 }}>Parent</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', color: '#929498', fontWeight: 500 }}>Qty</th>
            </tr></thead>
            <tbody>{demands.slice(0, 8).map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F5F5F5' }}>
                <td style={{ padding: '4px 6px', fontFamily: "'DM Mono', monospace" }}>{fmtDate(d.date)}</td>
                <td style={{ padding: '4px 6px', color: '#4D4D4D', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{d.parent}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: '#C52026', fontFamily: "'DM Mono', monospace" }}>{fmt(d.demand)}</td>
              </tr>
            ))}</tbody>
          </table>
          {demands.length > 8 && <div style={{ fontSize: 11, color: '#929498', padding: '4px 6px' }}>+{demands.length - 8} more</div>}
        </div>}
      </div>
    </div>
  );
}

export default function MRPDashboard() {
  const [expanded, setExpanded] = useState(null);
  const [abcFilter, setAbcFilter] = useState(null);
  const [showShortages, setShowShortages] = useState(false);
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    let d = DATA;
    if (abcFilter) d = d.filter(i => i.abc === abcFilter);
    if (showShortages) d = d.filter(i => i.weeks.some(w => w.value < 0));
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(i => i.component.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
    }
    return d.sort((a, b) => {
      const aMin = Math.min(...a.weeks.map(w => w.value));
      const bMin = Math.min(...b.weeks.map(w => w.value));
      return aMin - bMin;
    });
  }, [abcFilter, showShortages, search]);

  const weeks = DATA[0]?.weeks || [];
  const shortageCount = DATA.filter(i => i.weeks.some(w => w.value < 0)).length;
  const totalExposure = DATA.filter(i => i.weeks.some(w => w.value < 0)).reduce((sum, i) => {
    const minW = Math.min(...i.weeks.map(w => w.value));
    return sum + (minW < 0 ? Math.abs(minW) * (i.stdCost || 0) : 0);
  }, 0);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Helvetica, sans-serif", background: '#fff', minHeight: '100vh', color: '#323232' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: '#323232', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 28, background: '#C52026', borderRadius: 2 }} />
          <div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Material Requirements Planning</div>
            <div style={{ color: '#929498', fontSize: 12 }}>Branch 2 — Rochester &nbsp;·&nbsp; As of Feb 6, 2026</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: shortageCount > 0 ? '#EF4444' : '#10B981', fontSize: 26, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{shortageCount}</div>
            <div style={{ color: '#929498', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shortages</div>
          </div>
          <div style={{ width: 1, background: '#4D4D4D' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#F59E0B', fontSize: 26, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>${(totalExposure/1000).toFixed(0)}K</div>
            <div style={{ color: '#929498', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Exposure</div>
          </div>
          <div style={{ width: 1, background: '#4D4D4D' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{DATA.length}</div>
            <div style={{ color: '#929498', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Items</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', gap: 12, background: '#FAFAFA' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search item or description..."
          style={{ padding: '6px 12px', border: '1px solid #D4D4D4', borderRadius: 4, fontSize: 13, width: 220, outline: 'none', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {['A', 'B', 'C'].map(abc => (
            <button key={abc} onClick={() => setAbcFilter(abcFilter === abc ? null : abc)}
              style={{
                padding: '4px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: abcFilter === abc ? 'none' : '1px solid #D4D4D4',
                background: abcFilter === abc ? abcColors[abc] : '#fff',
                color: abcFilter === abc ? '#fff' : abcColors[abc],
              }}>{abc}</button>
          ))}
        </div>
        <button onClick={() => setShowShortages(!showShortages)}
          style={{
            padding: '4px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: showShortages ? 'none' : '1px solid #D4D4D4',
            background: showShortages ? '#C52026' : '#fff',
            color: showShortages ? '#fff' : '#C52026',
          }}>Shortages Only</button>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#929498' }}>
          {items.length} of {DATA.length} items &nbsp;·&nbsp; Sorted by worst net position
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 2 }}>
              <th style={{ padding: '8px 8px 8px 24px', textAlign: 'left', fontWeight: 600, color: '#929498', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#F9FAFB', zIndex: 3, minWidth: 80 }}>Item</th>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#929498', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', position: 'sticky', left: 80, background: '#F9FAFB', zIndex: 3, minWidth: 160 }}>Description</th>
              <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#929498', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', width: 30 }}>ABC</th>
              <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#929498', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>QOH</th>
              <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#929498', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trend</th>
              {weeks.map((w, i) => (
                <th key={i} style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 500, color: '#4D4D4D', fontSize: 10, whiteSpace: 'nowrap', minWidth: 62 }}>
                  <div style={{ color: '#929498' }}>{fmtWeek(w.date)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isExpanded = expanded === item.component;
              const inv = item.detail.find(d => d.sort === 1);
              const hasShortage = item.weeks.some(w => w.value < 0);
              return (
                <React.Fragment key={item.component}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : item.component)}
                    style={{
                      cursor: 'pointer', borderBottom: isExpanded ? 'none' : '1px solid #F0F0F0',
                      background: isExpanded ? '#F7F7F7' : hasShortage ? 'rgba(197,32,38,0.03)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#FAFAFA'; }}
                    onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = hasShortage ? 'rgba(197,32,38,0.03)' : 'transparent'; }}
                  >
                    <td style={{ padding: '8px 8px 8px 24px', fontWeight: 600, fontFamily: "'DM Mono', monospace", fontSize: 11, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                      <span style={{ marginRight: 6, fontSize: 8, color: '#929498' }}>{isExpanded ? '▼' : '▶'}</span>
                      {item.component}
                    </td>
                    <td style={{ padding: '8px', color: '#4D4D4D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180, position: 'sticky', left: 80, background: 'inherit', zIndex: 1 }}>{item.description}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: 22, height: 18, lineHeight: '18px', borderRadius: 3, fontSize: 10, fontWeight: 700, color: '#fff', background: abcColors[item.abc] || '#999', textAlign: 'center' }}>{item.abc}</span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{fmt(inv?.qoh)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}><SparkBar weeks={item.weeks} min={item.min} /></td>
                    {item.weeks.map((w, wi) => {
                      const c = cellColor(w.value, item.min);
                      return (
                        <td key={wi} style={{
                          padding: '6px 6px', textAlign: 'right', fontFamily: "'DM Mono', monospace",
                          fontWeight: w.value < 0 ? 700 : 400, fontSize: 11,
                          background: c.bg, color: c.fg, whiteSpace: 'nowrap',
                          borderLeft: '1px solid rgba(0,0,0,0.04)',
                        }}>{fmt(w.value)}</td>
                      );
                    })}
                  </tr>
                  {isExpanded && (
                    <tr><td colSpan={5 + weeks.length} style={{ padding: 0 }}>
                      <DetailPanel item={item} />
                    </td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: '#929498' }}>No items match the current filters.</div>
      )}

      {/* Legend */}
      <div style={{ padding: '12px 24px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: 20, fontSize: 11, color: '#929498' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#C52026', marginRight: 4, verticalAlign: 'middle' }} />Shortage</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#FEF3C7', border: '1px solid #FDE68A', marginRight: 4, verticalAlign: 'middle' }} />Below Min</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#F0FDF4', border: '1px solid #BBF7D0', marginRight: 4, verticalAlign: 'middle' }} />Adequate</span>
        <span style={{ marginLeft: 'auto' }}>Click any row to expand demand sources and open POs</span>
      </div>
    </div>
  );
}
