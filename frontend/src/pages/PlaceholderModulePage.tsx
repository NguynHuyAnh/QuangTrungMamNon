import { MaterialSymbol } from '../components/MaterialSymbol';

type Props = { title: string; subtitle?: string; apiHint: string };

export function PlaceholderModulePage({ title, subtitle, apiHint }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="font-h1 text-primary">{title}</h1>
      {subtitle ? <p className="mt-2 text-on-surface-variant">{subtitle}</p> : null}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <MaterialSymbol name="link" className="text-primary-container" />
        <p className="text-sm text-slate-600">{apiHint}</p>
      </div>
    </div>
  );
}
