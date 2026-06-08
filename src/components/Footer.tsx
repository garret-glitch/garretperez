export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-[#5c3d1e] bg-[#2b1c0e] mt-2">
      <div className="max-w-[1100px] mx-auto px-4 py-3 text-center text-[7px] text-[#c5a882]">
        © {year} Garret Perez · Garret&apos;s World · Free for all adventurers
      </div>
    </footer>
  )
}
