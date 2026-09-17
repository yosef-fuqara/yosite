import "../styles/text-rollover.css";

function TextRolloverChar({ char, index }) {
  const display = char === " " ? "\u00A0" : char;

  return (
    <span className={`text-roll__char${char === " " ? " is-space" : ""}`}>
      <span className="text-roll__stack" style={{ "--roll-i": index }}>
        <span className="text-roll__glyph">{display}</span>
        <span className="text-roll__glyph" aria-hidden="true">
          {display}
        </span>
      </span>
    </span>
  );
}

export function TextRolloverLabel({ label, className = "" }) {
  return (
    <span
      className={`text-roll__label${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {label.split("").map((ch, i) => (
        <TextRolloverChar key={`${label}-${i}`} char={ch} index={i} />
      ))}
    </span>
  );
}

export default function TextRollover({
  label,
  className = "",
  labelClassName = "",
  ...props
}) {
  return (
    <a
      className={`text-roll${className ? ` ${className}` : ""}`}
      aria-label={label}
      {...props}
    >
      <TextRolloverLabel label={label} className={labelClassName} />
    </a>
  );
}
