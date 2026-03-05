import NotePad from "@/components/notepad";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-900 flex-1">
      <NotePad value="" />
    </div>
  );
}
