import Link from 'next/link'

export default function ContactHeader() {
  return (
    <div className="bg-[#141414] border-b-2 border-[#424242] px-4 py-3">
      <div className="max-w-[1100px] mx-auto flex items-center gap-4">
        {/* Headshot */}
        <div className="shrink-0 w-16 h-16 rounded-lg border-2 border-[#6a6a6a] bg-[#2c2c2c] flex items-center justify-center overflow-hidden">
          <span className="text-[10px] text-[#a0a0a0] font-bold leading-none text-center">GP</span>
        </div>

        {/* Name + contact */}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-[#e0e0e0] font-bold leading-tight mb-1">Garret Perez</div>
          <div className="text-[7px] text-[#909090] mb-1.5">GIS Developer · Houston, TX</div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span className="text-[7px] text-[#b0b0b0]">☎ 346-604-1635</span>
            <span className="text-[7px] text-[#b0b0b0]">✉ gis.owner@gmail.com</span>
          </div>
        </div>

        {/* Links */}
        <div className="shrink-0 flex flex-col gap-1.5 items-end">
          <Link
            href="https://www.linkedin.com/in/garretperez"
            target="_blank"
            rel="noopener noreferrer"
            className="osrs-btn text-[7px] py-1 px-2 whitespace-nowrap"
          >
            🔗 LinkedIn
          </Link>
          <Link
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="osrs-btn text-[7px] py-1 px-2 whitespace-nowrap"
          >
            📄 Resume
          </Link>
        </div>
      </div>
    </div>
  )
}
