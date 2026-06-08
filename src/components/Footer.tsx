export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-200 mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-gray-500">
        © {year} Garret Perez. All rights reserved.
      </div>
    </footer>
  );
}
