export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-[#3d3d3d] bg-[#1a1a1a] mt-2">
      <div className="max-w-[1200px] mx-auto px-4 py-3 text-center text-[7px] text-[#888888]">
        © {year} Garret Perez · Garret&apos;s World · Free for all adventurers
      </div>
    </footer>
  )
}
