import styles from "./Tabs.module.css";

/**
 * A horizontal tab strip.
 *
 * `role="tablist"` plus `aria-selected` is what tells assistive tech this is
 * one control with several states rather than a row of unrelated links.
 */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={[styles.tab, value === tab.value ? styles.on : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
