import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col justify-center text-center">
      <h1 className="mb-4 text-2xl font-bold">Leopard</h1>
      <p>
        Navigate to{" "}
        <Link href="/docs" className="font-medium underline">
          /docs
        </Link>{" "}
        to see the documentation.
      </p>
    </div>
  );
}
