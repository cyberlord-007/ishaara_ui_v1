"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
} from "firebase/auth";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAnnounce } from "@/lib/a11y/useAnnounce";
import { useDocumentTitle } from "@/lib/a11y/useDocumentTitle";
import { useFocusOnMount } from "@/lib/a11y/useFocusOnMount";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";

const EMAIL_LINK_STORAGE_KEY = "ishaara-email-for-sign-in";

const EmailFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});
type EmailForm = z.infer<typeof EmailFormSchema>;

function SignInLoadingFallback() {
  const t = useTranslations("signIn");
  return (
    <output className="block px-8 py-16 text-center text-ink-muted">
      {t("completing")}
    </output>
  );
}

function SignInPageInner() {
  const t = useTranslations("signIn");
  useDocumentTitle(t("title"));
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const announce = useAnnounce();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [emailSent, setEmailSent] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isCompletingEmailLink, setIsCompletingEmailLink] = useState(false);
  const hasCheckedEmailLink = useRef(false);

  const nextPath = searchParams.get("next") ?? "/";

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailForm>({
    resolver: zodResolver(EmailFormSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (user) {
      router.replace(nextPath as Route);
    }
  }, [user, nextPath, router]);

  useEffect(() => {
    if (
      hasCheckedEmailLink.current ||
      !isSignInWithEmailLink(auth, window.location.href)
    ) {
      return;
    }
    hasCheckedEmailLink.current = true;
    const storedEmail = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
    if (!storedEmail) {
      setCompletionError(t("completeFailed"));
      return;
    }
    setIsCompletingEmailLink(true);
    signInWithEmailLink(auth, storedEmail, window.location.href)
      .then(() => window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY))
      .catch(() => setCompletionError(t("completeFailed")))
      .finally(() => setIsCompletingEmailLink(false));
  }, [t]);

  async function handleGoogleSignIn() {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      announce(t("genericError"), "assertive");
    }
  }

  async function handleEmailLink({ email }: EmailForm) {
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: `${window.location.origin}/sign-in`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email);
      setEmailSent(true);
      announce(t("emailSent"), "polite");
    } catch {
      announce(t("genericError"), "assertive");
    }
  }

  if (isCompletingEmailLink) {
    return (
      <output className="block px-8 py-16 text-center text-ink-muted">
        {t("completing")}
      </output>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-8 py-16">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="route-heading m-0 text-title font-bold"
      >
        {t("title")}
      </h1>

      {completionError ? (
        <p role="alert" className="m-0 text-base text-danger">
          {completionError}
        </p>
      ) : null}

      <Button onPress={() => void handleGoogleSignIn()}>
        {t("continueWithGoogle")}
      </Button>

      {emailSent ? (
        <output className="m-0 block text-ink-muted">{t("emailSent")}</output>
      ) : (
        <form
          onSubmit={handleSubmit(handleEmailLink)}
          className="flex flex-col gap-4 border-t border-ink/20 pt-8"
        >
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label={t("emailLabel")}
                type="email"
                autoComplete="email"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                isInvalid={Boolean(errors.email)}
                errorMessage={errors.email?.message}
              />
            )}
          />
          <Button type="submit" variant="secondary">
            {t("sendEmailLink")}
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * `/sign-in?next=`. Starts Google or email-link sign-in, and — when the
 * user returns here from the emailed link — completes it with
 * `signInWithEmailLink`. `useSearchParams` needs a Suspense boundary to
 * prerender under static export.
 */
export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoadingFallback />}>
      <SignInPageInner />
    </Suspense>
  );
}
