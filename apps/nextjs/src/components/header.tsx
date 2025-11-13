import HeaderAuth from "./header-auth";

function Header() {
  return (
    <header className="flex h-12 w-screen items-center justify-between border-b px-4 py-2">
      <h1>Leopard IDE</h1>
      <HeaderAuth />
    </header>
  );
}

export default Header;
