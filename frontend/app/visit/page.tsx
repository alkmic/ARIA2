"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { fetchProducts, generatePitch, savePitch } from "@/lib/api";
import { listPitchesLocal, savePitchLocal } from "@/lib/indexedDb";
import { PitchResponse } from "@/lib/types";

const templates = {
  opening: [
    "Bonjour Dr {{name}}, merci pour votre temps. Aujourd'hui, je voulais partager un point rapide sur l'optimisation BPCO.",
    "Bonjour {{name}}, je viens avec un update concis sur l'oxygénothérapie et les parcours patients BPCO.",
    "Bonjour {{name}}, merci pour votre accueil. J'aimerais aligner nos actions BPCO sur vos priorités actuelles."
  ],
  technical: [
    "Notre solution met l'accent sur la continuité des flux et un suivi d'adhérence intégré, avec des indicateurs cliniques partagés.",
    "L'approche Air Liquide combine dispositif portable et coordination domicile pour limiter les ré-hospitalisations.",
    "Nous proposons un dispositif léger, avec monitoring patient et accompagnement soignant."
  ],
  objections: [
    "Si la concurrence propose un prix agressif, notre différenciation est la fiabilité du service et l'accompagnement patient.",
    "Sur la disponibilité, nous garantissons un délai court grâce à notre réseau régional.",
    "En cas de budget serré, nous pouvons adapter la configuration tout en gardant l'efficacité clinique."
  ],
  closing: [
    "Souhaitez-vous planifier une revue clinique avec votre équipe dans les 2 prochaines semaines ?",
    "Je peux vous partager un kit d'onboarding patient dès cette semaine. Cela vous convient ?",
    "Prochaine étape : une démonstration ciblée avec vos infirmiers référents."
  ]
} as const;

const lengthOptions = [
  { label: "Short", value: 120 },
  { label: "Medium", value: 220 },
  { label: "Long", value: 320 }
];

