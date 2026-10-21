import { Info } from 'lucide-react'
export default function Tooltip({ text }: { text: string }) {
  return <span className="tooltip-wrap" tabIndex={0} aria-label={text}>
    <Info size={14} aria-hidden="true" />
    <span className="tooltip-pop" role="tooltip">{text}</span>
  </span>
}
