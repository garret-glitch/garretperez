import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Garret Perez',
  description: 'Get in touch.',
};

export default function Contact() {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold text-gray-900">Contact</h1>
      <p className="mt-3 text-gray-600">
        I&apos;m always open to interesting conversations, collaborations, or just a hello.
      </p>
      <div className="mt-8 space-y-4">
        <a
          href="mailto:your@email.com"
          className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors group"
        >
          <span className="text-2xl">✉️</span>
          <div>
            <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
              Email
            </div>
            <div className="text-sm text-gray-500">your@email.com</div>
          </div>
        </a>
        <a
          href="https://github.com/yourusername"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors group"
        >
          <span className="text-2xl">💻</span>
          <div>
            <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
              GitHub
            </div>
            <div className="text-sm text-gray-500">@yourusername</div>
          </div>
        </a>
        <a
          href="https://linkedin.com/in/yourusername"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors group"
        >
          <span className="text-2xl">💼</span>
          <div>
            <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
              LinkedIn
            </div>
            <div className="text-sm text-gray-500">yourusername</div>
          </div>
        </a>
      </div>
    </div>
  );
}
