import { useEffect, useMemo, useState } from 'react'

type Tool = 'home' | 'fuel' | 'currency' | 'loan' | 'invest'
type Rates = Record<'CZK' | 'EUR' | 'USD' | 'GBP', number>

const fallbackRates: Rates = { CZK: 1, EUR: 0.0405, USD: 0.044, GBP: 0.0342 }
const number = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.')) || 0
const money = (value: number, currency = 'CZK', digits = 0) => new Intl.NumberFormat('cs-CZ', {
  style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(value)
const compact = (value: number) => new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 }).format(value)

const tools: { id: Exclude<Tool, 'home'>; icon: string; title: string; label: string; description: string; tint: string }[] = [
  { id: 'currency', icon: '⇄', title: 'Konverze měn', label: 'Aktuální kurzy', description: 'CZK, EUR, USD a GBP přehledně na jednom místě.', tint: 'cyan' },
  { id: 'loan', icon: '⌁', title: 'Úvěry a hypotéky', label: 'Plán splácení', description: 'Splátka, přeplacení i vývoj zůstatku.', tint: 'violet' },
  { id: 'invest', icon: '↗', title: 'Investování', label: 'Síla času', description: 'Zjistěte, jak může růst pravidelné investování.', tint: 'green' },
  { id: 'fuel', icon: '⛽', title: 'Cena cesty', label: 'Benzín a nafta', description: 'Spočítejte palivo, náklady i podíl pro posádku.', tint: 'orange' },
]

function App() {
  const [active, setActive] = useState<Tool>('home')
  const [rates, setRates] = useState<Rates>(fallbackRates)
  const [ratesUpdated, setRatesUpdated] = useState('Načítám kurzy…')
  const [metals, setMetals] = useState({ gold: 5280, silver: 1160, platinum: 2190 })

  useEffect(() => {
    Promise.allSettled([
      fetch('https://open.er-api.com/v6/latest/CZK').then(r => r.json()),
      fetch('https://api.metals.live/v1/spot').then(r => r.json()),
    ]).then(([currencyResult, metalsResult]) => {
      if (currencyResult.status === 'fulfilled') {
        const r = currencyResult.value?.rates
        if (r?.EUR && r?.USD && r?.GBP) {
          const updatedRates = { CZK: 1, EUR: r.EUR, USD: r.USD, GBP: r.GBP }
          setRates(updatedRates)
          setRatesUpdated('Aktualizováno právě teď')
        } else setRatesUpdated('Používáme poslední dostupné kurzy')
      } else setRatesUpdated('Používáme poslední dostupné kurzy')
      if (metalsResult.status === 'fulfilled' && Array.isArray(metalsResult.value)) {
        const quote = (name: string) => metalsResult.value.find((x: Record<string, unknown>) => String(x.metal ?? x.name ?? '').toLowerCase().includes(name))
        const gold = quote('gold')?.price, silver = quote('silver')?.price, platinum = quote('platinum')?.price
        if (gold && silver && platinum) setMetals({ gold: Number(gold) * fallbackRates.USD, silver: Number(silver) * 32.1507466 * fallbackRates.USD, platinum: Number(platinum) * fallbackRates.USD })
      }
    })
  }, [])

  const go = (tool: Tool) => { setActive(tool); window.setTimeout(() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0) }

  return <main>
    <nav className="nav shell">
      <button className="brand" onClick={() => go('home')} aria-label="Úvod utils"><span>u</span>utils</button>
      <div className="nav-links">
        {tools.map(tool => <button className={active === tool.id ? 'selected' : ''} onClick={() => go(tool.id)} key={tool.id}>{tool.title}</button>)}
      </div>
      <button className="nav-cta" onClick={() => go('fuel')}>Začít počítat <b>→</b></button>
    </nav>

    <section className="hero shell">
      <p className="eyebrow"><i /> PRAKTICKÉ FINANCE BEZ TABULEK</p>
      <h1>Malé výpočty.<br /><em>Velká jistota.</em></h1>
      <p className="hero-copy">Proměňte čísla v jasné odpovědi. Rychle, srozumitelně a bez registrace.</p>
      <div className="hero-actions"><button className="primary" onClick={() => go('fuel')}>Vyzkoušet kalkulačky <b>→</b></button><span>Zdarma · bez účtu</span></div>
    </section>

    <section className="market shell" aria-label="Tržní přehled">
      <div className="market-heading"><span className="pulse" /> TRH DNES <small>{ratesUpdated}</small></div>
      <div className="quotes">
        <Quote label="1 EUR" value={money(1 / rates.EUR)} />
        <Quote label="1 USD" value={money(1 / rates.USD)} />
        <Quote label="1 GBP" value={money(1 / rates.GBP)} />
        <Quote label="Zlato / oz" value={money(metals.gold)} />
        <Quote label="Stříbro / kg" value={money(metals.silver)} />
        <Quote label="Platina / oz" value={money(metals.platinum)} />
      </div>
    </section>

    <section className="tool-grid shell" aria-label="Kalkulačky">
      {tools.map((tool, index) => <button className={`tool-card ${tool.tint}`} onClick={() => go(tool.id)} key={tool.id}>
        <span className="tool-number">0{index + 1}</span><span className="tool-icon">{tool.icon}</span><span className="tool-label">{tool.label}</span><strong>{tool.title}</strong><span className="tool-description">{tool.description}</span><span className="tool-arrow">→</span>
      </button>)}
    </section>

    <section id="calculator" className="calculator-wrap">
      <div className="shell">
        <div className="section-title"><p className="eyebrow"><i /> KALKULAČKA</p><h2>{active === 'home' ? 'Vyberte si, co potřebujete spočítat' : tools.find(t => t.id === active)?.title}</h2></div>
        {active === 'home' && <div className="empty"><span>✦</span><p>Klikněte na dlaždici výše — začít můžete třeba výpočtem ceny vaší další cesty.</p></div>}
        {active === 'fuel' && <FuelCalculator />}
        {active === 'currency' && <CurrencyCalculator rates={rates} updated={ratesUpdated} />}
        {active === 'loan' && <LoanCalculator />}
        {active === 'invest' && <InvestmentCalculator />}
      </div>
    </section>
    <footer className="shell">utils <span>Výpočty jsou orientační. Před finančním rozhodnutím ověřte podmínky poskytovatele.</span></footer>
  </main>
}

