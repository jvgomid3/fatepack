"use client"

import { useEffect } from "react"

function readInputValue(): {
  name: string; email: string; password: string; phone: string; block: string; apartment: string
} {
  const q = (sel: string) => document.querySelector<HTMLInputElement>(sel)

  const pick = (cands: string[]) => {
    for (const sel of cands) {
      const el = q(sel)
      if (el && el.value) return el.value
    }
    return ""
  }

  const name = pick([
    'input[name="name"]',
    'input[id="name"]',
    'input[placeholder*="nome" i]',
  ])
  const email = pick([
    'input[name="email"]',
    'input[id="email"]',
    'input[type="email"]',
    'input[placeholder*="mail" i]',
    'input[placeholder*="e-mail" i]',
  ])
  const password = pick([
    'input[name="password"]',
    'input[id="password"]',
    'input[type="password"]',
    'input[placeholder*="senha" i]',
  ])
  const phone = pick([
    'input[name="phone"]',
    'input[id="phone"]',
    'input[type="tel"]',
    'input[placeholder*="fone" i]',
    'input[placeholder*="telefone" i]',
  ])
  const block = pick([
    'input[name="block"]',
    'input[id="block"]',
    'input[placeholder*="bloco" i]',
  ])
  const apartment = pick([
    'input[name="apartment"]',
    'input[id="apartment"]',
    'input[placeholder*="ap" i]',
    'input[placeholder*="apart" i]',
  ])

  return { name, email, password, phone, block, apartment }
}

async function sendRegister() {
  const data = readInputValue()
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, tipo: "morador" }),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok) throw new Error(payload?.error || "Erro ao cadastrar")
  return payload
}

export default function RegisterWire() {
  useEffect(() => {
    // 1) Intercepta envio do primeiro form da página
    const form = document.querySelector("form")
    const onSubmit = async (e: Event) => {
      try {
        e.preventDefault()
        await sendRegister()
        // segue seu fluxo normal (ex.: navegação já existente)
      } catch (err: any) {
        console.error(err)
        alert(err.message)
      }
    }
    form?.addEventListener("submit", onSubmit)

    // 2) Também intercepta clique no botão com texto "Cadastrar"
    const btn = Array.from(
      document.querySelectorAll<HTMLElement>('button, [role="button"], input[type="button"], input[type="submit"]')
    ).find((b) => (b.textContent || "").trim().toLowerCase() === "cadastrar")
    const onClick = async (e: Event) => {
      try {
        // não prevenho o default aqui para não quebrar seu fluxo visual
        await sendRegister()
      } catch (err: any) {
        console.error(err)
        alert(err.message)
      }
    }
    btn?.addEventListener("click", onClick)

    return () => {
      form?.removeEventListener("submit", onSubmit)
      btn?.removeEventListener("click", onClick)
    }
  }, [])

  return null
}