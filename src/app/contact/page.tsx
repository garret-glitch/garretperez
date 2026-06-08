import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Contact | Garret's World",
  description: 'Get in touch with Garret.',
}

export default function Contact() {
  return (
    <div className="space-y-4">
      <div className="osrs-panel rounded-xl">
        <h1 className="text-[14px] text-[#1a1a1a] font-bold">📬 Contact</h1>
        <p className="text-[8px] text-[#3d3d3d] mt-1">
          Open to conversations, collaborations, or just a hello.
        </p>
      </div>
      <div className="space-y-3">
        <a href="tel:3466041635" className="osrs-panel-dark rounded-xl block hover:bg-[#282828] transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📞</span>
            <div>
              <div className="text-[9px] text-[#c0c0c0]">Phone</div>
              <div className="text-[8px] text-[#d8d8d8]">346-604-1635</div>
            </div>
          </div>
        </a>
        <a
          href="mailto:gis.owner@gmail.com"
          className="osrs-panel-dark rounded-xl block hover:bg-[#282828] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">✉️</span>
            <div>
              <div className="text-[9px] text-[#c0c0c0]">Email</div>
              <div className="text-[8px] text-[#d8d8d8]">gis.owner@gmail.com</div>
            </div>
          </div>
        </a>
        <a
          href="https://github.com/garret-glitch"
          target="_blank"
          rel="noopener noreferrer"
          className="osrs-panel-dark rounded-xl block hover:bg-[#282828] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💻</span>
            <div>
              <div className="text-[9px] text-[#c0c0c0]">GitHub</div>
              <div className="text-[8px] text-[#d8d8d8]">@garret-glitch</div>
            </div>
          </div>
        </a>
        <Link
          href="https://www.linkedin.com/in/garretperez"
          target="_blank"
          rel="noopener noreferrer"
          className="osrs-panel-dark rounded-xl block hover:bg-[#282828] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔗</span>
            <div>
              <div className="text-[9px] text-[#c0c0c0]">LinkedIn</div>
              <div className="text-[8px] text-[#d8d8d8]">linkedin.com/in/garretperez</div>
            </div>
          </div>
        </Link>
        <Link
          href="/resume.pdf"
          target="_blank"
          className="osrs-panel-dark rounded-xl block hover:bg-[#282828] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📄</span>
            <div>
              <div className="text-[9px] text-[#c0c0c0]">Resume</div>
              <div className="text-[8px] text-[#d8d8d8]">Download PDF</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