function Quote({ label, value }: { label: string; value: string }) { return <div className="quote"><span>{label}</span><b>{value}</b><small>v CZK</small></div> }

function Field({ label, value, onChange, suffix, hint, min = '0', step = 'any' }: { label: string; value: string; onChange: (v: string) => void; suffix: string; hint?: string; min?: string; step?: string }) {
  return <label className="field"><span>{label}</span><div className="input-wrap"><input inputMode="decimal" type="number" min={min} step={step} value={value} onChange={e => onChange(e.target.value)} /><b>{suffix}</b></div>{hint && <small>{hint}</small>}</label>
}

function FuelCalculator() {
  const [consumption, setConsumption] = useState('6.4'); const [price, setPrice] = useState('35.90'); const [distance, setDistance] = useState('280'); const [people, setPeople] = useState('1'); const [roundTrip, setRoundTrip] = useState(false)
  const totalKm = number(distance) * (roundTrip ? 2 : 1); const liters = totalKm / 100 * number(consumption); const total = liters * number(price); const count = Math.max(1, number(people))
  return <div className="calc-layout fuel-layout"><div className="form-card"><div className="form-title"><span>⛽</span><div><h3>Kam jedeme?</h3><p>Cenu počítáme podle skutečné spotřeby.</p></div></div><div className="fields"><Field label="Spotřeba auta" value={consumption} onChange={setConsumption} suffix="l / 100 km" step="0.1" /><Field label="Cena paliva" value={price} onChange={setPrice} suffix="Kč / l" step="0.01" /><Field label="Vzdálenost" value={distance} onChange={setDistance} suffix="km" step="1" /><Field label="Počet cestujících" value={people} onChange={setPeople} suffix="os." step="1" min="1" /></div><label className="switch"><input type="checkbox" checked={roundTrip} onChange={e => setRoundTrip(e.target.checked)} /><span /> Započítat cestu tam i zpět</label></div><div className="result-card orange-result"><p>CENA CESTY {roundTrip && 'TAM I ZPĚT'}</p><strong>{money(total)}</strong><div className="result-line"><span>Spotřebujete</span><b>{compact(liters)} l paliva</b></div><div className="result-line"><span>Náklad na 1 km</span><b>{money(totalKm ? total / totalKm : 0, 'CZK', 2)}</b></div>{count > 1 && <div className="result-line"><span>Na osobu</span><b>{money(total / count)}</b></div>}<div className="tip">✦ Tip: Pro reálnější rozpočet přidejte 10 % na popojíždění a klimatizaci.</div></div></div>
}

function CurrencyCalculator({ rates, updated }: { rates: Rates; updated: string }) {
  const codes = Object.keys(rates) as (keyof Rates)[]; const [values, setValues] = useState<Record<keyof Rates, string>>({ CZK: '1000', EUR: compact(1000 * rates.EUR), USD: compact(1000 * rates.USD), GBP: compact(1000 * rates.GBP) })
  const update = (code: keyof Rates, raw: string) => { const czk = number(raw) / rates[code]; setValues(Object.fromEntries(codes.map(c => [c, raw === '' ? '' : compact(czk * rates[c])])) as Record<keyof Rates, string>) }
  return <div className="currency-card"><div className="currency-top"><div><span className="live">● ŽIVÉ KURZY</span><h3>Kolik dostanete za své peníze?</h3><p>{updated}. Kurz lze změnit přepsáním kteréhokoliv pole.</p></div><span className="currency-mark">⇄</span></div><div className="currency-grid">{codes.map(code => <label className="currency-input" key={code}><span>{code}<small>{code === 'CZK' ? 'Česká koruna' : code === 'EUR' ? 'Euro' : code === 'USD' ? 'Americký dolar' : 'Britská libra'}</small></span><input inputMode="decimal" value={values[code]} onChange={e => update(code, e.target.value)} /></label>)}</div><div className="info-note">Kurzy se načítají z veřejného zdroje. Přepočet slouží pro orientaci; banky a směnárny mohou používat vlastní kurz.</div></div>
}

