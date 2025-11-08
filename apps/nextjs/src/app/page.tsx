export default function HomePage() {
  return (
    <main className="container h-screen py-16">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Create <span className="text-primary">T3</span> Turbo
        </h1>
        <p className="text-muted-foreground text-center text-2xl">
          A clean Next.js starter with TypeScript, Tailwind CSS, and more.
        </p>
      </div>
    </main>
  );
}
