import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "API Elabore | Labor Rural",
  description: "Acesse o sistema Elabore - Labor Rural",
  icons: {
    icon: [
      { url: "/img/lr.png", type: "image/png" },
      { url: "/lr.png", type: "image/png" },
    ],
    shortcut: "/img/lr.png",
    apple: "/img/lr.png",
  },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#002f2b] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
