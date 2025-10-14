"use client"

import React, { useEffect, useRef, useState } from "react"

type PullToRefreshProps = {
	onRefresh: () => Promise<void> | void
	threshold?: number // distance in px to trigger refresh
	maxPull?: number // max visual pull distance
	topStartLimitPx?: number // only start gesture if touch starts within this many px from top
	denyBelowSelector?: string // if provided, do not start if touch begins at/after this element's top edge
	allowWithinSelector?: string // if provided, only start if touch begins within this element's bounding rect
	children: React.ReactNode
}

export default function PullToRefresh({ onRefresh, threshold = 64, maxPull = 120, topStartLimitPx = 99999, denyBelowSelector, allowWithinSelector, children }: PullToRefreshProps) {
	const wrapperRef = useRef<HTMLDivElement | null>(null)
	const startYRef = useRef<number>(0)
	const startXRef = useRef<number>(0)
	const pullingRef = useRef<boolean>(false)
		const atTopRef = useRef<boolean>(false)
	const [distance, setDistance] = useState(0)
	const [status, setStatus] = useState<"idle" | "pulling" | "ready" | "refreshing">("idle")

	useEffect(() => {
		const el = wrapperRef.current
		if (!el) return

		const getScrollTop = () => {
			return typeof window !== "undefined" ? window.scrollY || document.documentElement.scrollTop || 0 : 0
		}

						const onTouchStart = (e: TouchEvent) => {
			if (status === "refreshing") return
			// Only consider when at the very top
						if (getScrollTop() > 0) { atTopRef.current = false; return }
						atTopRef.current = true
			const t = e.touches[0]
			startYRef.current = t.clientY
			startXRef.current = t.clientX
							// If allowWithin is provided, require start to be inside that element rect
							if (allowWithinSelector) {
								try {
									const elAllow = document.querySelector(allowWithinSelector) as HTMLElement | null
									if (elAllow) {
										const r = elAllow.getBoundingClientRect()
										if (!(t.clientY >= r.top && t.clientY <= r.bottom && t.clientX >= r.left && t.clientX <= r.right)) {
											pullingRef.current = false
											setStatus("idle")
											setDistance(0)
											return
										}
									}
								} catch {}
							}
					// If a deny-below selector is provided, block when starting at/after that element's top
					if (denyBelowSelector) {
						try {
							const elBlock = document.querySelector(denyBelowSelector) as HTMLElement | null
							if (elBlock) {
								const rect = elBlock.getBoundingClientRect()
								// At top, clientY is comparable to rect.top
								if (t.clientY >= rect.top) {
									// Do not arm the pull-to-refresh
									pullingRef.current = false
									setStatus("idle")
									setDistance(0)
									return
								}
							}
						} catch {}
					}
			pullingRef.current = true
			setStatus("idle")
			setDistance(0)
		}

		const onTouchMove = (e: TouchEvent) => {
					if (!pullingRef.current || status === "refreshing") return
			const t = e.touches[0]
			const dy = t.clientY - startYRef.current
			const dx = t.clientX - startXRef.current
			// If horizontal dominates, cancel
			if (Math.abs(dx) > Math.abs(dy)) {
				pullingRef.current = false
				setDistance(0)
				setStatus("idle")
				return
			}
			// If we lost top (e.g. rubber band), cancel
					if (!atTopRef.current || getScrollTop() > 0) {
				pullingRef.current = false
				setDistance(0)
				setStatus("idle")
				return
			}
			if (dy <= 0) {
				pullingRef.current = false
				setDistance(0)
				setStatus("idle")
				return
			}
			// prevent native overscroll bounce while pulling after a small slop
			if (dy > 8) { try { e.preventDefault() } catch {} }
			const clamped = Math.max(0, Math.min(maxPull, dy))
			setDistance(clamped)
			setStatus(clamped >= threshold ? "ready" : "pulling")
		}

		const endPull = () => {
			pullingRef.current = false
			setDistance(0)
			setStatus("idle")
		}

			const onTouchEnd = async () => {
				if (status === "ready" && atTopRef.current && getScrollTop() <= 0) {
				setStatus("refreshing")
				try {
					await onRefresh()
				} finally {
					endPull()
				}
			} else {
				endPull()
			}
		}

		const opts: AddEventListenerOptions | boolean = { passive: false }
		el.addEventListener("touchstart", onTouchStart, opts)
		el.addEventListener("touchmove", onTouchMove, opts)
		el.addEventListener("touchend", onTouchEnd)
		el.addEventListener("touchcancel", onTouchEnd)

		return () => {
			el.removeEventListener("touchstart", onTouchStart as any)
			el.removeEventListener("touchmove", onTouchMove as any)
			el.removeEventListener("touchend", onTouchEnd as any)
			el.removeEventListener("touchcancel", onTouchEnd as any)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [onRefresh, threshold, maxPull, topStartLimitPx, denyBelowSelector, allowWithinSelector, status])

	return (
		<div ref={wrapperRef} style={{ position: "relative" }}>
			{/* Indicator */}
			<div
				aria-hidden="true"
				style={{
					position: "sticky",
					top: 0,
					zIndex: 1100,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: status === "refreshing" ? 48 : distance,
					transition: status === "refreshing" ? "height 160ms ease" : "height 80ms ease",
					paddingTop: "env(safe-area-inset-top, 0px)",
					color: "var(--muted-foreground)",
					background: distance > 0 || status === "refreshing" ? "rgba(255,255,255,0.9)" : "transparent",
					backdropFilter: distance > 0 || status === "refreshing" ? ("saturate(180%) blur(8px)" as any) : undefined,
					WebkitBackdropFilter: distance > 0 || status === "refreshing" ? ("saturate(180%) blur(8px)" as any) : undefined,
					borderBottom: distance > 0 || status === "refreshing" ? "1px solid rgba(2, 132, 199, 0.10)" : "none",
				}}
			>
				{status === "refreshing" ? (
					<Spinner label="Atualizando..." />
				) : status === "ready" ? (
					<div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
						<span style={{ transform: "rotate(0deg)", display: "inline-block" }}>⬇️</span>
						Solte para atualizar
					</div>
				) : status === "pulling" ? (
					<div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
						<span style={{ transform: "rotate(180deg)", display: "inline-block" }}>⬆️</span>
						Puxe para atualizar
					</div>
				) : null}
			</div>

			{children}
		</div>
	)
}

function Spinner({ label }: { label?: string }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
			<span
				aria-hidden
				style={{
					width: 16,
					height: 16,
					borderRadius: "50%",
					border: "2px solid rgba(59,130,246,0.25)",
					borderTopColor: "rgba(59,130,246,0.9)",
					animation: "ptr-spin 0.9s linear infinite",
					display: "inline-block",
				}}
			/>
			{label && <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>}
			<style jsx>{`
				@keyframes ptr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
			`}</style>
		</div>
	)
}

