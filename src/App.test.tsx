import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const open = (name: string) => fireEvent.click(screen.getAllByRole('button', { name })[0])

describe('utils kalkulačky', () => {
  it('nezobrazuje dočasně skrytou hero sekci a otevírá kalkulačku paliva', () => {
    render(<App />)
    expect(screen.queryByText('Malé výpočty.')).not.toBeInTheDocument()
    open('Cena cesty')
    expect(screen.getByText(/CENA CESTY/)).toBeInTheDocument()
    expect(screen.getByText(/Spotřebujete/)).toBeInTheDocument()
  })

  it('u paliva vysvětlí neplatnou vzdálenost', () => {
    render(<App />)
    open('Cena cesty')
    fireEvent.change(screen.getByRole('textbox', { name: /Vzdálenost/ }), { target: { value: '0' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Vzdálenost musí být mezi 1 a 100 000 km')
  })

  it('otevírá převod měn s editovatelnými poli', () => {
    render(<App />)
    open('Konverze měn')
    expect(screen.getByText('Kolik dostanete za své peníze?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1 000')).toBeInTheDocument()
    expect(screen.getByText(/Kurzy se načítají z veřejného zdroje/)).toBeInTheDocument()
  })

  it('u úvěru limituje nereálně dlouhou splatnost a umí přepnout na RPSN', () => {
    render(<App />)
    open('Úvěry a hypotéky')
    expect(screen.getByText('25 let')).toBeInTheDocument()
    expect(screen.getByText('20 let')).toBeInTheDocument()
    expect(screen.getByText('15 let')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /Úroková sazba/ }), { target: { value: '5,29' } })
    expect(screen.getByRole('textbox', { name: /Úroková sazba/ })).toHaveValue('5,29')
    fireEvent.change(screen.getByRole('textbox', { name: /Výše úvěru/ }), { target: { value: '2500000' } })
    fireEvent.blur(screen.getByRole('textbox', { name: /Výše úvěru/ }))
    expect(screen.getByRole('textbox', { name: /Výše úvěru/ })).toHaveValue('2 500 000')
    fireEvent.click(screen.getByTitle('Zvýšit: Měsíční změna splátky'))
    expect(screen.getByText(/Úvěr splatíte o/)).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Snížit: Měsíční změna splátky'))
    fireEvent.change(screen.getByRole('textbox', { name: /Měsíční změna splátky/ }), { target: { value: '-500' } })
    expect(screen.getByText(/Úvěr budete splácet o/)).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /Měsíční změna splátky/ }), { target: { value: '-10000' } })
    expect(screen.getByText('Splátka je příliš nízká')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /Doba splatnosti/ }), { target: { value: '100' } })
    expect(screen.getByRole('alert')).toHaveTextContent('1 až 35 let')
    fireEvent.click(screen.getByRole('button', { name: 'RPSN' }))
    expect(screen.getByText('Doba splatnosti je pro tuto kalkulačku 1 až 35 let.')).toBeInTheDocument()
  })

  it('u investic vykreslí detail pro každý rok a upozorní na neplatný horizont', () => {
    render(<App />)
    open('Investování')
    expect(screen.getByRole('button', { name: /^1\. rok: portfolio/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^15\. rok: portfolio/ })).toBeInTheDocument()
    expect(screen.getByText('Hodnota portfolia v čase')).toBeInTheDocument()
    expect(screen.getAllByText(/1\s235\s782 Kč/)).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /^1\. rok: portfolio/ }))
    expect(screen.getByText(/8\s407 Kč/)).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /Délka investice/ }), { target: { value: '61' } })
    expect(screen.getByRole('alert')).toHaveTextContent('1 až 60 let')
  })
})
