import { LEGEND_ROWS, markerHtml } from "./icon-utils";

/**
 * MapLegend (RA7) - a compact legend rendered alongside the map so users know
 * which icons mean what. Uses the same markerHtml renderer as the map itself.
 */
export function MapLegend() {
  return (
    <details className="rounded-2xl border border-sky-200 bg-white shadow-card open:shadow-pop">
      <summary className="cursor-pointer list-none px-3 py-2 text-caption font-semibold text-ink-strong flex items-center gap-2">
        <span aria-hidden>Legend</span>
        <span className="text-ink-soft font-normal">(tap to expand)</span>
      </summary>
      <ul className="grid grid-cols-2 gap-2 px-3 pb-3">
        {LEGEND_ROWS.map((row) => (
          <li key={row.kind} className="flex items-center gap-2">
            <span
              className="inline-flex shrink-0"
              dangerouslySetInnerHTML={{ __html: markerHtml(row.kind, { size: 24 }) }}
            />
            <span className="text-caption text-ink-strong">{row.label}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
