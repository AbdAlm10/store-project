"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
import {
  resendSignupOtpAction,
  verifySignupOtpAction,
} from "@/features/auth/actions";
import { useI18n } from "@/i18n/provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function VerifyEmailForm({
  initialEmail,
  justSent,
}: {
  initialEmail: string;
  justSent: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(justSent ? 60 : 0);
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        startTransition(async () => {
          const result = await verifySignupOtpAction({ email, token });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push("/onboarding");
          router.refresh();
        });
      }}
    >
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="text-left"
        />
      </div>
      <div>
        <Label htmlFor="token">{t("verifyCode")}</Label>
        <Input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          required
          maxLength={6}
          pattern="[0-9]{6}"
          value={token}
          onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="text-center text-2xl tracking-[0.4em]"
          aria-describedby="verify-hint"
        />
        <p id="verify-hint" className="mt-1.5 text-sm text-[var(--muted)]">
          {t("verifyBody")}
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-brand-800" role="status">
          {notice}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending || token.length !== 6}>
        {pending ? t("verifyChecking") : t("verifySubmit")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={seconds > 0 || resending}
        onClick={() => {
          setError(null);
          setNotice(null);
          startResend(async () => {
            const result = await resendSignupOtpAction({ email });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSeconds(60);
            setNotice(t("verifySent"));
          });
        }}
      >
        {seconds > 0 ? t("verifyResendIn", { seconds }) : t("verifyResend")}
      </Button>
    </form>
  );
}
