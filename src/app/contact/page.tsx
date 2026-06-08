import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Contact | Garret's World",
  description: 'Get in touch with Garret.',
}

export default function Contact() {
  return (
    <div className="space-y-4">
      <div className="osrs-panel">
        <h1 className="text-[14px] text-[#3c2a1e] font-bold">📬 Contact</h1>
        <p className="text-[8px] text-[#5c3d1e] mt-1">
          Open to conversations, collaborations, or just a hello.
        </p>
      </div>
      <div className="space-y-3">
        <a href="tel:3466041635" className="osrs-panel-dark block hover:bg-[#3d2a18] transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📞</span>
            <div>
              <div className="text-[9px] text-[#ff981f]">Phone</div>
              <div className="text-[8px] text-[#ffe066]">346-604-1635</div>
            </div>
          </div>
        </a>
        <a
          href="mailto:gis.owner@gmail.com"
          className="osrs-panel-dark block hover:bg-[#3d2a18] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">✉️</span>
            <div>
              <div className="text-[9px] text-[#ff981f]">Email</div>
              <div className="text-[8px] text-[#ffe066]">gis.owner@gmail.com</div>
            </div>
          </div>
        </a>
        <a
          href="https://github.com/garret-glitch"
          target="_blank"
          rel="noopener noreferrer"
          className="osrs-panel-dark block hover:bg-[#3d2a18] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💻</span>
            <div>
              <div className="text-[9px] text-[#ff981f]">GitHub</div>
              <div className="text-[8px] text-[#ffe066]">@garret-glitch</div>
            </div>
          </div>
        </a>
      </div>
    </div>
  )
}