function LoanCalculator() {
  const [amount, setAmount] = useState('2500000'), [rate, setRate] = useState('5.29'), [years, setYears] = useState('25')
  const principal = number(amount), months = Math.max(1, number(years) * 12), monthlyRate = number(rate) / 100 / 12; const payment = monthlyRate ? principal * monthlyRate * (1 + monthlyRate) ** months / ((1 + monthlyRate) ** months - 1) : principal / months; const total = payment * months, overpay = total - principal
  const schedule = useMemo(() => Array.from({ length: Math.min(6, Math.max(1, number(years))) }, (_, i) => { const n = Math.min(months, (i + 1) * 12); const balance = monthlyRate ? principal * (((1 + monthlyRate) ** months - (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** months - 1)) : principal * (1 - n / months); return { year: i + 1, balance: Math.max(0, balance) } }), [principal, months, monthlyRate, years])
  return <div className="calc-layout loan-layout"><div className="form-card"><div className="form-title"><span>⌁</span><div><h3>Parametry úvěru</h3><p>Anuitní splácení s pevnou sazbou.</p></div></div><div className="fields one-col"><Field label="Výše úvěru" value={amount} onChange={setAmount} suffix="Kč" step="10000" /><Field label="Úrok / RPSN" value={rate} onChange={setRate} suffix="% ročně" step="0.01" /><Field label="Doba splatnosti" value={years} onChange={setYears} suffix="let" step="1" min="1" /></div></div><div className="loan-results"><div className="payment-box"><p>MĚSÍČNÍ SPLÁTKA</p><strong>{money(payment)}</strong><span>po dobu {years} let</span></div><div className="stat-grid"><div><span>Celkem zaplatíte</span><b>{money(total)}</b></div><div><span>Přeplatíte na úrocích</span><b className="accent-violet">{money(overpay)}</b></div></div><div className="mini-chart"><div className="chart-head"><b>Vývoj zbývajícího dluhu</b><small>prvních {schedule.length} let</small></div>{schedule.map((item, i) => <div className="bar-row" key={item.year}><span>{item.year}. rok</span><i><b style={{ width: `${Math.max(3, item.balance / principal * 100)}%` }} /></i><em>{money(item.balance)}</em></div>)}</div><div className="tip violet-tip">✦ Každá mimořádná splátka zkracuje dobu úvěru nebo sníží budoucí úroky.</div></div></div>
}

function InvestmentCalculator() {
  const [initial, setInitial] = useState('100000'), [monthly, setMonthly] = useState('3000'), [rate, setRate] = useState('7'), [years, setYears] = useState('15')
  const y = Math.max(1, number(years)), r = number(rate) / 100 / 12, n = y * 12, start = number(initial), monthlyValue = number(monthly); const finalValue = start * (1 + r) ** n + (r ? monthlyValue * (((1 + r) ** n - 1) / r) : monthlyValue * n); const invested = start + monthlyValue * n; const gain = finalValue - invested
  const milestones = [Math.round(y / 3), Math.round(y * 2 / 3), y].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(year => { const mn = year * 12; return { year, value: start * (1 + r) ** mn + (r ? monthlyValue * (((1 + r) ** mn - 1) / r) : monthlyValue * mn) } })
  return <div className="calc-layout invest-layout"><div className="form-card"><div className="form-title"><span>↗</span><div><h3>Investiční plán</h3><p>Model pravidelného zhodnocování.</p></div></div><div className="fields one-col"><Field label="Počáteční vklad" value={initial} onChange={setInitial} suffix="Kč" step="1000" /><Field label="Měsíční vklad" value={monthly} onChange={setMonthly} suffix="Kč" step="500" /><Field label="Očekávaný výnos" value={rate} onChange={setRate} suffix="% p.a." step="0.1" /><Field label="Délka investice" value={years} onChange={setYears} suffix="let" step="1" min="1" /></div></div><div className="investment-results"><div className="payment-box green-box"><p>ODHAD HODNOTY PORTFOLIA</p><strong>{money(finalValue)}</strong><span>při měsíčním připisování výnosu</span></div><div className="stat-grid"><div><span>Vaše vklady</span><b>{money(invested)}</b></div><div><span>Potenciální výnos</span><b className="accent-green">{money(gain)}</b></div></div><div className="growth"><div className="chart-head"><b>Jak může růst portfolio</b><small>orientační scénář</small></div>{milestones.map((m, i) => <div className="growth-step" key={m.year}><div style={{ height: `${22 + (i + 1) / milestones.length * 68}%` }} /><span>{m.year}. rok</span><b>{money(m.value)}</b></div>)}</div><div className="tip green-tip">✦ Výnos není garantovaný. Delší horizont pomáhá ustát běžné výkyvy trhu.</div></div></div>
}

export default App
