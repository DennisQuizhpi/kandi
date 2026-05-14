"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./TransitionsShowcase.module.css";

function parseDurationMs(variableName: string, fallbackMs: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  if (raw.endsWith("ms")) {
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallbackMs;
  }
  if (raw.endsWith("s")) {
    const parsed = parseFloat(raw) * 1000;
    return Number.isFinite(parsed) ? parsed : fallbackMs;
  }
  return fallbackMs;
}

export function TransitionsShowcase() {
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [textSwap, setTextSwap] = useState("Processing...");
  const [textSwapExit, setTextSwapExit] = useState(false);
  const [textSwapEnterStart, setTextSwapEnterStart] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownClosing, setDropdownClosing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [page, setPage] = useState<"1" | "2">("1");
  const [iconState, setIconState] = useState<"a" | "b">("a");
  const [digitText, setDigitText] = useState("12.3");
  const [digitAnimating, setDigitAnimating] = useState(true);
  const dropdownTimerRef = useRef<number | null>(null);

  const digits = useMemo(() => digitText.split(""), [digitText]);

  const triggerTextSwap = () => {
    const dur = parseDurationMs("--text-swap-dur", 200);
    setTextSwapExit(true);
    window.setTimeout(() => {
      setTextSwap((prev) => (prev === "Processing..." ? "Done" : "Processing..."));
      setTextSwapExit(false);
      setTextSwapEnterStart(true);
      requestAnimationFrame(() => setTextSwapEnterStart(false));
    }, dur);
  };

  const triggerDigits = () => {
    const next = `${Math.floor(Math.random() * 90) + 10}.${Math.floor(Math.random() * 10)}`;
    setDigitAnimating(false);
    setDigitText(next);
    requestAnimationFrame(() => setDigitAnimating(true));
  };

  const openDropdown = () => {
    if (dropdownTimerRef.current != null) {
      window.clearTimeout(dropdownTimerRef.current);
      dropdownTimerRef.current = null;
    }
    setDropdownClosing(false);
    setDropdownOpen(true);
  };

  const closeDropdown = () => {
    const closeMs = parseDurationMs("--dropdown-close-dur", 150);
    setDropdownOpen(false);
    setDropdownClosing(true);
    dropdownTimerRef.current = window.setTimeout(() => {
      setDropdownClosing(false);
      dropdownTimerRef.current = null;
    }, closeMs);
  };

  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  useEffect(() => {
    return () => {
      if (dropdownTimerRef.current != null) {
        window.clearTimeout(dropdownTimerRef.current);
        dropdownTimerRef.current = null;
      }
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <section className={styles.hero}>
          <h1 className="k-type-display">Transitions.dev Showcase</h1>
          <p className="k-type-body text-[var(--text-muted)]">All 9 transitions wired with the exact `t-*` selectors.</p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2 className="k-type-title">01 Card resize</h2>
            <div className={`t-resize ${styles.resizeBox} ${isResizeOpen ? styles.resizeBoxOpen : ""}`} />
            <div className={styles.actions}>
              <button className={styles.button} onClick={() => setIsResizeOpen((v) => !v)} type="button">
                Toggle size
              </button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className="k-type-title">02 Number pop-in</h2>
            <p className={`k-type-display t-digit-group ${digitAnimating ? "is-animating" : ""}`}>
              {digits.map((ch, index) => {
                const stagger = index === digits.length - 2 ? "1" : index === digits.length - 1 ? "2" : undefined;
                return (
                  <span key={`${ch}-${index}-${digitText}`} className="t-digit" data-stagger={stagger}>
                    {ch}
                  </span>
                );
              })}
            </p>
            <div className={styles.actions}>
              <button className={styles.button} onClick={triggerDigits} type="button">
                Update number
              </button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className="k-type-title">03 Notification badge</h2>
            <button className={styles.demoTrigger} type="button">
              Notifications
              <span className="t-badge" data-open={badgeOpen ? "true" : "false"}>
                <span className={`t-badge-dot ${styles.badgeDotVisual}`}>1</span>
              </span>
            </button>
            <div className={styles.actions}>
              <button className={styles.button} onClick={() => setBadgeOpen((v) => !v)} type="button">
                Toggle badge
              </button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className="k-type-title">04 Text states swap</h2>
            <p className={`k-type-headline t-text-swap${textSwapExit ? " is-exit" : ""}${textSwapEnterStart ? " is-enter-start" : ""}`}>
              {textSwap}
            </p>
            <div className={styles.actions}>
              <button className={styles.button} onClick={triggerTextSwap} type="button">
                Swap text
              </button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className="k-type-title">05 Menu dropdown</h2>
            <div className={styles.dropdownShell}>
              <button className={styles.button} onClick={dropdownOpen ? closeDropdown : openDropdown} type="button">
                Toggle dropdown
              </button>
              <div
                className={`t-dropdown ${styles.dropdownDemo}${dropdownOpen ? " is-open" : ""}${dropdownClosing ? " is-closing" : ""}`}
                data-origin="top-left"
              >
                <p className="k-type-body">Edit</p>
                <p className="k-type-body">Duplicate</p>
                <p className="k-type-body">Delete</p>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className="k-type-title">06 Modal open / close</h2>
            <div className={styles.actions}>
              <button className={styles.button} onClick={openModal} type="button">
                Open modal
              </button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className="k-type-title">07 Panel reveal</h2>
            <div className={styles.panelShell}>
              <div className="t-panel-slide" data-open={panelOpen ? "true" : "false"}>
                <div className={styles.panelContent}>
                  <p className="k-type-body">Panel content is now visible.</p>
                </div>
              </div>
            </div>
            <div className={styles.actions}>
              <button className={styles.button} onClick={() => setPanelOpen((v) => !v)} type="button">
                Toggle panel
              </button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className="k-type-title">08 Page side-by-side</h2>
            <div className={`${styles.pageShell} t-page-slide`} data-page={page}>
              <section className={`t-page ${styles.pagePane}`} data-page-id="1">
                <p className="k-type-body">Page 1: list view</p>
              </section>
              <section className={`t-page ${styles.pagePane}`} data-page-id="2">
                <p className="k-type-body">Page 2: detail view</p>
              </section>
            </div>
            <div className={styles.actions}>
              <button className={styles.button} onClick={() => setPage("1")} type="button">
                Show page 1
              </button>
              <button className={styles.button} onClick={() => setPage("2")} type="button">
                Show page 2
              </button>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className="k-type-title">09 Icon swap</h2>
            <div className="t-icon-swap" data-state={iconState}>
              <span className="t-icon" data-icon="a" aria-hidden>
                ☀
              </span>
              <span className="t-icon" data-icon="b" aria-hidden>
                ☾
              </span>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.button}
                onClick={() => setIconState((v) => (v === "a" ? "b" : "a"))}
                type="button"
              >
                Swap icon
              </button>
            </div>
          </article>
        </section>
      </div>

      <AnimatePresence>
        {modalOpen ? (
          <motion.div
            className={styles.modalOverlay}
            onMouseDown={closeModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className={styles.modalCard}
              role="dialog"
              aria-modal="true"
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="k-type-title">Modal demo</h2>
              <p className="k-type-body text-[var(--text-muted)]">Modal animation uses Framer Motion.</p>
              <div className={styles.actions}>
                <button className={styles.button} onClick={closeModal} type="button">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
