import Image from "next/image";

export default function PreCadastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="FisioTrainer"
            width={523}
            height={342}
            className="h-auto w-40"
            priority
          />
        </div>
        {children}
      </main>
    </div>
  );
}
