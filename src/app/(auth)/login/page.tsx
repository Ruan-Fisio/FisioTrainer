import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background p-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 55%), radial-gradient(circle at 80% 85%, color-mix(in oklch, var(--sidebar-primary) 16%, transparent), transparent 55%)",
        }}
      />

      <div className="w-full max-w-sm -translate-y-12">
        <div className="mb-4 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="FisioTrainer"
            width={523}
            height={342}
            className="h-auto w-[170px] -translate-y-8 object-contain drop-shadow-lg"
            priority
          />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
