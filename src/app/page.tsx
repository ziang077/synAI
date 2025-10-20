import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-8">
          Vision AI
        </h1>
        <div className="space-x-4">
          <Link 
            href="/uploader"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200"
          >
            Upload
          </Link>
          <Link
            href="/about"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200"
          >
            Go to About Page
          </Link>
          <Link
            href="/auth"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200"
          >
            Login
          </Link>
        </div>
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400">
            © 2025 Vision AI. Developed by Ziang Wang and Haron Osman.
          </p>
        </div>
      </div>
    </div>
  );
}

