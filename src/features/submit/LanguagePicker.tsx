import { useTranslations } from "next-intl";
import { RadioGroup, RadioItem } from "@/components/ui/RadioGroup";
import type { NarrationLanguage } from "@/lib/api/schemas";

export interface LanguagePickerProps {
  value: NarrationLanguage;
  onChange: (value: NarrationLanguage) => void;
}

/** The two-option narration language choice, shared by the submit form and Settings. */
export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const t = useTranslations("home");

  return (
    <RadioGroup
      label={t("languageLegend")}
      value={value}
      onChange={(next) => onChange(next as NarrationLanguage)}
    >
      <RadioItem value="en">{t("languageEnglish")}</RadioItem>
      <RadioItem value="hi">
        <span lang="hi">{t("languageHindi")}</span>
      </RadioItem>
    </RadioGroup>
  );
}
