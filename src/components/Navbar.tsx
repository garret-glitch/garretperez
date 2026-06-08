import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex h-14 items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
          Garret Perez
        </Link>
        <div className="flex gap-6 text-sm text-gray-600">
          <Link href="/projects" className="hover:text-indigo-600 transition-colors">Projects</Link>
          <Link href="/blog" className="hover:text-indigo-600 transition-colors">Blog</Link>
          <Link href="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
        </div>
      </div>
    </nav>
  );
}
