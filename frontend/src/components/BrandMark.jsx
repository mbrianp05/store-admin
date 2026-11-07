export default function BrandMark({ className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4 20.5c4.8-5.3 9.4-9.4 16-11" />
      <circle cx="8.4" cy="17.1" r="2.1" />
      <circle cx="14" cy="13.3" r="1.8" />
      <circle cx="20" cy="9.4" r="1.5" />
    </svg>
  )
}
