"use client";
export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white overflow-x-hidden overflow-y-auto overscroll-contain relative">
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-amber-600/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-orange-600/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute top-1/3 right-1/3 w-36 h-36 sm:w-56 sm:h-56 md:w-72 md:h-72 bg-yellow-600/10 rounded-full blur-3xl animate-blob animation-delay-4000" />

      {/* GitHub Link */}
      <a
        href="https://github.com/Beanie-Brick-Band/leopard"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-600 rounded-lg transition-all duration-300 backdrop-blur-sm group"
      >
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400 group-hover:text-white transition-colors"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
        </svg>
        <span className="text-sm sm:text-base text-zinc-300 group-hover:text-white transition-colors hidden sm:inline">
          GitHub
        </span>
      </a>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(150px, -100px) scale(1.3);
          }
          66% {
            transform: translate(-100px, 150px) scale(0.8);
          }
        }
        .animate-blob {
          animation: blob 10s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 min-h-screen flex flex-col justify-between relative z-10 pt-20 sm:pt-24">
        {/* Hero Section - Asymmetric Layout */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center flex-1 my-auto">
          {/* Left side - Logo and Title */}
          <div className="flex flex-col gap-3 sm:gap-4 lg:pl-12">
            <div className="flex items-center gap-3 sm:gap-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="80"
                height="80"
                viewBox="0 0 64 64"
                className="transform -rotate-12 hover:rotate-0 transition-transform duration-500 sm:w-[100px] sm:h-[100px] lg:w-[120px] lg:h-[120px]"
              >
                <path fill="#e5bc5e" d="m45.1 7l6.1 6.9C61 13.7 56.9 2 56.9 2c-3.3 0-11.8 1.2-11.8 5"/>
                <path fill="#77623c" d="m48.8 7.8l3.2 3.7c5.2-.1 3.1-6.4 3.1-6.4c-1.8 0-6.3.6-6.3 2.7"/>
                <path fill="#e5bc5e" d="m29.6 7l-6.1 6.9C13.7 13.7 17.8 2 17.8 2c3.3 0 11.8 1.2 11.8 5"/>
                <path fill="#77623c" d="m25.9 7.8l-3.2 3.7c-5.2-.1-3.1-6.4-3.1-6.4c1.8 0 6.3.6 6.3 2.7"/>
                <path fill="#e5bc5e" d="M37.3 4.3c-12.9 0-20.2 4.2-20.2 31h40.5c0-26.8-7.4-31-20.3-31"/>
                <path fill="#c49a45" d="M54.9 38.2H19.7s-2.2 2.1-2.2 6.6c-3.4-.1-6.9-2.1-7.3-5.8c-.4-3.9 2.1-7.3 3.6-10.7c1.7-4 2.4-8 1.1-12.2c-.5-1.6-1.1-3.8-2.9-4.3c-2.2-.6-4.3 1.4-3.7 3.6c.5 1.9 1.8 3.3 1.9 5.3c.2 2.3-.6 4.7-1.5 6.8c-1.6 4.1-3.5 8.2-2.4 12.7c1 4.2 4.6 7.9 11.5 7.6c0 0 .8 3.2 1.9 4.9c3 4.5 32.4 5.3 35.2 0c2.8-5.2 0-14.5 0-14.5"/>
                <path fill="#e5bc5e" d="M23.9 37.1s-.9 19.4 2.9 23.3c2 2.1 8.6 2.2 10.5 0c1.9 2.2 8.5 2 10.5 0c3.6-3.8 2.9-23.3 2.9-23.3z"/>
                <path fill="#bc9342" d="m42.2 54.3l2.9.7l.2-3.5l-2.9.6z"/>
                <path fill="#a37e3d" d="m51.9 50.3l1.9.4l.1-2.4l-2 .5zm-32.3-4.8l.7 2.1l2.3-1.3l-1.5-1.6zm-8.9-29.7l.7 2.1l2.3-1.3l-1.5-1.6zM7.2 37.3l.5 1.4l1.5-.8l-1-1.1zm5.9 8.1l.4 1.4l1.5-.9l-1-1z"/>
                <path fill="#bc9342" d="m31.6 55.5l1.8-1.2l-1.8-1.9l-1.2 1.9zM46.2 48l1.9-1.2l-1.9-1.9l-1.1 1.9zm-17-2.2l-2.5 1.6l2.5 2.6l1.5-2.6z"/>
                <path fill="#3e4347" d="M37.3 60.5c-.7-2.5-.7-12.4 0-14.9c.7 2.5.7 12.4 0 14.9"/>
                <path fill="#77623c" d="m53.7 28.7l1.2-.8l-1.2-1.3l-.8 1.3zm-33.8.1l1.2-.8l-1.2-1.3l-.8 1.3zM28.4 12l1.9-1.2l-1.9-1.9l-1.1 1.9zm11.5 4.5l1.9-1.3l-1.9-1.9l-1.1 1.9zm8.9-4.5l1.8-1.2l-1.8-1.9l-1.2 1.9zm-13.4 8.1l1.3-.8l-1.3-1.3l-.7 1.3z"/>
                <path fill="#ffe8bb" d="M57.3 27.7s-2.5 3.7-12.5 6.6c-2.7-4.4-12.2-4.4-14.9 0c-10-2.9-12.5-6.6-12.5-6.6s-1.3 6.7-.3 9.1c1.5 3.7 10.2 6.1 13.3 6.8c2.6 2.8 11.4 2.8 14.1 0c3.1-.7 11.8-3 13.3-6.8c.8-2.4-.5-9.1-.5-9.1"/>
                <path fill="#77623c" d="m21.8 36.7l1.2-.8l-1.2-1.2l-.8 1.2zm34.3-.5l.9-2.1l-2.6-.7v2.3zM36.8 9.5l.6-1.3l-1.7-.5v1.5zm-12.7 4.2l.7-1.4l-1.8-.5v1.6zm25.2 20.1l1.9-1.2l-1.9-1.9l-1.1 1.9zM31.7 23.5l1.6 5.3l-4.5-2.8zm11.2 0l-1.6 5.3l4.6-2.8z"/>
                <path fill="#ffe8bb" d="M32.1 22.1C30.6 31.3 20 29 20 20.9c0-4.3 0-4.3 6.6-5.8c6.8-1.4 6 3.5 5.5 7"/>
                <path fill="#3e4347" d="M31 22.5c-.6 6.5-10.3 5.5-9.7-1c.2-2.5.3-2.8 5.1-2.2c4.8.5 4.8.7 4.6 3.2"/>
                <path fill="#fff" d="M27.1 19.8c.5.3.8.7.8 1.3c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5c0-.7.4-1.2 1.1-1.4c-2.7-.3-2.8-.1-2.9 1.5c-.3 3.7 6.1 4.4 6.4.7c.1-1.6.1-1.8-2.4-2.1"/>
                <path fill="#ffe8bb" d="M42.6 22.1c1.5 9.2 12.1 6.9 12.1-1.2c0-4.3 0-4.3-6.6-5.8c-6.8-1.4-6.1 3.5-5.5 7"/>
                <path fill="#3e4347" d="M43.7 22.5c.6 6.5 10.3 5.5 9.7-1c-.2-2.5-.3-2.8-5.1-2.2c-4.9.5-4.9.7-4.6 3.2"/>
                <path fill="#fff" d="M49.2 19.6c.5.3.8.7.8 1.3c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5c0-.5.2-.9.5-1.1c-2.5.3-2.5.5-2.3 2.1c.3 3.7 6.8 3 6.4-.7c-.1-1.5-.1-1.8-2.4-1.6"/>
                <path fill="#a37e3d" d="m12.2 24.3l-1.8 1.8l1.8 1.9l1.8-1.9z"/>
                <path fill="#3e4347" d="M43.3 38.7c-.4-.9-2.5.5-5.5.6V34h-1v5.4c-2.8-.2-5-1.6-5.5-.6s2.7 2.4 6 2.4s6.5-1.4 6-2.5"/>
                <path fill="#f15a61" d="M43.1 31.7c-2.3-1-9.5-1-11.6 0c-.8.4 1.5 2.8 5.8 2.8s6.7-2.4 5.8-2.8"/>
              </svg>
              <div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent font-heading">
                  Leopard
                </h1>
                <div className="h-0.5 sm:h-1 w-20 sm:w-32 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full mt-1 sm:mt-2" />
              </div>
            </div>

            <p className="text-lg sm:text-xl md:text-2xl text-amber-500/90 font-light italic">
              Authentic Code, Verified Learning
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full w-fit">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-xs sm:text-sm text-amber-500/90 font-medium tracking-wide">
                COMING SOON
              </span>
            </div>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl">
              A web-based platform designed for post-secondary institutions to ensure
              academic integrity in coding assignments. Leopard provides students with
              a modern IDE while capturing granular version history to verify the
              authenticity of their work.
            </p>
          </div>

          {/* Right side - Staggered Feature Cards */}
          <div className="flex flex-col gap-4 sm:gap-6 lg:pr-12">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-amber-900/30 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:border-amber-600/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-900/20">
              <div className="text-amber-500 text-3xl sm:text-4xl mb-3 sm:mb-4">&lt;/&gt;</div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent font-heading">
                Web-Based IDE
              </h3>
              <p className="text-sm sm:text-base text-zinc-400">
                Complete assignments in a familiar code environment with syntax
                highlighting, code execution, and real-time feedback.
              </p>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-orange-900/30 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:border-orange-600/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-900/20 lg:ml-12">
              <div className="text-orange-500 text-3xl sm:text-4xl mb-3 sm:mb-4">⟲</div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent font-heading">
                Version Tracking
              </h3>
              <p className="text-sm sm:text-base text-zinc-400">
                Granular version history captures every keystroke, enabling
                instructors to replay student work and verify authenticity.
              </p>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-red-900/30 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:border-red-600/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-900/20 lg:ml-6">
              <div className="text-red-500 text-3xl sm:text-4xl mb-3 sm:mb-4">▶</div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent font-heading">
                Replay Viewer
              </h3>
              <p className="text-sm sm:text-base text-zinc-400">
                Instructors can watch a complete replay of student coding sessions,
                reviewing their development process from start to finish.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="text-center mt-4 sm:mt-6 pb-4 sm:pb-6">
          <p className="text-zinc-500 text-xs sm:text-sm tracking-wide">
            Built for educators and students who value authentic learning
          </p>
        </div>
      </div>
    </main>
  );
}
