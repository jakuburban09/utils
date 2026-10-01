import { useEffect, useId, useMemo, useState } from 'react'

type Tool = 'home' | 'fuel' | 'currency' | 'loan' | 'invest'
type Rates = Record<'CZK' | 'EUR' | 'USD' | 'GBP', number>

const fallbackRates: Rates = { CZK: 1, EUR: 0.0405, USD: 0.044, GBP: 0.0342 }
const number = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.')) || 0
const groupedInput = (raw: string) => {
  const match = raw.trim().match(/^(-?)(\d*)([.,]?)(\d*)$/)
  if (!match) return raw
  const [, sign, integer, decimalMark, decimals] = match
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${grouped}${decimalMark}${decimals}`
}
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
  const [metals, setMetals] = useState({ gold: 94_682, silver: 44_278, platinum: 38_954 })

  useEffect(() => {
    const loadMarket = () => Promise.allSettled([
      fetch('https://open.er-api.com/v6/latest/CZK').then(r => r.json()),
      fetch('https://api.gold-api.com/price/XAU').then(r => r.json()),
      fetch('https://api.gold-api.com/price/XAG').then(r => r.json()),
      fetch('https://api.gold-api.com/price/XPT').then(r => r.json()),
    ]).then(([currencyResult, goldResult, silverResult, platinumResult]) => {
      let usdPerCzk = fallbackRates.USD
      if (currencyResult.status === 'fulfilled') {
        const r = currencyResult.value?.rates
        if (r?.EUR && r?.USD && r?.GBP) {
          const updatedRates = { CZK: 1, EUR: r.EUR, USD: r.USD, GBP: r.GBP }
          setRates(updatedRates)
          usdPerCzk = r.USD
          setRatesUpdated(`Aktualizováno ${new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`)
        } else setRatesUpdated('Používáme poslední dostupné kurzy')
      } else setRatesUpdated('Používáme poslední dostupné kurzy')
      const czkPerUsd = 1 / usdPerCzk
      setMetals(previous => ({
        gold: goldResult.status === 'fulfilled' && goldResult.value?.price ? Number(goldResult.value.price) * czkPerUsd : previous.gold,
        silver: silverResult.status === 'fulfilled' && silverResult.value?.price ? Number(silverResult.value.price) * 32.1507466 * czkPerUsd : previous.silver,
        platinum: platinumResult.status === 'fulfilled' && platinumResult.value?.price ? Number(platinumResult.value.price) * czkPerUsd : previous.platinum,
      }))
    })
    loadMarket()
    const refresh = window.setInterval(loadMarket, 5 * 60 * 1000)
    return () => window.clearInterval(refresh)
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

    {/* Hero sekce je dočasně skrytá; ponecháváme ji v historii Git pro snadné obnovení. */}

    <section className="market shell" aria-label="Tržní přehled">
      <div className="market-heading"><span className="pulse" /> TRH DNES <small>{ratesUpdated}</small></div>
      <div className="quotes">
        <Quote label="1 EUR" value={money(1 / rates.EUR)} />
        <Quote label="1 USD" value={money(1 / rates.USD)} />
        <Quote label="1 GBP" value={money(1 / rates.GBP)} />
        <Quote label="Zlato / troj. oz" value={money(metals.gold)} />
        <Quote label="Stříbro / kg" value={money(metals.silver)} />
        <Quote label="Platina / troj. oz" value={money(metals.platinum)} />
      </div>
      <p className="market-note">Kovy: orientační spotová cena v Kč. Zlato a platina za trojskou unci (31,1 g), stříbro za kilogram; bez marže obchodníka.</p>
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
        {active !== 'home' && <HelpfulNotes active={active} />}
      </div>
    </section>
    <footer className="shell">utils <span>Výpočty jsou orientační. Před finančním rozhodnutím ověřte podmínky poskytovatele.</span></footer>
  </main>
}

function Quote({ label, value }: { label: string; value: string }) { return <div className="quote"><span>{label}</span><b>{value}</b><small>v CZK</small></div> }

function HelpfulNotes({ active }: { active: Tool }) {
  const notes = active === 'loan'
    ? [
      ['Úroková sazba vs. RPSN', 'Úrok je cena za půjčení peněz. RPSN je širší ukazatel, který kromě úroku zohledňuje i některé poplatky a náklady. Pro porovnání nabídek bank je proto užitečnější RPSN.'],
      ['Kratší splatnost', 'Pět nebo deset let navíc obvykle sníží měsíční splátku, ale výrazně zvýší celkový přeplatek. Porovnání výše ukazuje tento rozdíl na stejném úvěru.'],
      ['Na co si dát pozor', 'Výpočet je orientační. Skutečná nabídka závisí na fixaci, poplatcích, pojištění, podmínkách banky a vaší bonitě.'],
    ]
    : active === 'invest'
      ? [
        ['Co znamená potenciální výnos', 'Je to rozdíl mezi odhadovanou hodnotou portfolia a vašimi vklady. Nejde o garantovanou částku ani slib budoucího zhodnocení.'],
        ['Síla pravidelnosti', 'Pravidelné vklady dávají investici čas využít složené úročení. Delší horizont zároveň pomáhá rozložit běžné výkyvy trhu.'],
        ['Praktický tip', 'Zkuste porovnat více scénářů výnosu a vkladu. Pro realistický plán počítejte i s poplatky, inflací a rezervou na nečekané výdaje.'],
      ]
      : active === 'currency'
        ? [['Kurz není vždy konečná cena', 'Banky a směnárny mohou k mezibankovnímu kurzu přidat vlastní marži nebo poplatek. Výsledek proto berte jako rychlou orientaci.']]
        : [['Jak výpočet číst', 'Výsledek vychází z vašich vstupů a slouží jako orientační odhad. Pro přesnější plán zkontrolujte aktuální cenu paliva a reálnou spotřebu.']]

  return <aside className="explanation-list" aria-label="Užitečné vysvětlení">{notes.map(([title, text]) => <div key={title}><strong>{title}</strong><p>{text}</p></div>)}</aside>
}

function Field({ label, value, onChange, suffix, hint, min = '0', step = 'any', allowNegative = false }: { label: string; value: string; onChange: (v: string) => void; suffix: string; hint?: string; min?: string; step?: string; allowNegative?: boolean }) {
  const id = useId()
  const increment = step === 'any' ? 1 : Number(step)
  const adjust = (direction: number) => {
    const next = Math.max(allowNegative ? -100_000_000 : Number(min), number(value) + direction * increment)
    onChange(groupedInput(String(Number(next.toFixed(6)))))
  }
  return <div className="field"><label htmlFor={id}>{label}</label><div className="input-wrap"><input id={id} inputMode="decimal" type="text" value={value} onChange={e => onChange(e.target.value)} onBlur={e => onChange(groupedInput(e.target.value))} /><b>{suffix}</b><span className="stepper" role="group" aria-label={`Upravit ${label}`}><button type="button" aria-label="Snížit" title={`Snížit: ${label}`} onClick={() => adjust(-1)}>−</button><button type="button" aria-label="Zvýšit" title={`Zvýšit: ${label}`} onClick={() => adjust(1)}>+</button></span></div>{hint && <small>{hint}</small>}</div>
}

function Notice({ children }: { children: React.ReactNode }) { return <div className="notice" role="alert"><b>!</b><span>{children}</span></div> }

function FuelCalculator() {
  const [consumption, setConsumption] = useState('6.4'); const [price, setPrice] = useState('35.90'); const [distance, setDistance] = useState('280'); const [people, setPeople] = useState('1'); const [roundTrip, setRoundTrip] = useState(false)
  const totalKm = number(distance) * (roundTrip ? 2 : 1); const liters = totalKm / 100 * number(consumption); const total = liters * number(price); const count = Math.max(1, number(people))
  const error = !number(consumption) || number(consumption) > 50 ? 'Spotřeba musí být mezi 0,1 a 50 l / 100 km.' : !number(price) || number(price) > 1_000 ? 'Zadejte cenu paliva vyšší než 0 a nižší než 1 000 Kč / l.' : !number(distance) || number(distance) > 100_000 ? 'Vzdálenost musí být mezi 1 a 100 000 km.' : !number(people) || number(people) > 100 ? 'Počet cestujících musí být celé číslo od 1 do 100.' : ''
  return <div className="calc-layout fuel-layout"><div className="form-card"><div className="form-title"><span>⛽</span><div><h3>Kam jedeme?</h3><p>Cenu počítáme podle skutečné spotřeby.</p></div></div><div className="fields"><Field label="Spotřeba auta" value={consumption} onChange={setConsumption} suffix="l / 100 km" step="0.1" /><Field label="Cena paliva" value={price} onChange={setPrice} suffix="Kč / l" step="0.01" /><Field label="Vzdálenost" value={distance} onChange={setDistance} suffix="km" step="1" /><Field label="Počet cestujících" value={people} onChange={setPeople} suffix="os." step="1" min="1" /></div><label className="switch"><input type="checkbox" checked={roundTrip} onChange={e => setRoundTrip(e.target.checked)} /><span /> Započítat cestu tam i zpět</label></div><div className="result-card orange-result">{error ? <Notice>{error}</Notice> : <><p>CENA CESTY {roundTrip && 'TAM I ZPĚT'}</p><strong>{money(total)}</strong><div className="result-line"><span>Spotřebujete</span><b>{compact(liters)} l paliva</b></div><div className="result-line"><span>Náklad na 1 km</span><b>{money(totalKm ? total / totalKm : 0, 'CZK', 2)}</b></div>{count > 1 && <div className="result-line"><span>Na osobu</span><b>{money(total / count)}</b></div>}<div className="tip">✦ Tip: Pro reálnější rozpočet přidejte 10 % na popojíždění a klimatizaci.</div></>}</div></div>
}

function CurrencyCalculator({ rates, updated }: { rates: Rates; updated: string }) {
  const codes = Object.keys(rates) as (keyof Rates)[]
  const initialCzk = 1000
  const [values, setValues] = useState<Record<keyof Rates, string>>({ CZK: '1 000', EUR: compact(initialCzk * rates.EUR), USD: compact(initialCzk * rates.USD), GBP: compact(initialCzk * rates.GBP) })
  const update = (code: keyof Rates, raw: string) => {
    const czk = number(raw) / rates[code]
    setValues(Object.fromEntries(codes.map(currency => [currency, raw === '' ? '' : compact(czk * rates[currency])])) as Record<keyof Rates, string>)
  }
  return <div className="currency-card"><div className="currency-top"><div><span className="live">● ŽIVÉ KURZY</span><h3>Kolik dostanete za své peníze?</h3><p>{updated}. Kurz lze změnit přepsáním kteréhokoliv pole.</p></div><span className="currency-mark">⇄</span></div><div className="currency-grid">{codes.map(code => {
    const id = `currency-${code}`
    const label = code === 'CZK' ? 'Česká koruna' : code === 'EUR' ? 'Euro' : code === 'USD' ? 'Americký dolar' : 'Britská libra'
    return <div className="currency-input" key={code}><label htmlFor={id}><b>{code}</b><small>{label}</small></label><input id={id} inputMode="decimal" value={values[code]} onChange={e => update(code, e.target.value)} onBlur={e => update(code, groupedInput(e.target.value))} /><span className="stepper" role="group" aria-label={`Upravit částku v ${code}`}><button type="button" aria-label="Snížit" title={`Snížit ${code}`} onClick={() => update(code, String(Math.max(0, number(values[code]) - 1)))}>−</button><button type="button" aria-label="Zvýšit" title={`Zvýšit ${code}`} onClick={() => update(code, String(number(values[code]) + 1))}>+</button></span></div>
  })}</div><div className="info-note">Kurzy se načítají z veřejného zdroje. Přepočet slouží pro orientaci; banky a směnárny mohou používat vlastní kurz.</div></div>
}

function LoanCalculator() {
  const [amount, setAmount] = useState('2 500 000')
  const [rate, setRate] = useState('5,29')
  const [years, setYears] = useState('25')
  const [monthlyChange, setMonthlyChange] = useState('0')
  const [rateKind, setRateKind] = useState<'interest' | 'rpsn'>('interest')
  const principal = number(amount), termYears = number(years), months = Math.max(1, termYears * 12)
  const annualRate = number(rate) / 100
  const monthlyRate = rateKind === 'rpsn' ? Math.pow(1 + annualRate, 1 / 12) - 1 : annualRate / 12
  const payment = monthlyRate ? principal * monthlyRate * (1 + monthlyRate) ** months / ((1 + monthlyRate) ** months - 1) : principal / months
  const total = payment * months, overpay = total - principal, adjustedPayment = payment + number(monthlyChange)
  const error = !principal || principal > 100_000_000 ? 'Výše úvěru musí být mezi 1 Kč a 100 mil. Kč.' : annualRate < 0 || annualRate > 1 ? 'Roční úrok nebo RPSN zadejte v rozsahu 0 až 100 %.' : !termYears || termYears > 35 ? 'Doba splatnosti je pro tuto kalkulačku 1 až 35 let.' : ''
  const scenario = useMemo(() => {
    if (adjustedPayment <= monthlyRate * principal) return null
    let balance = principal
    for (let month = 1; month <= 4200; month++) {
      balance = balance * (1 + monthlyRate) - adjustedPayment
      if (balance <= 0.01) return { months: month }
    }
    return null
  }, [adjustedPayment, monthlyRate, principal])
  const schedule = useMemo(() => Array.from({ length: Math.min(6, Math.max(1, termYears)) }, (_, i) => { const n = Math.min(months, (i + 1) * 12); const balance = monthlyRate ? principal * (((1 + monthlyRate) ** months - (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** months - 1)) : principal * (1 - n / months); return { year: i + 1, balance: Math.max(0, balance) } }), [principal, months, monthlyRate, termYears])
  const comparisonTerms = [termYears, termYears - 5, termYears - 10].filter((term, index, terms) => term > 0 && terms.indexOf(term) === index)
  const comparison = comparisonTerms.map(term => { const comparisonMonths = term * 12; const comparisonPayment = monthlyRate ? principal * monthlyRate * (1 + monthlyRate) ** comparisonMonths / ((1 + monthlyRate) ** comparisonMonths - 1) : principal / comparisonMonths; const comparisonTotal = comparisonPayment * comparisonMonths; return { term, payment: comparisonPayment, overpay: comparisonTotal - principal } })
  const formatTerm = (duration: number) => {
    const termYears = Math.floor(duration / 12), termMonths = duration % 12
    const yearLabel = termYears === 1 ? 'rok' : termYears >= 2 && termYears <= 4 ? 'roky' : 'let'
    const monthLabel = termMonths === 1 ? 'měsíc' : termMonths >= 2 && termMonths <= 4 ? 'měsíce' : 'měsíců'
    return [termYears ? `${termYears} ${yearLabel}` : '', termMonths ? `${termMonths} ${monthLabel}` : ''].filter(Boolean).join(' ')
  }
  const monthDifference = scenario ? months - scenario.months : 0
  const longestTerm = Math.max(months, scenario?.months ?? months)

  return <div className="calc-layout loan-layout">
    <div className="form-card">
      <div className="form-title"><span>⌁</span><div><h3>Parametry úvěru</h3><p>Anuitní splácení s pevnou sazbou.</p></div></div>
      <div className="segmented" aria-label="Typ sazby"><button className={rateKind === 'interest' ? 'active' : ''} onClick={() => setRateKind('interest')}>Úroková sazba</button><button className={rateKind === 'rpsn' ? 'active' : ''} onClick={() => setRateKind('rpsn')}>RPSN</button></div>
      <div className="fields one-col">
        <Field label="Výše úvěru" value={amount} onChange={setAmount} suffix="Kč" step="10000" />
        <Field label={rateKind === 'interest' ? 'Úroková sazba' : 'RPSN'} value={rate} onChange={setRate} suffix="% ročně" step="0.01" />
        <Field label="Doba splatnosti" value={years} onChange={setYears} suffix="let" step="1" min="1" />
        <Field label="Měsíční změna splátky" value={monthlyChange} onChange={setMonthlyChange} suffix="Kč / měs." step="500" allowNegative hint="Kladná částka splátku navýší, záporná ji sníží." />
      </div>
    </div>
    <div className="loan-results">
      {error ? <Notice>{error}</Notice> : <>
        <div className="payment-box"><p>MĚSÍČNÍ SPLÁTKA</p><strong>{money(payment)}</strong><span>po dobu {years} let</span></div>
        <div className="stat-grid"><div><span>Celkem zaplatíte</span><b>{money(total)}</b></div><div><span>Přeplatíte na {rateKind === 'rpsn' ? 'nákladech' : 'úrocích'}</span><b className="accent-violet">{money(overpay)}</b></div></div>
        {number(monthlyChange) !== 0 && <div className="scenario-card">
          <h4>{scenario ? 'Nová doba splácení' : 'Splátka je příliš nízká'}</h4>
          {scenario ? <>
            <p className="scenario-result">{formatTerm(scenario.months)}</p>
            <p>{monthDifference > 0 ? `Úvěr splatíte o ${formatTerm(monthDifference)} dříve.` : monthDifference < 0 ? `Úvěr budete splácet o ${formatTerm(-monthDifference)} déle.` : 'Doba splácení se nezmění.'}</p>
            <div className="duration-chart" role="img" aria-label={`Původně ${formatTerm(months)}, při změně splátky ${formatTerm(scenario.months)}`}>
              <div className="duration-row"><span>Původně</span><i><b className="duration-original" style={{ width: `${months / longestTerm * 100}%` }} /></i><strong>{formatTerm(months)}</strong></div>
              <div className="duration-row"><span>Nově</span><i><b className="duration-adjusted" style={{ width: `${scenario.months / longestTerm * 100}%` }} /></i><strong>{formatTerm(scenario.months)}</strong></div>
            </div>
          </> : <p>Změněná splátka musí být vyšší než měsíční úrok. Zvyšte ji, aby se snižovala i jistina.</p>}
        </div>}
        <div className="loan-comparison"><div className="chart-head"><b>Porovnání délky splácení</b><small>měsíční splátka a přeplatek</small></div>{comparison.map(item => <div className="comparison-row" key={item.term}><b>{item.term} let</b><span>{money(item.payment)} / měs.</span><em>{money(item.overpay)} přeplatek</em></div>)}</div>
        <div className="mini-chart"><div className="chart-head"><b>Vývoj zbývajícího dluhu</b><small>prvních {schedule.length} let</small></div>{schedule.map(item => <div className="bar-row" key={item.year}><span>{item.year}. rok</span><i><b style={{ width: `${Math.max(3, item.balance / principal * 100)}%` }} /></i><em>{money(item.balance)}</em></div>)}</div>
        <div className="tip violet-tip">✦ {rateKind === 'rpsn' ? 'RPSN je orientační převod na měsíční sazbu; skutečné poplatky se mohou lišit.' : 'Mimořádná splátka může zkrátit dobu úvěru nebo snížit budoucí úroky.'}</div>
      </>}
    </div>
  </div>
}

function InvestmentCalculator() {
  const [initial, setInitial] = useState('100 000')
  const [monthly, setMonthly] = useState('3 000')
  const [rate, setRate] = useState('7')
  const [years, setYears] = useState('15')
  const [chartYear, setChartYear] = useState(15)
  const y = number(years), r = number(rate) / 100 / 12, n = y * 12, start = number(initial), monthlyValue = number(monthly)
  const valueAt = (year: number) => { const months = year * 12; return start * (1 + r) ** months + (r ? monthlyValue * (((1 + r) ** months - 1) / r) : monthlyValue * months) }
  const finalValue = valueAt(y), invested = start + monthlyValue * n, gain = finalValue - invested
  const error = start < 0 || monthlyValue < 0 || (!start && !monthlyValue) ? 'Zadejte počáteční vklad, měsíční vklad, nebo obojí.' : number(rate) < -50 || number(rate) > 30 ? 'Očekávaný roční výnos zadejte v rozsahu −50 až 30 %.' : !y || y > 60 ? 'Délka investice je pro přehledný roční graf 1 až 60 let.' : ''
  const annualData = useMemo(() => Array.from({ length: Math.max(0, y) }, (_, index) => { const year = index + 1, value = valueAt(year), deposits = start + monthlyValue * year * 12; return { year, value, deposits, gain: value - deposits } }), [y, start, monthlyValue, r])
  const maximum = Math.max(...annualData.map(item => item.value), 1)
  const interval = Math.max(1, Math.ceil(annualData.length / 10))
  const selectedYear = Math.min(chartYear, y)
  const chartData = annualData.filter((item, index) => index % interval === 0 || index === annualData.length - 1 || item.year === selectedYear)
  const selected = annualData.find(item => item.year === selectedYear) ?? annualData.at(-1)

  return <div className="calc-layout invest-layout">
    <div className="form-card"><div className="form-title"><span>↗</span><div><h3>Investiční plán</h3><p>Model pravidelného zhodnocování.</p></div></div><div className="fields one-col">
      <Field label="Počáteční vklad" value={initial} onChange={setInitial} suffix="Kč" step="1000" />
      <Field label="Měsíční vklad" value={monthly} onChange={setMonthly} suffix="Kč" step="500" />
      <Field label="Očekávaný výnos" value={rate} onChange={setRate} suffix="% p.a." step="0.1" />
      <Field label="Délka investice" value={years} onChange={setYears} suffix="let" step="1" min="1" />
    </div></div>
    <div className="investment-results">{error ? <Notice>{error}</Notice> : <>
      <div className="payment-box green-box"><p>ODHAD HODNOTY PORTFOLIA</p><strong>{money(finalValue)}</strong><span>po {years} letech, při měsíčním připisování výnosu</span></div>
      <div className="stat-grid"><div><span>Vaše vklady</span><b>{money(invested)}</b></div><div><span>Potenciální výnos</span><b className="accent-green">{money(gain)}</b></div></div>
      <div className="growth">
        <div className="chart-head"><b>Hodnota portfolia v čase</b><small>Klepnutím na sloupec vyberte rok</small></div>
        <div className="growth-legend"><span><i className="legend-deposits" /> Vklady</span><span><i className="legend-gain" /> Výnos</span></div>
        <div className="growth-bars" role="group" aria-label="Vývoj investice po letech">{chartData.map(item => <button type="button" className={`growth-step ${selected?.year === item.year ? 'selected' : ''}`} key={item.year} onClick={() => setChartYear(item.year)} aria-pressed={selected?.year === item.year} aria-label={`${item.year}. rok: portfolio ${money(item.value)}, vklady ${money(item.deposits)}, výnos ${money(item.gain)}`}>
          <span className="growth-stack" style={{ height: `${Math.max(4, item.value / maximum * 100)}%` }}><i className="growth-deposits" style={{ height: `${item.value > 0 ? Math.min(100, Math.max(0, item.deposits / item.value * 100)) : 0}%` }} /><i className="growth-gain" style={{ height: `${item.value > 0 ? Math.min(100, Math.max(0, item.gain / item.value * 100)) : 0}%` }} /></span><span className="growth-year">{item.year}</span>
        </button>)}</div>
        {selected && <div className="growth-detail" aria-live="polite"><strong>{selected.year}. rok</strong><span>Hodnota portfolia <b>{money(selected.value)}</b></span><span>Vklady <b>{money(selected.deposits)}</b></span><span>Výnos <b className={selected.gain < 0 ? 'loss' : 'accent-green'}>{money(selected.gain)}</b></span></div>}
      </div>
      <div className="tip green-tip">✦ Výnos není garantovaný. Delší horizont pomáhá ustát běžné výkyvy trhu.</div>
    </>}</div>
  </div>
}

export default App
