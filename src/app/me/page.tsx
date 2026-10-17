"use client";

import { updateProfile } from "firebase/auth";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AuthGate } from "@/components/AuthGate";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { RadioGroup, RadioItem } from "@/components/ui/RadioGroup";
import { TextField } from "@/components/ui/TextField";
import { useAnnounce } from "@/lib/a11y/useAnnounce";
import { useDocumentTitle } from "@/lib/a11y/useDocumentTitle";
import { useFocusOnMount } from "@/lib/a11y/useFocusOnMount";
import type { NarrationLanguage } from "@/lib/api/schemas";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { usePreferencesStore } from "@/stores/preferencesStore";

interface NameForm {
  name: string;
}

function formatMemberSince(creationTime: string | undefined): string {
  if (!creationTime) {
    return "";
  }
  return new Date(creationTime).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Everything here comes from Firebase Auth (name, email, provider, member since) or the
 * local preferences store (default narration language) — no backend endpoint exists for
 * a user profile yet. The design's "Your activity" stats are left out because there is
 * no data source for them; see docs/DECISIONS.md.
 */
function ProfileContent() {
  const t = useTranslations("profile");
  useDocumentTitle(t("title"));
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const announce = useAnnounce();
  const { user, signOut } = useAuth();
  const narrationLanguage = usePreferencesStore(
    (state) => state.narrationLanguage,
  );
  const setPreference = usePreferencesStore((state) => state.setPreference);

  const [isSaved, setIsSaved] = useState(false);
  const { control, handleSubmit } = useForm<NameForm>({
    defaultValues: { name: user?.displayName ?? "" },
  });

  const name = user?.displayName ?? user?.email ?? "";
  const providerId = user?.providerData[0]?.providerId;
  const provider =
    providerId === "google.com" ? t("providerGoogle") : t("providerEmailLink");
  const memberSince = formatMemberSince(user?.metadata.creationTime);

  async function handleSaveName({ name: nextName }: NameForm) {
    if (!auth.currentUser) {
      return;
    }
    try {
      await updateProfile(auth.currentUser, { displayName: nextName.trim() });
      setIsSaved(true);
      announce(t("saved"), "polite");
    } catch {
      announce(t("saveFailed"), "assertive");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-8 py-16">
      <div className="flex flex-wrap items-center gap-6">
        <Avatar name={name} />
        <div className="flex flex-col gap-0.5">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="route-heading m-0 text-title font-bold"
          >
            {t("title")}
          </h1>
          <p className="m-0 text-xl text-ink-muted">{name}</p>
        </div>
      </div>

      <section
        aria-labelledby="profile-details-heading"
        className="flex flex-col gap-5 rounded-panel border border-ink/20 p-7"
      >
        <h2 id="profile-details-heading" className="m-0 text-section font-bold">
          {t("detailsHeading")}
        </h2>

        <form
          onSubmit={handleSubmit((values) => void handleSaveName(values))}
          className="flex flex-col gap-4"
        >
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <TextField
                ref={field.ref}
                label={t("nameLabel")}
                description={t("nameHint")}
                autoComplete="name"
                value={field.value}
                onChange={(value) => {
                  setIsSaved(false);
                  field.onChange(value);
                }}
                onBlur={field.onBlur}
              />
            )}
          />
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="secondary">
              {t("saveChanges")}
            </Button>
            {isSaved ? (
              <output className="font-bold text-success">{t("saved")}</output>
            ) : null}
          </div>
        </form>

        <dl className="m-0 flex flex-col gap-4">
          <div className="flex flex-col gap-0.5 border-t border-ink/20 pt-4">
            <dt className="font-bold">{t("emailLabel")}</dt>
            <dd className="m-0 break-words text-ink-muted">{user?.email}</dd>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-ink/20 pt-4">
            <dt className="font-bold">{t("signedInWithLabel")}</dt>
            <dd className="m-0 text-ink-muted">{provider}</dd>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-ink/20 pt-4">
            <dt className="font-bold">{t("memberSinceLabel")}</dt>
            <dd className="m-0 text-ink-muted">{memberSince}</dd>
          </div>
        </dl>

        <RadioGroup
          label={t("defaultLanguageLegend")}
          value={narrationLanguage}
          onChange={(value) =>
            setPreference("narrationLanguage", value as NarrationLanguage)
          }
        >
          <RadioItem value="en">English</RadioItem>
          <RadioItem value="hi">
            <span lang="hi">हिन्दी</span>
          </RadioItem>
        </RadioGroup>
      </section>

      <section
        aria-labelledby="profile-account-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="profile-account-heading" className="m-0 text-section font-bold">
          {t("accountHeading")}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/settings"
            className="inline-flex min-h-14 items-center justify-center rounded-control border border-ink/35 px-6 font-bold text-ink no-underline"
          >
            {t("settingsLink")}
          </Link>
          <Button variant="secondary" onPress={() => void signOut()}>
            {t("signOut")}
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileContent />
    </AuthGate>
  );
}
