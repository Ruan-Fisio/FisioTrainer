import type { ReactNode } from "react";
import Image from "next/image";

export default function PortalPacienteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh justify-center overflow-hidden bg-muted/40 px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 45%), radial-gradient(circle at 85% 100%, color-mix(in oklch, var(--sidebar-primary) 8%, transparent), transparent 45%)",
        }}
      />
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="FisioTrainer"
            width={523}
            height={342}
            className="h-auto w-[160px] object-contain"
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}
