export default function BrandMark({ className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4.5 5.25 12 19l7.5-13.75" />
      <circle cx="18.75" cy="5.25" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
