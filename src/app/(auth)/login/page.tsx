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
            width={340}
            height={340}
            className="size-[340px] object-contain"
            priority
          />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