export default function VisitModePage() {
  const searchParams = useSearchParams();
  const hcpId = searchParams.get("hcp") ?? "";
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [lengthLabel, setLengthLabel] = useState(lengthOptions[1].label);
  const [wordLimit, setWordLimit] = useState(lengthOptions[1].value);
  const [sections, setSections] = useState({
    opening: templates.opening[0],
    technical: templates.technical[0],
    objections: templates.objections[0],
    closing: templates.closing[0]
  });
  const [saved, setSaved] = useState<{ id: string; created_at: string; content_json: string }[]>(
    []
  );
  const [status, setStatus] = useState("Ready to draft");
  const [toolTrace, setToolTrace] = useState<PitchResponse["tool_trace"]>([]);
  const [compliance, setCompliance] = useState<{
    status: string;
    issues: string[];
  } | null>(null);

  useEffect(() => {
    listPitchesLocal()
      .then((items) => setSaved(items))
      .catch(() => setSaved([]));
  }, []);

  useEffect(() => {
    fetchProducts()
      .then((items) => {
        setProducts(items);
        if (items.length > 0) setProductId(items[0].id);
      })
      .catch(() => setProducts([]));
  }, []);

  const fullPitch = useMemo(() => {
    return `${sections.opening}\n\n${sections.technical}\n\n${sections.objections}\n\n${sections.closing}`;
  }, [sections]);

  const replaceSection = async (key: keyof typeof templates) => {
    if (!productId || !hcpId) return;
    setStatus("Rewriting section...");
    try {
      const response = await generatePitch({
        hcp_id: hcpId,
        product_id: productId,
        length: lengthLabel.toLowerCase(),
        word_limit: wordLimit,
        tone: "professional",
        section_to_rewrite: key
      });
      setSections((prev) => ({ ...prev, ...response.sections }));
      setToolTrace(response.tool_trace);
      setCompliance({ status: response.compliance_status, issues: response.compliance_issues });
      setStatus("Section updated");
    } catch {
      const options = templates[key];
      const choice = options[Math.floor(Math.random() * options.length)];
      setSections((prev) => ({ ...prev, [key]: choice }));
      setStatus("Section updated (offline fallback)");
    }
  };

  const handleGenerate = async () => {
    if (!productId || !hcpId) return;
    setStatus("Generating pitch...");
    try {
      const response = await generatePitch({
        hcp_id: hcpId,
        product_id: productId,
        length: lengthLabel.toLowerCase(),
        word_limit: wordLimit,
        tone: "professional"
      });
      setSections((prev) => ({ ...prev, ...response.sections }));
      setToolTrace(response.tool_trace);
      setCompliance({ status: response.compliance_status, issues: response.compliance_issues });
      setStatus("Pitch generated");
    } catch {
      setStatus("Generation failed; using templates");
    }
  };

  const handleSave = async () => {
    const id = `${Date.now()}`;
    const record = {
      id,
      hcp_id: hcpId || "demo",
      created_at: new Date().toISOString(),
      content_json: JSON.stringify(sections),
      channel: "Face-to-face",
      length_label: lengthLabel,
      word_limit: wordLimit
    };
    setStatus("Saving...");
    try {
      await savePitch({
        hcp_id: record.hcp_id,
        channel: record.channel,
        length_label: record.length_label,
        word_limit: record.word_limit,
        content_json: record.content_json
      });
    } catch {
      // ignore backend failure for offline demo
    }
    await savePitchLocal(record);
    const updated = await listPitchesLocal();
    setSaved(updated);
    setStatus("Saved locally + synced when possible");
  };

  return (
    <AppShell
      step="execute"
      title="Visit Mode — Execute"
      subtitle="Craft the pitch, tune the tone, and save offline for seamless demos."
      toolTrace={toolTrace}
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <DashboardCard title="Pitch Editor" subtitle="Smart sections">
          <div className="flex flex-wrap gap-3 text-xs">
            <select
              className="rounded-full border border-slate-200 bg-white px-3 py-2"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {lengthOptions.map((option) => (
              <button
                key={option.label}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  option.label === lengthLabel
                    ? "bg-emerald-500 text-white"
                    : "border border-slate-200 text-slate-500"
                }`}
                onClick={() => {
                  setLengthLabel(option.label);
                  setWordLimit(option.value);
                }}
              >
                {option.label}
              </button>
            ))}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Word limit</span>
              <input
                type="range"
                min={80}
                max={400}
                value={wordLimit}
                onChange={(event) => setWordLimit(Number(event.target.value))}
              />
              <span>{wordLimit}</span>
            </div>
            <button
              onClick={handleGenerate}
              className="rounded-full bg-airnavy px-4 py-2 text-xs font-semibold text-white"
            >
              Generate pitch
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {(
              [
                { key: "opening", label: "Opening" },
                { key: "technical", label: "Technical" },
                { key: "objections", label: "Objections" },
                { key: "closing", label: "Closing" }
              ] as const
            ).map((section) => (
              <div key={section.key} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-airnavy">{section.label}</p>
                  <button
                    className="text-xs font-semibold text-airblue"
                    onClick={() => replaceSection(section.key)}
                  >
                    Rewrite only this section
                  </button>
                </div>
                <textarea
                  className="mt-2 h-24 w-full resize-none rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"
                  value={sections[section.key]}
                  onChange={(event) =>
                    setSections((prev) => ({ ...prev, [section.key]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{status}</p>
            {compliance ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  compliance.status === "PASS"
                    ? "bg-emerald-100 text-emerald-700"
                    : compliance.status === "WARN"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                }`}
              >
                Compliance {compliance.status}
              </span>
            ) : null}
            <button
              onClick={handleSave}
              className="rounded-full bg-airnavy px-5 py-2 text-xs font-semibold text-white"
            >
              Save pitch offline
            </button>
          </div>
        </DashboardCard>

        <DashboardCard title="Pitch Preview" subtitle="As delivered">
          <pre className="whitespace-pre-wrap text-sm text-slate-600">{fullPitch}</pre>
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Saved pitches" subtitle="IndexedDB offline store">
          {saved.length === 0 ? (
            <p className="text-sm text-slate-500">No saved pitches yet.</p>
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              {saved.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">{item.created_at}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.content_json}</p>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
        <DashboardCard title="Compliance pulse" subtitle="Live guardrails">
          {compliance ? (
            <div className="space-y-3 text-sm text-slate-600">
              <p>Status: {compliance.status}</p>
              {compliance.issues.length === 0 ? (
                <p>No issues detected.</p>
              ) : (
                compliance.issues.map((issue) => <p key={issue}>{issue}</p>)
              )}
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              <p>Generate a pitch to see compliance results.</p>
            </div>
          )}
        </DashboardCard>
      </div>
    </AppShell>
  );
}
