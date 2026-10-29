"use client";

import { useTheme } from "next-themes";

import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

import { ReportTemplateEditor } from "./report-template-editor";
import { DEFAULT_ENVIRONMENT, type Environment } from "@/core/environment";
import { usePref, writePref } from "@/lib/prefs";
import { cn } from "@/lib/utils";

type Quality = "low" | "medium" | "high";

/** Device preferences: 3D quality, theme, and the laboratory's environment (keeps the app universal). */
export function SettingsForm() {
  const quality = usePref<Quality>("quality") ?? "medium";
  const env = usePref<Environment>("environment") ?? DEFAULT_ENVIRONMENT;
  const { theme, setTheme } = useTheme();
  const tr = useTranslations("settings.report");
  const setEnv = (patch: Partial<Environment>) => writePref("environment", { ...env, ...patch });

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="s-quality">
        <h2 id="s-quality" className="text-ds-heading-5">
          Bench quality
        </h2>
        <p className="mt-1 mb-3 text-ds-body-sm text-text-muted">Lower it on older phones and laptops if the bench feels slow.</p>
        <Segmented
          label="Bench quality"
          value={quality}
          options={[
            ["low", "Low — no shadows"],
            ["medium", "Medium"],
            ["high", "High — real shadows"],
          ]}
          onChange={(v) => writePref("quality", v)}
        />
      </section>

      <section aria-labelledby="s-theme">
        <h2 id="s-theme" className="mb-3 text-ds-heading-5">
          Theme
        </h2>
        <Segmented
          label="Theme"
          value={theme ?? "light"}
          options={[
            ["light", "Light"],
            ["dark", "Dark"],
            ["system", "As device"],
          ]}
          onChange={setTheme}
        />
      </section>

      <section aria-labelledby="s-env">
        <h2 id="s-env" className="text-ds-heading-5">
          Your laboratory
        </h2>
        <p className="mt-1 mb-4 text-ds-body-sm text-text-muted">
          Set these to match where you study. They decide the room the bench sits in and the accepted values you compare against.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Room temperature" unit="°C" value={env.temperatureC} onChange={(v) => setEnv({ temperatureC: v })} />
          <Field label="Gravitational field strength g" unit="N kg⁻¹" value={env.g} onChange={(v) => setEnv({ g: v })} />
          <Field label="Earth's field, horizontal component" unit="µT" value={Number((env.earthFieldT * 1e6).toFixed(1))} onChange={(v) => setEnv({ earthFieldT: v * 1e-6 })} />
          <div className="flex flex-col gap-1.5">
            <span className="text-ds-label-sm">Mains frequency</span>
            <Segmented
              label="Mains frequency"
              value={String(env.mainsHz)}
              options={[
                ["50", "50 Hz"],
                ["60", "60 Hz"],
              ]}
              onChange={(v) => setEnv({ mainsHz: Number(v) as 50 | 60 })}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="s-report">
        <h2 id="s-report" className="text-ds-heading-5">
          {tr("title")}
        </h2>
        <p className="mt-1 mb-4 text-ds-body-sm text-text-muted">{tr("intro")}</p>
        <ReportTemplateEditor />
      </section>
    </div>
  );
}

function Field({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-ds-label-sm">{label}</span>
      <span className="flex items-center gap-2">
        <Input
          key={value}
          defaultValue={value}
          inputMode="decimal"
          className="figure w-28 text-right"
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
        />
        <span className="figure text-ds-mono-xs text-text-muted">{unit}</span>
      </span>
    </label>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap border border-sheet-edge">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn("h-9 px-3 text-ds-body-sm", value === v ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-muted")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
