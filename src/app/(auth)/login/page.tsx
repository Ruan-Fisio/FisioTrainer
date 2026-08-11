import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Image
            src="/logo.png"
            alt="FisioTrainer"
            width={160}
            height={160}
            className="size-40 rounded-2xl object-contain"
            priority
          />
          <h1 className="text-2xl font-semibold">FisioTrainer</h1>
          <p className="text-sm text-muted-foreground">
            Entre com sua conta para continuar
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
