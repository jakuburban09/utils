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
    fireEvent.change(screen.getByLabelText(/Vzdálenost/), { target: { value: '0' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Vzdálenost musí být mezi 1 a 100 000 km')
  })

  it('otevírá převod měn s editovatelnými poli', () => {
    render(<App />)
    open('Konverze měn')
    expect(screen.getByText('Kolik dostanete za své peníze?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
    expect(screen.getByText(/Kurzy se načítají z veřejného zdroje/)).toBeInTheDocument()
  })

  it('u úvěru limituje nereálně dlouhou splatnost a umí přepnout na RPSN', () => {
    render(<App />)
    open('Úvěry a hypotéky')
    fireEvent.change(screen.getByLabelText(/Doba splatnosti/), { target: { value: '100' } })
    expect(screen.getByRole('alert')).toHaveTextContent('1 až 50 let')
    fireEvent.click(screen.getByRole('button', { name: 'RPSN' }))
    expect(screen.getByText('Doba splatnosti je pro tuto kalkulačku 1 až 50 let. U velmi dlouhých dob se splátka blíží samotnému měsíčnímu úroku, proto už klesá jen nepatrně.')).toBeInTheDocument()
  })

  it('u investic vykreslí detail pro každý rok a upozorní na neplatný horizont', () => {
    render(<App />)
    open('Investování')
    expect(screen.getByLabelText(/^1\. rok, vloženo/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^15\. rok, vloženo/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Délka investice/), { target: { value: '61' } })
    expect(screen.getByRole('alert')).toHaveTextContent('1 až 60 let')
  })
})
